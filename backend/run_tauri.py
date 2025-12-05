"""
Tauri 模式启动脚本
用途：在 Tauri 打包环境中启动后端，支持：
1. 自动启动嵌入式 PostgreSQL
2. 使用随机可用端口
3. 将端口号写入文件供 Tauri 读取
"""
import traceback
from dotenv import load_dotenv
import os
import sys
import socket
import subprocess
import time
from pathlib import Path
import atexit
import io

# 设置标准输出为 UTF-8 编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 设置默认环境变量(在加载 .env 之前,避免业务代码启动时报错)
os.environ.setdefault('TEXT2IMAGE_MODEL_KEY', 'not-configured')
os.environ.setdefault('MODEL_KEY', 'not-configured')
os.environ.setdefault('ADMIN_USER', 'admin')
os.environ.setdefault('ADMIN_PASSWORD', 'admin123')

# 加载环境变量
load_dotenv()

# 全局变量存储子进程
postgres_process = None


def find_free_port():
    """查找可用的随机端口"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


def get_resource_path(relative_path):
    """获取资源文件路径（兼容开发和打包环境）"""
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包后
        base_path = Path(sys._MEIPASS)
    else:
        # 开发环境
        base_path = Path(__file__).parent
    
    return base_path / relative_path


def get_app_data_dir():
    """获取应用数据目录（用于存储数据库）"""
    app_data = Path.home() / 'AppData' / 'Roaming' / 'DrawSomethingAI'
    app_data.mkdir(parents=True, exist_ok=True)
    return app_data


def start_embedded_postgres():
    """启动嵌入式 PostgreSQL"""
    global postgres_process
    
    try:
        # PostgreSQL 可执行文件路径
        pg_bin = get_resource_path('resources/postgres/pgsql/bin')
        postgres_exe = pg_bin / 'postgres.exe'
        initdb_exe = pg_bin / 'initdb.exe'
        
        print(f"[DEBUG] Looking for PostgreSQL at: {postgres_exe}")
        
        if not postgres_exe.exists():
            print("[WARNING] Embedded PostgreSQL not found, trying system PostgreSQL")
            return None
        
        # 数据目录
        data_dir = get_app_data_dir() / 'pgdata'
        
        # 初始化数据库（如果未初始化）
        if not data_dir.exists():
            print("[INFO] Initializing PostgreSQL data directory...")
            result = subprocess.run(
                [str(initdb_exe), '-D', str(data_dir), '-U', 'postgres', '-E', 'UTF8'],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"[ERROR] Initialization failed: {result.stderr}")
                return None
            print("[OK] Initialization completed")
        
        # 启动 PostgreSQL
        pg_port = find_free_port()
        print(f"[INFO] Starting PostgreSQL (port: {pg_port})...")
        
        postgres_process = subprocess.Popen(
            [
                str(postgres_exe),
                '-D', str(data_dir),
                '-p', str(pg_port),
                '-h', '127.0.0.1'
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        
        # 等待 PostgreSQL 启动
        time.sleep(2)
        
        if postgres_process.poll() is not None:
            print("[ERROR] PostgreSQL failed to start")
            return None
        
        print("[OK] PostgreSQL started")
        
        # 返回连接信息
        return {
            'host': '127.0.0.1',
            'port': pg_port,
            'user': 'postgres',
            'password': '',
            'database': 'postgres'
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to start PostgreSQL: {e}")
        traceback.print_exc()
        return None


def stop_postgres():
    """停止 PostgreSQL"""
    global postgres_process
    if postgres_process:
        print("[INFO] Stopping PostgreSQL...")
        postgres_process.terminate()
        try:
            postgres_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            postgres_process.kill()
        print("[OK] PostgreSQL stopped")


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


def write_port_file(backend_port, postgres_info=None):
    """将端口信息写入文件供 Tauri 读取"""
    port_file = get_app_data_dir() / 'server_info.json'
    import json
    
    info = {
        'backend_port': backend_port,
        'postgres': postgres_info
    }
    
    with open(port_file, 'w') as f:
        json.dump(info, f)
    
    print(f"[INFO] Port info written to: {port_file}")


if __name__ == "__main__":
    # 确保 .env 文件存在
    env_file = Path(__file__).parent / '.env'
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包环境
        env_file = Path(sys._MEIPASS) / '.env'
    
    if not env_file.exists():
        print("[INFO] Creating default .env file...")
        # 创建最小化的 .env 文件
        default_env = """# DrawSomething AI Desktop Configuration
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
    
    # 注册退出时清理
    atexit.register(stop_postgres)
    
    # 启动嵌入式 PostgreSQL
    print("[INFO] Starting embedded PostgreSQL...")
    postgres_info = start_embedded_postgres()
    
    # 配置数据库连接
    if postgres_info:
        db_url = f"postgresql://{postgres_info['user']}@{postgres_info['host']}:{postgres_info['port']}/{postgres_info['database']}"
        os.environ['DATABASE_URL'] = db_url
        print(f"[OK] PostgreSQL database configured: {postgres_info['host']}:{postgres_info['port']}")
        
        # 只在有 PostgreSQL 时才应用迁移
        apply_migrations()
    else:
        # 使用 SQLite 作为后备数据库
        app_data = get_app_data_dir()
        sqlite_path = app_data / 'drawsomething.db'
        db_url = f"sqlite:///{sqlite_path}"
        os.environ['DATABASE_URL'] = db_url
        print(f"[WARNING] Using SQLite database as fallback: {sqlite_path}")
        print("[INFO] Database features will be limited without PostgreSQL")
    
    # 查找可用端口
    backend_port = find_free_port()
    
    # 写入端口信息
    write_port_file(backend_port, postgres_info)
    
    # 导入并启动应用
    from app.main import app
    import uvicorn
    
    print("="*50)
    print(f"[INFO] Starting backend service (port: {backend_port})...")
    print(f"[INFO] Access URL: http://127.0.0.1:{backend_port}")
    print("="*50)
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=backend_port,
        log_level="info"
    )
