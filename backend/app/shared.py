from datetime import datetime, timedelta
from .database import SessionLocal, User, UserSession
from .config import config

# Gallery configuration
GALLERY_DIR = config.GALLERY_DIR

SESSION_TIMEOUT_SECONDS = config.SESSION_TIMEOUT_SECONDS  # 1 hour inactivity timeout
SESSION_MAX_LIFETIME_SECONDS = config.SESSION_MAX_LIFETIME_SECONDS  # 24 hour max lifetime


def register_session(session_id: str, username: str, is_admin: bool = False) -> None:
    db = SessionLocal()
    try:
        # 查找或创建用户
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(username=username, is_admin=is_admin)
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # 更新最后登录时间
            user.last_login = datetime.utcnow()
            db.commit()

        # 创建会话
        user_session = UserSession(
            session_id=session_id,
            user_id=user.id
        )
        db.add(user_session)
        db.commit()
    finally:
        db.close()


def get_user_by_session(session_id: str):
    db = SessionLocal()
    try:
        session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        if session:
            user = db.query(User).filter(User.id == session.user_id).first()
            return user
        return None
    finally:
        db.close()


def update_session_activity(session_id: str) -> None:
    db = SessionLocal()
    try:
        session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        if session:
            session.last_activity = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def cleanup_inactive_sessions() -> dict:
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        timeout_threshold = now - timedelta(seconds=SESSION_TIMEOUT_SECONDS)
        max_lifetime_threshold = now - timedelta(seconds=SESSION_MAX_LIFETIME_SECONDS)

        # 删除超时的会话
        expired_sessions = db.query(UserSession).filter(
            (UserSession.last_activity < timeout_threshold) |
            (UserSession.created_at < max_lifetime_threshold)
        ).all()

        removed_count = len(expired_sessions)
        for session in expired_sessions:
            db.delete(session)

        db.commit()

        return {
            "sessions_removed": removed_count,
        }
    finally:
        db.close()


def get_user_info(session_id: str):
    user = get_user_by_session(session_id)
    if user:
        return {
            "username": user.username,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "last_login": user.last_login
        }
    return None


# 为了向后兼容，保留旧的全局变量接口
used_usernames = set()
user_sessions = {}
rooms = {}  # 房间状态存储（内存中）


def touch_sessions_by_username(username: str) -> None:
    """向后兼容函数"""
    pass


def update_sessions_username(old_username: str, new_username: str) -> None:
    """向后兼容函数"""
    pass


def cleanup_inactive_users() -> dict:
    """向后兼容函数，返回清理的会话信息"""
    return cleanup_inactive_sessions()


def ensure_username_registered(username: str) -> None:
    """向后兼容函数"""
    pass
