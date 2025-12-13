"""
PyO3 兼容的 Python 模块
为 Tauri + PyO3 架构提供后端服务
"""
import os
import sys
import threading
import time
import socket
from pathlib import Path
from typing import Optional

print(f"[PyO3] Backend module being loaded from: {__file__}")

# 添加当前目录到 Python 路径（这样可以导入 app 模块）
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

print(f"[PyO3] Current directory: {current_dir}")
print(f"[PyO3] sys.path[0]: {sys.path[0]}")

# 导入应用和依赖
try:
    from app.main import app
    import uvicorn
    print("[PyO3] Successfully imported FastAPI app and uvicorn")
except ImportError as e:
    print(f"[PyO3] ERROR: Failed to import app: {e}")
    print("[PyO3] This is expected if dependencies are not installed.")
    print("[PyO3] Please install dependencies with: pip install -r requirements.txt")
    # 为了调试，设置占位符
    app = None
    uvicorn = None


class BackendServer:
    """后端服务器管理器"""

    def __init__(self):
        self.thread = None
        self.port = None

    def find_free_port(self) -> int:
        """查找可用端口"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', 0))
                s.listen(1)
                port = s.getsockname()[1]
                return port
        except Exception as e:
            print(f"[PyO3] Error finding free port: {e}")
            return 8000

    def get_app_data_dir(self) -> Path:
        """获取应用数据目录"""
        try:
            app_data = Path.home() / 'AppData' / 'Roaming' / 'DrawSomethingAI'
            app_data.mkdir(parents=True, exist_ok=True)
            return app_data
        except Exception as e:
            print(f"[PyO3] Error creating app data directory: {e}")
            import tempfile
            return Path(tempfile.gettempdir()) / 'DrawSomethingAI'

    def setup_database(self):
        """设置 SQLite 数据库"""
        try:
            app_data = self.get_app_data_dir()
            sqlite_path = app_data / 'drawsomething.db'
            db_url = f"sqlite:///{sqlite_path}"
            os.environ['DATABASE_URL'] = db_url
            print(f"[PyO3] Using SQLite database: {sqlite_path}")
        except Exception as e:
            print(f"[PyO3] Error setting up database: {e}")

    def setup_environment(self):
        """设置环境变量"""
        try:
            # Tauri 模式
            os.environ['IS_TAURI_MODE'] = 'true'
            os.environ['SESSION_TIMEOUT_SECONDS'] = '999999999'
            os.environ['SESSION_MAX_LIFETIME_SECONDS'] = '999999999'

            # 数据库配置
            self.setup_database()

            print("[PyO3] Environment configured for Tauri + PyO3")
        except Exception as e:
            print(f"[PyO3] Error setting up environment: {e}")

    def apply_migrations(self):
        """应用数据库迁移"""
        try:
            from alembic.config import Config
            from alembic import command

            alembic_cfg_path = current_dir / "alembic.ini"
            if not alembic_cfg_path.exists():
                print("[PyO3] Warning: alembic.ini not found, skipping migrations")
                return

            print("[PyO3] Applying database migrations...")
            alembic_cfg = Config(str(alembic_cfg_path))
            command.upgrade(alembic_cfg, "head")
            print("[PyO3] Database migrations applied")
        except Exception as e:
            print(f"[PyO3] Migration warning (non-critical): {e}")

    def start_server(self, port: Optional[int] = None) -> int:
        """启动服务器"""
        if app is None:
            print("[PyO3] WARNING: App not loaded due to missing dependencies. Skipping server start.")
            self.port = 8000  # 默认端口
            return self.port
        
        if port is None:
            port = self.find_free_port()

        self.port = port

        def run_server():
            """在后台线程中运行服务器"""
            try:
                print(f"[PyO3] Starting uvicorn server on port {port}")
                uvicorn.run(
                    app,
                    host="127.0.0.1",
                    port=port,
                    log_level="warning",
                    access_log=False
                )
            except Exception as e:
                print(f"[PyO3] Server error: {e}")

        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()
        
        # 等待服务器启动
        time.sleep(1)

        print(f"[PyO3] Server started on http://127.0.0.1:{port}")
        return port

    def stop_server(self):
        """停止服务器"""
        try:
            print("[PyO3] Server stopped")
        except Exception as e:
            print(f"[PyO3] Error stopping server: {e}")

    def get_port(self) -> Optional[int]:
        """获取服务器端口"""
        return self.port


# 全局服务器实例
backend_server = BackendServer()


def initialize_backend() -> int:
    """初始化并启动后端服务器"""
    try:
        print("[PyO3] Initializing backend...")
        backend_server.setup_environment()
        backend_server.apply_migrations()
        port = backend_server.start_server()
        print(f"[PyO3] Backend initialization complete, port: {port}")
        return port
    except Exception as e:
        print(f"[PyO3] FATAL: Failed to initialize backend: {e}")
        import traceback
        traceback.print_exc()
        return 0


def get_backend_port() -> int:
    """获取后端端口"""
    port = backend_server.get_port()
    print(f"[PyO3] get_backend_port() called, returning: {port}")
    return port or 0


def shutdown_backend():
    """关闭后端服务器"""
    try:
        print("[PyO3] Shutting down backend...")
        # 在必要时添加关闭逻辑
    except Exception as e:
        print(f"[PyO3] Error shutting down: {e}")