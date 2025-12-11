"""
PyO3 兼容的 Python 模块
为 Tauri + PyO3 架构提供后端服务
"""
import os
import sys
import asyncio
import threading
from pathlib import Path
from typing import Optional

# 添加项目路径到 Python 路径
current_dir = Path(__file__).parent
backend_dir = current_dir / ".." / ".." / ".." / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# 导入应用
from app.main import app
from app.config import config
import uvicorn


class BackendServer:
    """后端服务器管理器"""

    def __init__(self):
        self.server = None
        self.thread = None
        self.port = None

    def find_free_port(self) -> int:
        """查找可用端口"""
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def get_app_data_dir(self) -> Path:
        """获取应用数据目录"""
        app_data = Path.home() / 'AppData' / 'Roaming' / 'DrawSomethingAI'
        app_data.mkdir(parents=True, exist_ok=True)
        return app_data

    def setup_database(self):
        """设置 SQLite 数据库"""
        app_data = self.get_app_data_dir()
        sqlite_path = app_data / 'drawsomething.db'
        db_url = f"sqlite:///{sqlite_path}"
        os.environ['DATABASE_URL'] = db_url
        print(f"[PyO3] Using SQLite database: {sqlite_path}")

    def setup_environment(self):
        """设置环境变量"""
        # Tauri 模式
        os.environ['IS_TAURI_MODE'] = 'true'
        os.environ['SESSION_TIMEOUT_SECONDS'] = '999999999'
        os.environ['SESSION_MAX_LIFETIME_SECONDS'] = '999999999'

        # 数据库配置
        self.setup_database()

        print("[PyO3] Environment configured for Tauri + PyO3")

    def apply_migrations(self):
        """应用数据库迁移"""
        try:
            from alembic.config import Config
            from alembic import command

            alembic_cfg_path = backend_dir / "alembic.ini"
            if not alembic_cfg_path.exists():
                print("[PyO3] Warning: alembic.ini not found")
                return

            print("[PyO3] Applying database migrations...")
            alembic_cfg = Config(str(alembic_cfg_path))
            command.upgrade(alembic_cfg, "head")
            print("[PyO3] Database migrations applied")

        except Exception as e:
            print(f"[PyO3] Migration error: {e}")

    def start_server(self, port: Optional[int] = None) -> int:
        """启动服务器"""
        if port is None:
            port = self.find_free_port()

        self.port = port

        def run_server():
            """在后台线程中运行服务器"""
            print(f"[PyO3] Starting server on port {port}")
            uvicorn.run(
                app,
                host="127.0.0.1",
                port=port,
                log_level="info"
            )

        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()

        print(f"[PyO3] Server started on port {port}")
        return port

    def stop_server(self):
        """停止服务器"""
        if self.server:
            self.server.should_exit = True
        print("[PyO3] Server stopped")

    def get_port(self) -> Optional[int]:
        """获取服务器端口"""
        return self.port


# 全局服务器实例
backend_server = BackendServer()


def initialize_backend() -> int:
    """初始化并启动后端服务器"""
    try:
        backend_server.setup_environment()
        backend_server.apply_migrations()
        port = backend_server.start_server()
        return port
    except Exception as e:
        print(f"[PyO3] Failed to initialize backend: {e}")
        return 0


def get_backend_port() -> int:
    """获取后端端口"""
    return backend_server.get_port() or 0


def shutdown_backend():
    """关闭后端服务器"""
    backend_server.stop_server()