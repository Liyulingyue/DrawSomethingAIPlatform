import time
import uuid

# 全局存储
used_usernames: set[str] = set()
user_sessions: dict[str, dict[str, float | str]] = {}
rooms: dict[str, dict] = {}

SESSION_TIMEOUT_SECONDS = 3600  # 1 hour inactivity timeout
SESSION_MAX_LIFETIME_SECONDS = 86400  # 24 hour max lifetime


def _upgrade_session_structure(session_id: str, value):
    """Ensure legacy session entries become full dicts with timestamps."""
    if isinstance(value, dict):
        return value
    now = time.time()
    upgraded = {
        "username": value,
        "created_at": now,
        "last_activity": now,
    }
    user_sessions[session_id] = upgraded
    return upgraded


def register_session(session_id: str, username: str) -> None:
    now = time.time()
    user_sessions[session_id] = {
        "username": username,
        "created_at": now,
        "last_activity": now,
    }


def touch_sessions_by_username(username: str) -> None:
    now = time.time()
    for session_id, session in list(user_sessions.items()):
        session = _upgrade_session_structure(session_id, session)
        if session["username"] == username:
            session["last_activity"] = now


def update_sessions_username(old_username: str, new_username: str) -> None:
    now = time.time()
    for session_id, session in list(user_sessions.items()):
        session = _upgrade_session_structure(session_id, session)
        if session["username"] == old_username:
            session["username"] = new_username
            session["last_activity"] = now


def _is_username_active(username: str) -> bool:
    for session in user_sessions.values():
        if isinstance(session, dict) and session.get("username") == username:
            return True
    for room in rooms.values():
        if username in room.get("players", []):
            return True
    return False


def cleanup_inactive_users() -> dict:
    now = time.time()
    removed_sessions = []

    for session_id, session in list(user_sessions.items()):
        session = _upgrade_session_structure(session_id, session)
        last_activity = session.get("last_activity", session.get("created_at", now))
        created_at = session.get("created_at", now)
        if (now - last_activity) > SESSION_TIMEOUT_SECONDS or (now - created_at) > SESSION_MAX_LIFETIME_SECONDS:
            removed_sessions.append((session_id, session["username"]))
            del user_sessions[session_id]

    removed_usernames = set()
    for _, username in removed_sessions:
        if not _is_username_active(username) and username in used_usernames:
            used_usernames.remove(username)
            removed_usernames.add(username)

    return {
        "sessions_removed": len(removed_sessions),
        "usernames_removed": len(removed_usernames),
    }


def ensure_username_registered(username: str) -> None:
    if not username:
        return

    now = time.time()
    found_session = False
    for session_id, session in list(user_sessions.items()):
        session = _upgrade_session_structure(session_id, session)
        if session["username"] == username:
            session["last_activity"] = now
            found_session = True

    if username not in used_usernames:
        used_usernames.add(username)

    if not found_session:
        session_id = str(uuid.uuid4())
        register_session(session_id, username)
