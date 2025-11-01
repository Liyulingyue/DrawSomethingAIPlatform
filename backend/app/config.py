"""
统一配置文件
集中管理所有配置项，包括环境变量、常量等
"""
import os
from typing import Optional


class Config:
    """应用配置类"""

    # === 数据库配置 ===
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/drawsomething")

    # === AI 模型配置 ===
    MODEL_KEY: Optional[str] = os.getenv("MODEL_KEY")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "ernie-4.5-vl-28b-a3b")
    MODEL_URL: str = os.getenv("MODEL_URL", "https://aistudio.baidu.com/llm/lmapi/v3")

    # === 管理员配置 ===
    ADMIN_USER: Optional[str] = os.getenv("ADMIN_USER")
    ADMIN_PASSWORD: Optional[str] = os.getenv("ADMIN_PASSWORD")

    # === 会话配置 ===
    SESSION_TIMEOUT_SECONDS: int = int(os.getenv("SESSION_TIMEOUT_SECONDS", "3600"))  # 1 hour inactivity timeout
    SESSION_MAX_LIFETIME_SECONDS: int = int(os.getenv("SESSION_MAX_LIFETIME_SECONDS", "86400"))  # 24 hour max lifetime

    # === 画廊配置 ===
    GALLERY_DIR: str = os.getenv("GALLERY_DIR", "Source/gallery")

    # === 其他配置 ===
    # 可以在这里添加更多配置项


# 创建全局配置实例
config = Config()