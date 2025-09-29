import time
from fastapi import APIRouter
from ..models.schemas import (
    SetReadyRequest,
    SetHintRequest,
    SelectDrawerRequest,
    SubmitDrawingRequest,
    StartRoundRequest,
    ResetRoundRequest,
)
from ..shared import rooms
from .rooms import update_room_activity
from ..services.ai import recognize_drawing

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

    if room.get("status") == "waiting" and all(
        room["ready_status"].get(player, False) for player in room.get("players", [])
    ) and room.get("current_hint") and room.get("current_drawer"):
        room["status"] = "ready"

    return {"success": True, "ready_status": room["ready_status"]}


@router.post("/set_hint")
async def set_hint(request: SetHintRequest):
    room, error = _ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以设置提示词"}

    room["current_hint"] = request.hint.strip()
    if room.get("status") == "waiting" and all(
        room.setdefault("ready_status", {}).get(player, False) for player in room.get("players", [])
    ) and room.get("current_drawer"):
        room["status"] = "ready"
    update_room_activity(request.room_id)
    return {"success": True, "hint": room["current_hint"]}


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
    if room.get("status") == "waiting" and all(
        room.setdefault("ready_status", {}).get(player, False) for player in room.get("players", [])
    ) and room.get("current_hint"):
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

    if not room.get("current_hint"):
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
    if not room.get("current_hint"):
        return {"success": False, "message": "提示词尚未设置"}

    result = recognize_drawing(request.image, room["current_hint"])
    timestamp = time.time()
    room["current_submission"] = {
        "image": request.image,
        "submitted_by": request.username,
        "submitted_at": timestamp,
    }
    room["ai_result"] = result

    success = result.get("matched", False)
    if success:
        room["status"] = "success"
    else:
        room["status"] = "review"

    room.setdefault("draw_history", []).append({
        "round": room.get("current_round", 1),
        "hint": room.get("current_hint"),
        "drawer": request.username,
        "submitted_at": timestamp,
        "result": result,
        "success": success,
    })
    update_room_activity(request.room_id)
    return {"success": True, "result": result, "status": room["status"]}


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
            "current_drawer": room.get("current_drawer"),
            "ready_status": room.get("ready_status", {}),
            "current_submission": room.get("current_submission"),
            "ai_result": room.get("ai_result"),
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
    room["current_drawer"] = None
    room["current_submission"] = None
    room["ai_result"] = None
    for player in room.get("players", []):
        room.setdefault("ready_status", {})[player] = False
    update_room_activity(request.room_id)
    return {"success": True}
