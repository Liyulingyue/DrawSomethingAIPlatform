from fastapi import APIRouter, Depends
from ..shared import (
    register_session,
    cleanup_inactive_sessions,
)
from ..database import SessionLocal, User, UserSession, hash_password, verify_password
from ..config import config
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/cleanup_users")
async def cleanup_users():
    result = cleanup_inactive_sessions()
    return {"success": True, **result}


@router.post("/app/login")
async def admin_login(request: dict):
    import traceback
    print("[DEBUG] /auth/app/login called")
    try:
        username = request.get("username")
        password = request.get("password")
        print(f"[DEBUG] Login attempt - username: {username}")
        
        admin_user = config.ADMIN_USER
        admin_password = config.ADMIN_PASSWORD
        print(f"[DEBUG] Admin config - user: {admin_user}, password configured: {bool(admin_password)}")
        
        if not admin_user or not admin_password:
            print("[WARNING] Admin credentials not configured")
            return {"success": False, "message": "Admin credentials not configured"}
        
        if username == admin_user and password == admin_password:
            session_id = str(uuid.uuid4())
            print(f"[DEBUG] Admin login successful, session_id: {session_id}")
            register_session(session_id, username, is_admin=True)
            return {"success": True, "session_id": session_id, "username": username, "is_admin": True}
        else:
            print(f"[DEBUG] Admin login failed - credentials mismatch")
            return {"success": False, "message": "Invalid credentials"}
    except Exception as e:
        print(f"[ERROR] Admin login error: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}


@router.post("/user/login")
async def user_login(request: dict, db: Session = Depends(get_db)):
    # 清理过期会话
    cleanup_inactive_sessions()
    
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
    cleanup_inactive_sessions()
    
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


@router.post("/app/auto_login")
async def auto_login_desktop():
    """
    自动登录端点 - 用于 Tauri 桌面应用
    在 exe 模式下自动使用管理员账户登录
    
    安全保护:
    1. 仅在 TAURI_MODE 下允许自动登录
    2. 不需要密码验证（因为只有本地应用可以调用）
    3. 直接创建管理员会话
    """
    import traceback
    print("[DEBUG] /auth/app/auto_login called")
    try:
        # 二次防护：检查是否处于 Tauri 模式
        if not config.IS_TAURI_MODE:
            print("[WARNING] ❌ Auto-login attempted in non-Tauri mode - REJECTED!")
            print("[WARNING] 自动登录仅允许在 Tauri 桌面应用模式下使用")
            return {
                "success": False, 
                "message": "自动登录仅可用于桌面应用"
            }
        
        print("[INFO] ✅ Tauri 模式验证通过，允许自动登录")
        
        admin_user = config.ADMIN_USER
        admin_password = config.ADMIN_PASSWORD
        print(f"[DEBUG] Desktop auto-login - user: {admin_user}")
        
        if not admin_user or not admin_password:
            print("[WARNING] Admin credentials not configured for auto-login")
            return {"success": False, "message": "Admin credentials not configured"}
        
        # 使用管理员账户创建会话
        session_id = str(uuid.uuid4())
        print(f"[DEBUG] 🎉 Desktop auto-login successful, session_id: {session_id}")
        register_session(session_id, admin_user, is_admin=True)
        
        return {
            "success": True, 
            "session_id": session_id, 
            "username": admin_user, 
            "is_admin": True
        }
    except Exception as e:
        print(f"[ERROR] Desktop auto-login error: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

