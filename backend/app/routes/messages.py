from fastapi import APIRouter
from ..models.schemas import SendMessageRequest
from ..shared import rooms
from .rooms import update_room_activity
import time

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/send")
async def send_message(request: SendMessageRequest):
    room_id = request.room_id
    username = request.username
    message = request.message.strip()

    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}

    room = rooms[room_id]
    if username not in room.get("players", []):
        return {"success": False, "message": "不在房间中"}

    if not message:
        return {"success": False, "message": "消息不能为空"}

    room.setdefault("messages", []).append({
        "username": username,
        "message": message,
        "timestamp": time.time(),
    })

    if len(room["messages"]) > 50:
        room["messages"] = room["messages"][-50:]

    update_room_activity(room_id)
    return {"success": True, "messages": room["messages"]}


@router.get("/{room_id}")
async def get_messages(room_id: str):
    if room_id not in rooms:
        return {"success": False, "message": "房间不存在"}
    update_room_activity(room_id)
    return {"success": True, "messages": rooms[room_id].get("messages", [])}
