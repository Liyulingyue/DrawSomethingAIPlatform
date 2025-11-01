from fastapi import APIRouter, Depends, HTTPException
from ..models.schemas import UpdateUsernameRequest
from ..shared import (
    used_usernames,
    register_session,
    touch_sessions_by_username,
    update_sessions_username,
    cleanup_inactive_users,
)
from ..database import SessionLocal, User, UserSession, hash_password, verify_password
from ..config import config
import uuid
import re
import random
import string
import os
from datetime import datetime
from sqlalchemy.orm import Session

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
    
    admin_user = config.ADMIN_USER
    admin_password = config.ADMIN_PASSWORD
    
    if not admin_user or not admin_password:
        return {"success": False, "message": "Admin credentials not configured"}
    
    if username == admin_user and password == admin_password:
        session_id = str(uuid.uuid4())
        register_session(session_id, username, is_admin=True)
        return {"success": True, "session_id": session_id, "username": username, "is_admin": True}
    else:
        return {"success": False, "message": "Invalid credentials"}


@router.post("/user/login")
async def user_login(request: dict, db: Session = Depends(get_db)):
    # 清理过期会话
    cleanup_inactive_users()
    
    username = request.get("username")
    password = request.get("password")
    
    if not username or not username.strip():
        return {"success": False, "message": "用户名不能为空"}
    
    if not password or not password.strip():
        return {"success": False, "message": "密码不能为空"}
    
    username = username.strip()
    password = password.strip()
    
    # 检查用户名是否已被管理员使用
    admin_user = config.ADMIN_USER
    if username == admin_user:
        return {"success": False, "message": "用户名已被管理员使用"}
    
    # 检查用户是否已存在
    existing_user = db.query(User).filter(User.username == username).first()
    
    if existing_user:
        # 验证密码
        if not verify_password(password, existing_user.password_hash):
            return {"success": False, "message": "密码错误"}
        
        # 更新最后登录时间
        existing_user.last_login = datetime.utcnow()
        db.commit()
        
        # 创建会话
        session_id = str(uuid.uuid4())
        user_session = UserSession(session_id=session_id, user_id=existing_user.id)
        db.add(user_session)
        db.commit()
        
        return {"success": True, "session_id": session_id, "username": username, "is_admin": False}
    else:
        # 创建新用户，默认赠送调用点
        password_hash = hash_password(password)
        new_user = User(
            username=username,
            password_hash=password_hash,
            is_admin=False,
            calls_remaining=config.DEFAULT_NEW_USER_CALLS  # 从配置读取新用户默认调用点
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # 创建会话
        session_id = str(uuid.uuid4())
        user_session = UserSession(session_id=session_id, user_id=new_user.id)
        db.add(user_session)
        db.commit()
        
        return {"success": True, "session_id": session_id, "username": username, "is_admin": False}


@router.post("/user/logout")
async def user_logout(request: dict, db: Session = Depends(get_db)):
    session_id = request.get("session_id")
    
    if not session_id:
        return {"success": False, "message": "缺少会话ID"}
    
    # 查找并删除会话
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if session:
        db.delete(session)
        db.commit()
        return {"success": True, "message": "已成功退出登录"}
    else:
        return {"success": False, "message": "会话不存在或已过期"}


@router.post("/user/verify_session")
async def verify_session(request: dict, db: Session = Depends(get_db)):
    session_id = request.get("session_id")
    
    if not session_id:
        return {"valid": False, "message": "缺少会话ID"}
    
    # 清理过期会话
    cleanup_inactive_users()
    
    # 查找会话
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if session:
        # 更新会话活动时间
        session.last_activity = datetime.utcnow()
        db.commit()
        return {"valid": True}
    
    return {"valid": False, "message": "会话无效或已过期"}


@router.post("/user/get_info")
async def get_user_info(request: dict, db: Session = Depends(get_db)):
    session_id = request.get("session_id")
    
    if not session_id:
        return {"success": False, "message": "缺少会话ID"}
    
    # 查找会话
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if session:
        user = db.query(User).filter(User.id == session.user_id).first()
        if user:
            return {
                "success": True,
                "user_id": user.id,
                "username": user.username,
                "is_admin": user.is_admin,
                "calls_remaining": user.calls_remaining if user.calls_remaining is not None else 0
            }
    
    return {"success": False, "message": "会话无效或用户信息不存在"}


@router.post("/user/recharge")
async def recharge_calls(request: dict, db: Session = Depends(get_db)):
    session_id = request.get("session_id")
    amount = request.get("amount", 0)
    
    if not session_id:
        return {"success": False, "message": "缺少会话ID"}
    
    if not isinstance(amount, int) or amount <= 0:
        return {"success": False, "message": "充值数量必须是正整数"}
    
    if amount > 1000:
        return {"success": False, "message": "单次充值不能超过1000次"}
    
    # 查找会话
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if not session:
        return {"success": False, "message": "会话不存在或已过期"}
    
    # 获取用户
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        return {"success": False, "message": "用户不存在"}
    
    # 更新调用次数
    if user.calls_remaining is None:
        user.calls_remaining = 0
    user.calls_remaining += amount
    db.commit()
    
    return {
        "success": True, 
        "message": f"成功充值 {amount} 次调用",
        "new_calls_remaining": user.calls_remaining
    }
