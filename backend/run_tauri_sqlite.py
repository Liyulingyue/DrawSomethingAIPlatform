"""
Tauri 模式启动脚本 (SQLite 版本)
用途：在 Tauri 打包环境中启动后端，使用 SQLite 数据库：
1. 使用随机可用端口
2. 将端口号写入文件供 Tauri 读取
3. 无需启动 PostgreSQL
"""
import traceback
from dotenv import load_dotenv
import os
import sys
import socket
import time
from pathlib import Path
import io

# 设置标准输出为 UTF-8 编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 加载环境变量
load_dotenv()


def find_free_port():
    """查找可用的随机端口"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


def get_app_data_dir():
    """获取应用数据目录（用于存储数据库）"""
    app_data = Path.home() / 'AppData' / 'Roaming' / 'DrawSomethingAI'
    app_data.mkdir(parents=True, exist_ok=True)
    return app_data


def apply_migrations():
    """应用所有待处理的 Alembic 迁移"""
    try:
        from alembic.config import Config
        from alembic import command

        # 在打包环境中查找 alembic.ini
        if getattr(sys, 'frozen', False):
            # PyInstaller 打包环境
            alembic_cfg_path = os.path.join(sys._MEIPASS, "alembic.ini")
        else:
            # 开发环境
            alembic_cfg_path = os.path.join(os.path.dirname(__file__), "alembic.ini")

        if not os.path.exists(alembic_cfg_path):
            print("[WARNING] alembic.ini file not found, skipping migration")
            return

        print("[INFO] Applying database migrations...")
        alembic_cfg = Config(alembic_cfg_path)
        command.upgrade(alembic_cfg, "head")
        print("[OK] Database migrations applied")

    except Exception as e:
        print(f"[WARNING] Error applying migrations: {e}")
        traceback.print_exc()
        print("Continuing startup, but database schema may be inconsistent")


def write_port_file(backend_port):
    """将端口信息写入文件供 Tauri 读取"""
    port_file = get_app_data_dir() / 'server_info.json'
    import json

    info = {
        'backend_port': backend_port,
        'database': 'sqlite'
    }

    with open(port_file, 'w') as f:
        json.dump(info, f)

    # Print port to stdout/stderr so Rust can capture it immediately
    print(f"[PORT] Backend port allocated: {backend_port}", flush=True)
    sys.stderr.write(f"[PORT] Backend port allocated: {backend_port}\n")
    sys.stderr.flush()
    print(f"[INFO] Port info written to: {port_file}", flush=True)


def cleanup_pyinstaller_temp():
    """清理 PyInstaller --onefile 创建的临时目录（仅清理当前应用的）"""
    try:
        import shutil

        # 只清理当前应用的临时目录，不清理其他应用的
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            # PyInstaller --onefile 模式下
            mei_path = sys._MEIPASS  # 例如: C:\Users\XXX\AppData\Local\Temp\_MEI123456
            mei_parent = os.path.dirname(mei_path)  # 获取父目录

            # 验证这是一个 _MEI* 目录
            mei_dir_name = os.path.basename(mei_parent)
            if mei_dir_name.startswith('_MEI'):
                try:
                    print(f"[INFO] Cleaning up current application's PyInstaller temp directory: {mei_parent}")
                    shutil.rmtree(mei_parent, ignore_errors=True)
                    print(f"[OK] Cleaned up: {mei_parent}")
                except Exception as e:
                    print(f"[WARNING] Failed to cleanup PyInstaller temp: {e}")
            else:
                print(f"[DEBUG] Not running in PyInstaller --onefile mode (mei_parent={mei_parent})")
        else:
            print("[DEBUG] Not running in PyInstaller mode or _MEIPASS not available")
    except Exception as e:
        print(f"[WARNING] Error during PyInstaller cleanup: {e}")


if __name__ == "__main__":
    # ========================================
    # 第一步：设置 Tauri 模式标记（必须在导入 app 之前）
    # ========================================
    os.environ['IS_TAURI_MODE'] = 'true'
    os.environ['SESSION_TIMEOUT_SECONDS'] = '999999999'  # ~31.7 年
    os.environ['SESSION_MAX_LIFETIME_SECONDS'] = '999999999'  # ~31.7 年
    print("[INFO] 🎯 Tauri 模式已启用 (SQLite)")

    # ========================================
    # 第二步：配置 SQLite 数据库
    # ========================================
    app_data = get_app_data_dir()
    sqlite_path = app_data / 'drawsomething.db'
    db_url = f"sqlite:///{sqlite_path}"
    os.environ['DATABASE_URL'] = db_url
    print(f"[INFO] Using SQLite database: {sqlite_path}")

    # ========================================
    # 第三步：确保 .env 文件存在
    # ========================================
    env_file = Path(__file__).parent / '.env'
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包环境
        env_file = Path(sys._MEIPASS) / '.env'

    if not env_file.exists():
        print("[INFO] Creating default .env file...")
        # 创建最小化的 .env 文件
        default_env = """# DrawSomething AI Desktop Configuration (SQLite)
# AI features are optional - you can leave these empty if not using AI
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
MODEL_URL=https://aistudio.baidu.com/llm/lmapi/v3
MODEL_KEY=
MODEL_NAME=ernie-4.5-vl-28b-a3b
TEXT2IMAGE_MODEL_URL=https://aistudio.baidu.com/llm/lmapi/v3
TEXT2IMAGE_MODEL_KEY=
TEXT2IMAGE_MODEL_NAME=Stable-Diffusion-XL
"""
        # 在 AppData 目录创建 .env 文件
        app_env_file = get_app_data_dir() / '.env'
        with open(app_env_file, 'w', encoding='utf-8') as f:
            f.write(default_env)
        print(f"[OK] Created .env at: {app_env_file}")
        # 重新加载环境变量
        load_dotenv(app_env_file)

    # ========================================
    # 第四步：应用数据库迁移
    # ========================================
    print("[INFO] Applying database migrations...")
    apply_migrations()

    # ========================================
    # 第五步：导入应用并启动
    # ========================================
    from app.main import app
    import uvicorn

    # 查找可用端口
    backend_port = find_free_port()
    print(f"[INFO] Backend port allocated: {backend_port}")

    # 写入端口信息
    write_port_file(backend_port)

    print("="*50)
    print(f"[INFO] Starting backend service (port: {backend_port})...")
    print(f"[INFO] Access URL: http://127.0.0.1:{backend_port}")
    print(f"[OK] Using SQLite database: {sqlite_path}")
    print("="*50)

    # 注册退出时清理
    import atexit
    atexit.register(cleanup_pyinstaller_temp)

    # 使用明确指定的端口启动 Uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=backend_port,
        log_level="info"
    )