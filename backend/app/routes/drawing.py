import time
from fastapi import APIRouter
from ..models.schemas import (
    SetReadyRequest,
    SetRoundConfigRequest,
    SelectDrawerRequest,
    SubmitDrawingRequest,
    StartRoundRequest,
    ResetRoundRequest,
    GuessWordRequest,
    SkipGuessRequest,
    SyncDrawingRequest,
)
from ..shared import rooms
from .rooms import update_room_activity
from ..services.ai import guess_drawing

router = APIRouter(prefix="/drawing", tags=["drawing"])


def _ensure_room(room_id: str):
    if room_id not in rooms:
        return None, {"success": False, "message": "房间不存在"}
    return rooms[room_id], None


def _ensure_player(room: dict, username: str):
    if username not in room.get("players", []):
        return {"success": False, "message": "不在房间中"}
    return None


@router.post("/set_ready")
async def set_ready(request: SetReadyRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    err = _ensure_player(room, request.username)
    if err:
        return err

    room.setdefault("ready_status", {})[request.username] = request.ready
    update_room_activity(request.room_id)

    current_target = room.get("current_target") or room.get("current_hint")
    if room.get("status") == "waiting" and all(
        room["ready_status"].get(player, False) for player in room.get("players", [])
    ) and current_target and room.get("current_drawer"):
        room["status"] = "ready"

    return {"success": True, "ready_status": room["ready_status"]}


@router.post("/configure")
@router.post("/set_hint")
async def configure_round(request: SetRoundConfigRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以配置本回合"}

    target_word = (request.target_word or request.hint or "").strip()
    if not target_word:
        return {"success": False, "message": "需要提供提示词或目标词"}

    clue = request.clue.strip() if request.clue else None

    room["current_target"] = target_word
    room["current_hint"] = target_word  # 兼容旧字段名称
    room["current_clue"] = clue

    # 配置回合后保持等待状态，等待玩家整备
    if room.get("status") in {"review", "success"}:
        room["status"] = "waiting"

    update_room_activity(request.room_id)
    return {
        "success": True,
        "target_word": room["current_target"],
        "clue": room.get("current_clue"),
    }


@router.post("/select_drawer")
async def select_drawer(request: SelectDrawerRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以指定绘画者"}
    if request.drawer not in room.get("players", []):
        return {"success": False, "message": "绘画者必须在房间内"}

    room["current_drawer"] = request.drawer
    current_target = room.get("current_target") or room.get("current_hint")
    if room.get("status") == "waiting" and all(
        room.setdefault("ready_status", {}).get(player, False) for player in room.get("players", [])
    ) and current_target:
        room["status"] = "ready"
    update_room_activity(request.room_id)
    return {"success": True, "drawer": room["current_drawer"]}


@router.post("/start_round")
async def start_round(request: StartRoundRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以开始回合"}

    players = room.get("players", [])
    if not players:
        return {"success": False, "message": "房间内没有玩家"}
    if not all(room.setdefault("ready_status", {}).get(player, False) for player in players):
        return {"success": False, "message": "所有玩家需要先标记整备完毕"}

    # 初始化绘画者队列（如果还没有初始化）
    drawer_queue = room.setdefault("drawer_queue", players.copy())
    if not drawer_queue:
        drawer_queue = players.copy()
        room["drawer_queue"] = drawer_queue

    current_drawer_index = room.get("current_drawer_index", 0)

    # 如果所有人都画完了，重置队列
    if current_drawer_index >= len(drawer_queue):
        room["current_round"] = room.get("current_round", 0) + 1
        room["drawer_queue"] = players.copy()  # 重新洗牌队列
        current_drawer_index = 0

    # 选择当前绘画者
    current_drawer = drawer_queue[current_drawer_index]
    room["current_drawer"] = current_drawer

    # 生成随机目标词（这里暂时使用固定词，后面可以改进）
    import random
    target_words = ["苹果", "猫", "房子", "汽车", "树", "太阳", "月亮", "星星", "鱼", "鸟"]
    current_target = random.choice(target_words)
    room["current_target"] = current_target
    room["current_hint"] = current_target  # 兼容旧代码

    # 初始化猜词状态
    room["guess_status"] = {player: "pending" for player in players}
    room["status"] = "drawing"
    room["current_submission"] = None
    room["ai_result"] = None

    update_room_activity(request.room_id)
    return {"success": True, "round": room["current_round"], "drawer": current_drawer, "target": current_target}


@router.post("/submit")
async def submit_drawing(request: SubmitDrawingRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    err = _ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}
    if room.get("current_drawer") != request.username:
        return {"success": False, "message": "仅指定绘画者可以提交作品"}
    current_target = room.get("current_target") or room.get("current_hint")
    if not current_target:
        return {"success": False, "message": "提示词尚未设置"}

    clue = room.get("current_clue")
    guess_result = guess_drawing(request.image, clue)
    timestamp = time.time()
    room["current_submission"] = {
        "image": request.image,
        "submitted_by": request.username,
        "submitted_at": timestamp,
    }
    guess_payload = dict(guess_result)
    guess_payload["timestamp"] = timestamp
    guess_payload["target_word"] = current_target

    best_guess = guess_payload.get("best_guess")
    if best_guess is not None and not isinstance(best_guess, str):
        best_guess = str(best_guess)
        guess_payload["best_guess"] = best_guess

    alternatives = guess_payload.get("alternatives") or []
    if not isinstance(alternatives, list):
        alternatives = [alternatives]
    alternatives = [str(item) for item in alternatives if isinstance(item, (str, int, float))]
    guess_payload["alternatives"] = alternatives

    success = False
    matched_with: str | None = None
    if guess_result.get("success", True):
        target_normalized = current_target.strip().lower()

        def _matches(candidate: str | None) -> bool:
            if not candidate:
                return False
            candidate_norm = candidate.strip().lower()
            return target_normalized in candidate_norm

        primary_guess = guess_result.get("best_guess")
        if isinstance(primary_guess, str) and _matches(primary_guess):
            success = True
            matched_with = primary_guess
        else:
            for alt in alternatives:
                if _matches(alt):
                    success = True
                    matched_with = alt
                    break

    guess_payload["matched"] = success
    if matched_with:
        guess_payload["matched_with"] = matched_with

    room["ai_result"] = guess_payload
    room["status"] = "success" if success else "review"

    room.setdefault("draw_history", []).append({
        "round": room.get("current_round", 1),
        "target_word": current_target,
        "drawer": request.username,
        "submitted_at": timestamp,
        "guess": guess_payload,
        "success": success,
    })
    update_room_activity(request.room_id)
    return {"success": True, "guess": guess_payload, "status": room["status"]}


@router.get("/state/{room_id}")
async def get_state(room_id: str):
    room, error = _ensure_room(room_id)
    if error:
        return error
    update_room_activity(room_id)
    return {
        "success": True,
        "room": {
            "status": room.get("status"),
            "current_round": room.get("current_round"),
            "current_hint": room.get("current_hint"),
            "current_target": room.get("current_target"),
            "current_clue": room.get("current_clue"),
            "current_drawer": room.get("current_drawer"),
            "ready_status": room.get("ready_status", {}),
            "current_submission": room.get("current_submission"),
            "current_drawing": room.get("current_drawing"),
            "ai_result": room.get("ai_result"),
            "ai_guess": room.get("ai_result"),
            "draw_history": room.get("draw_history", []),
            "scores": room.get("scores", {}),
            "guess_status": room.get("guess_status", {}),
        }
    }


@router.post("/reset")
async def reset_round(request: ResetRoundRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以重置回合"}

    room["status"] = "waiting"
    room["current_hint"] = None
    room["current_target"] = None
    room["current_clue"] = None
    room["current_drawer"] = None
    room["current_submission"] = None
    room["ai_result"] = None
    for player in room.get("players", []):
        room.setdefault("ready_status", {})[player] = False
    update_room_activity(request.room_id)
    return {"success": True}


@router.post("/guess")
async def guess_word(request: GuessWordRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    err = _ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}

    current_target = room.get("current_target") or room.get("current_hint")
    if not current_target:
        return {"success": False, "message": "目标词尚未设置"}

    guess_status = room.setdefault("guess_status", {})
    
    # 如果已经跳过，就不能再猜词
    if guess_status.get(request.username) == "skipped":
        return {"success": False, "message": "您已经跳过了这幅画"}

    # 检查是否猜中
    target_normalized = current_target.strip().lower()
    guess_normalized = request.guess.strip().lower()
    is_correct = target_normalized in guess_normalized or guess_normalized in target_normalized

    # 更新猜词状态
    guess_status[request.username] = "guessed"

    # 如果猜中，给积分
    if is_correct:
        scores = room.setdefault("scores", {})
        scores[request.username] = scores.get(request.username, 0) + 1  # 猜中者+1
        scores[room.get("current_drawer", "")] = scores.get(room.get("current_drawer", ""), 0) + 1  # 绘画者+1

    # 检查是否所有人都猜完了（猜中或跳过）
    players = room.get("players", [])
    all_guessed = all(guess_status.get(player) in ["guessed", "skipped"] for player in players)

    if all_guessed:
        # 所有人都猜完了，进入下一轮
        drawer_queue = room.get("drawer_queue", [])
        current_index = room.get("current_drawer_index", 0) + 1
        room["current_drawer_index"] = current_index

        if current_index >= len(drawer_queue):
            # 所有人都画完了
            room["status"] = "finished"
        else:
            # 还有人没画，继续下一轮
            room["status"] = "waiting"  # 等待房主开始下一轮

        update_room_activity(request.room_id)
        return {
            "success": True,
            "correct": is_correct,
            "target_word": current_target if is_correct else None,
            "round_finished": True
        }

    # 如果还没所有人猜完，继续当前回合
    update_room_activity(request.room_id)
    return {
        "success": True,
        "correct": is_correct,
        "target_word": current_target if is_correct else None
    }


@router.post("/skip_guess")
async def skip_guess(request: SkipGuessRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    err = _ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}

    guess_status = room.setdefault("guess_status", {})
    
    # 如果已经跳过或猜过，就不能再跳过
    if guess_status.get(request.username) in ["skipped", "guessed"]:
        return {"success": False, "message": "您已经跳过或猜过这幅画了"}

    # 更新猜词状态为跳过
    guess_status[request.username] = "skipped"

    # 跳过不结束回合，继续让其他人猜
    update_room_activity(request.room_id)
    return {
        "success": True
    }


@router.post("/sync_drawing")
async def sync_drawing(request: SyncDrawingRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    err = _ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}

    if room.get("current_drawer") != request.username:
        return {"success": False, "message": "仅当前绘画者可以同步绘画数据"}

    # 更新房间的当前绘画数据
    room["current_drawing"] = request.image

    update_room_activity(request.room_id)
    return {"success": True}
