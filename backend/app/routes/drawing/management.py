from __future__ import annotations

import time
from fastapi import APIRouter

from ...models.schemas import (
    ResetRoundRequest,
    SelectDrawerRequest,
    SetReadyRequest,
    SetRoundConfigRequest,
    StartRoundRequest,
    UpdateModelConfigRequest,
)
from ...services.ai import _sanitize_config
from ..rooms import (
    ensure_player_state,
    export_ready_status,
    serialize_room,
    update_room_activity,
)
from .common import (
    ensure_player,
    ensure_room,
    get_pending_guessers,
    get_guess_tracker,
    prepare_turn,
)

router = APIRouter()


@router.post("/set_ready")
async def set_ready(request: SetReadyRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    now = time.time()
    state = ensure_player_state(room, request.username)
    state.mark_ready(request.ready, now)
    update_room_activity(request.room_id)

    current_target = room.get("current_target") or room.get("current_hint")
    if room.get("status") == "waiting" and all(
        ensure_player_state(room, player).is_ready for player in room.get("players", [])
    ) and current_target and room.get("current_drawer"):
        room["status"] = "ready"

    return {"success": True, "ready_status": export_ready_status(room)}


@router.post("/configure")
@router.post("/set_hint")
async def configure_round(request: SetRoundConfigRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以配置本回合"}

    target_word = (request.target_word or request.hint or "").strip()
    if not target_word:
        return {"success": False, "message": "需要提供提示词或目标词"}

    clue = request.clue.strip() if request.clue else None

    room["current_target"] = target_word
    room["current_hint"] = target_word
    room["current_clue"] = clue

    if room.get("status") in {"review", "success"}:
        room["status"] = "waiting"

    update_room_activity(request.room_id)
    return {
        "success": True,
        "target_word": room["current_target"],
        "clue": room.get("current_clue"),
    }


@router.post("/set_model_config")
async def set_model_config(request: UpdateModelConfigRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    sanitized = _sanitize_config(request.config.dict())
    timestamp = time.time()
    state = ensure_player_state(room, request.username)
    state.set_model_config(sanitized, timestamp)
    update_room_activity(request.room_id)
    return {
        "success": True,
        "configured": state.has_model_config(),
    }


@router.post("/select_drawer")
async def select_drawer(request: SelectDrawerRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以指定绘画者"}
    if request.drawer not in room.get("players", []):
        return {"success": False, "message": "绘画者必须在房间内"}

    room["current_drawer"] = request.drawer
    current_target = room.get("current_target") or room.get("current_hint")
    if room.get("status") == "waiting" and all(
        ensure_player_state(room, player).is_ready for player in room.get("players", [])
    ) and current_target:
        room["status"] = "ready"
    update_room_activity(request.room_id)
    return {"success": True, "drawer": room["current_drawer"]}


@router.post("/start_round")
async def start_round(request: StartRoundRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    if room.get("owner") != request.username:
        return {"success": False, "message": "仅房主可以开始回合"}

    players = room.get("players", [])
    if not players:
        return {"success": False, "message": "房间内没有玩家"}
    if not all(ensure_player_state(room, player).is_ready for player in players):
        return {"success": False, "message": "所有玩家需要先标记整备完毕"}

    drawer_queue = players.copy()
    room["drawer_queue"] = drawer_queue
    room["current_drawer_index"] = 0
    room["current_round"] = room.get("current_round", 0) + 1

    configured_target = room.get("current_target") or room.get("current_hint")
    configured_clue = room.get("current_clue")

    first_drawer = drawer_queue[0]
    prepare_turn(room, first_drawer, configured_target, configured_clue)

    update_room_activity(request.room_id)
    return {
        "success": True,
        "round": room["current_round"],
        "drawer": room["current_drawer"],
        "target": room.get("current_target"),
    }


@router.get("/state/{room_id}")
async def get_state(room_id: str):
    room, error = ensure_room(room_id)
    if error:
        return error
    update_room_activity(room_id)
    return {
        "success": True,
        "room": serialize_room(room)
    }


@router.post("/reset")
async def reset_round(request: ResetRoundRequest):
    room, error = ensure_room(request.room_id)
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
    room["ai_success_awarded"] = False
    room.pop("round_finished_at", None)
    get_pending_guessers(room).clear()
    get_guess_tracker(room).clear()
    now = time.time()
    for player in room.get("players", []):
        state = ensure_player_state(room, player)
        state.mark_ready(False, now)
        state.clear_ai_guess()
    update_room_activity(request.room_id)
    return {"success": True}
