from fastapi import APIRouter
from ..models.schemas import (
    CreateRoomRequest,
    JoinRoomRequest,
    LeaveRoomRequest,
    DeleteRoomRequest,
)
from ..shared import rooms, used_usernames, ensure_username_registered
import uuid
import time

router = APIRouter(prefix="/rooms", tags=["rooms"])


def init_room():
    now = time.time()
    return {
        "players": [],
        "owner": None,
        "status": "waiting",  # waiting, ready, drawing, review, success
        "current_round": 0,
        "current_hint": None,
    "current_target": None,
    "current_clue": None,
        "current_drawer": None,
        "ready_status": {},
        "draw_history": [],
        "messages": [],
        "current_submission": None,
        "ai_result": None,
        "created_at": now,
        "last_activity": now,
        "max_players": 4,
    }


def update_room_activity(room_id: str) -> None:
    if room_id in rooms:
        rooms[room_id]["last_activity"] = time.time()


def get_room_id_by_username(username: str) -> str | None:
    for room_id, room in rooms.items():
        if username in room.get("players", []):
            return room_id
    return None


def cleanup_inactive_rooms() -> int:
    now = time.time()
    inactive_timeout = 3600
    empty_timeout = 300
    to_delete = []

    for room_id, room in rooms.items():
        if len(room.get("players", [])) == 0:
            if now - room.get("created_at", now) > empty_timeout:
                to_delete.append(room_id)
        elif now - room.get("last_activity", now) > inactive_timeout:
            to_delete.append(room_id)

    for room_id in to_delete:
        del rooms[room_id]

    return len(to_delete)


@router.post("/cleanup")
async def cleanup_rooms():
    deleted_count = cleanup_inactive_rooms()
    return {"success": True, "deleted_rooms": deleted_count}


@router.get("")
async def list_rooms():
    cleanup_inactive_rooms()
    summary = []
    for room_id, room in rooms.items():
        summary.append({
            "room_id": room_id,
            "players": room.get("players", []),
            "player_count": len(room.get("players", [])),
            "max_players": room.get("max_players", 4),
            "status": room.get("status", "waiting"),
            "created_at": room.get("created_at"),
            "last_activity": room.get("last_activity"),
            "owner": room.get("owner"),
        })
    summary.sort(key=lambda item: item["created_at"], reverse=True)
    return {"success": True, "rooms": summary}


@router.post("/create")
async def create_room(request: CreateRoomRequest):
    username = request.username
    ensure_username_registered(username)
    if username not in used_usernames:
        return {"success": False, "message": "用户名不存在"}

    existing_room_id = get_room_id_by_username(username)
    if existing_room_id:
        update_room_activity(existing_room_id)
        return {
            "success": True,
            "room_id": existing_room_id,
            "already_in_room": True,
            "message": "已存在房间，正在为您跳转",
        }

    cleanup_inactive_rooms()

    room_id = str(uuid.uuid4())
    rooms[room_id] = init_room()
    rooms[room_id]["players"].append(username)
    rooms[room_id]["owner"] = username
    rooms[room_id]["ready_status"][username] = False
    update_room_activity(room_id)
    return {"success": True, "room_id": room_id}


@router.post("/join")
async def join_room(request: JoinRoomRequest):
    room_id = request.room_id
    username = request.username
    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}

    room = rooms[room_id]
    ensure_username_registered(username)
    if username not in used_usernames:
        return {"success": False, "message": "用户名不存在"}

    existing_room_id = get_room_id_by_username(username)
    if existing_room_id:
        if existing_room_id == room_id:
            update_room_activity(room_id)
            return {"success": True, "room_id": room_id, "message": "已在房间中"}
        return {"success": False, "message": "您已在其它房间，请先离开后再加入"}

    if len(room["players"]) >= room.get("max_players", 4):
        return {"success": False, "message": "房间已满"}

    room["players"].append(username)
    room["ready_status"][username] = False
    room["status"] = "waiting"
    update_room_activity(room_id)
    return {"success": True, "room_id": room_id}


@router.get("/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}
    update_room_activity(room_id)
    return {"success": True, "room": rooms[room_id]}


@router.post("/leave")
async def leave_room(request: LeaveRoomRequest):
    room_id = request.room_id
    username = request.username
    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}
    room = rooms[room_id]
    ensure_username_registered(username)
    if username not in room["players"]:
        return {"success": False, "message": "不在房间中"}

    room["players"].remove(username)
    room["ready_status"].pop(username, None)
    if room.get("current_drawer") == username:
        room["current_drawer"] = None
        room["status"] = "waiting"
        room["current_hint"] = None
        room["current_target"] = None
        room["current_clue"] = None
        room["current_submission"] = None
        room["ai_result"] = None
        for player in room.get("players", []):
            room["ready_status"][player] = False
    update_room_activity(room_id)

    if len(room["players"]) == 0:
        del rooms[room_id]
        return {"success": True}

    if room.get("owner") == username:
        room["owner"] = room["players"][0]
    return {"success": True}


@router.post("/delete")
async def delete_room(request: DeleteRoomRequest):
    room_id = request.room_id
    username = request.username
    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}

    room = rooms[room_id]
    ensure_username_registered(username)
    if room.get("owner") != username:
        return {"success": False, "message": "仅房主可以解散房间"}

    del rooms[room_id]
    return {"success": True}


__all__ = ["router", "update_room_activity"]

