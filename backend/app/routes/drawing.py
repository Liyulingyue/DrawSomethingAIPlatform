import time
from fastapi import APIRouter
from ..models.schemas import (
    SetReadyRequest,
    SetRoundConfigRequest,
    SelectDrawerRequest,
    SubmitDrawingRequest,
    StartRoundRequest,
    ResetRoundRequest,
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

    current_target = room.get("current_target") or room.get("current_hint")
    if not current_target:
        return {"success": False, "message": "请先设置提示词"}
    if not room.get("current_drawer"):
        return {"success": False, "message": "请先指定绘画者"}
    if not room.get("players"):
        return {"success": False, "message": "房间内没有玩家"}
    if not all(room.setdefault("ready_status", {}).get(player, False) for player in room["players"]):
        return {"success": False, "message": "所有玩家需要先标记整备完毕"}

    room["current_round"] = room.get("current_round", 0) + 1
    room["status"] = "drawing"
    room["current_submission"] = None
    room["ai_result"] = None
    update_room_activity(request.room_id)
    return {"success": True, "round": room["current_round"]}


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
            "ai_result": room.get("ai_result"),
            "ai_guess": room.get("ai_result"),
            "draw_history": room.get("draw_history", []),
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
