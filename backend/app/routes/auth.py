from fastapi import APIRouter
from ..models.schemas import UpdateUsernameRequest
from ..shared import (
    used_usernames,
    register_session,
    touch_sessions_by_username,
    update_sessions_username,
    cleanup_inactive_users,
)
import uuid
import re
import random
import string
import os

router = APIRouter(prefix="/auth", tags=["auth"])


def generate_unique_username(reserve: bool = True) -> str:
    while True:
        length = random.randint(5, 10)
        username = ''.join(random.choices(string.ascii_letters, k=length))
        if username not in used_usernames:
            if reserve:
                used_usernames.add(username)
            return username


def is_valid_username(username: str) -> bool:
    return re.match(r'^[a-zA-Z]+$', username) is not None and len(username) <= 20


@router.post("/login")
async def login():
    cleanup_inactive_users()
    session_id = str(uuid.uuid4())
    username = generate_unique_username()
    register_session(session_id, username)
    return {"session_id": session_id, "username": username}


@router.get("/suggest_username")
async def suggest_username():
    cleanup_inactive_users()
    username = generate_unique_username(reserve=False)
    return {"username": username}


@router.post("/update_username")
async def update_username(request: UpdateUsernameRequest):
    cleanup_inactive_users()
    old_username = request.old_username
    new_username = request.new_username

    if not is_valid_username(new_username):
        return {"success": False, "message": "用户名只能包含英文字母，且长度不超过20"}

    if old_username not in used_usernames:
        base_username = new_username
        unique_username = base_username
        counter = 1
        while unique_username in used_usernames:
            unique_username = f"{base_username}{counter}"
            counter += 1
            if len(unique_username) > 20:
                unique_username = base_username[:17] + str(counter)

        used_usernames.add(unique_username)
        update_sessions_username(old_username, unique_username)
        message = (
            f"用户名已设置为: {unique_username}" if unique_username != base_username else "用户名设置成功"
        )
        return {"success": True, "username": unique_username, "message": message}

    if new_username in used_usernames and new_username != old_username:
        return {"success": False, "message": "用户名已被使用"}

    used_usernames.remove(old_username)
    used_usernames.add(new_username)
    update_sessions_username(old_username, new_username)
    touch_sessions_by_username(new_username)
    return {"success": True, "username": new_username}


@router.post("/cleanup_users")
async def cleanup_users():
    result = cleanup_inactive_users()
    return {"success": True, **result}


@router.post("/app/login")
async def admin_login(request: dict):
    username = request.get("username")
    password = request.get("password")
    
    admin_user = os.getenv("ADMIN_USER")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_user or not admin_password:
        return {"success": False, "message": "Admin credentials not configured"}
    
    if username == admin_user and password == admin_password:
        session_id = str(uuid.uuid4())
        register_session(session_id, username, is_admin=True)
        return {"success": True, "session_id": session_id, "username": username, "is_admin": True}
    else:
        return {"success": False, "message": "Invalid credentials"}
