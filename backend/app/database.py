from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, LargeBinary, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime
import hashlib
from .config import config

DATABASE_URL = config.DATABASE_URL

# SQLite 特殊配置：启用外键支持和改进并发
if 'sqlite' in DATABASE_URL.lower():
    print("[DEBUG] Detected SQLite database, applying SQLite-specific settings")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
        echo=False
    )
    
    # 为 SQLite 启用外键约束和 WAL 模式（改进并发）
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        print("[DEBUG] SQLite PRAGMA configured: foreign_keys=ON, journal_mode=WAL")
        cursor.close()
else:
    print("[DEBUG] Using PostgreSQL database")
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)  # 添加密码哈希字段
    is_admin = Column(Boolean, default=False)
    calls_remaining = Column(Integer, default=0)  # 剩余调用次数，可充值
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)

class Gallery(Base):
    __tablename__ = "gallery"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)  # 上传者用户名
    user_id = Column(Integer, nullable=True)  # 关联用户ID，可为空（兼容旧数据）
    timestamp = Column(String, nullable=False)  # 格式：YYYYMMDD_HHMMSS
    likes = Column(Integer, default=0)
    image_data = Column(LargeBinary, nullable=False)  # 图片二进制数据
    image_mime_type = Column(String, default='image/png')  # 图片MIME类型
    created_at = Column(DateTime, default=datetime.utcnow)

# 注意：不再自动创建表，由 Alembic 迁移管理数据库结构
# Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    """使用SHA-256哈希密码"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """验证密码"""
    return hash_password(password) == password_hash