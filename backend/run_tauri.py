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
# 注意：这些默认值现在在 config.py 中设置，这里不再需要

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
        
        # 如果数据目录已存在，检查并清理旧的 lock 文件
        if data_dir.exists():
            postmaster_pid = data_dir / 'postmaster.pid'
            if postmaster_pid.exists():
                try:
                    # 尝试读取 PID
                    with open(postmaster_pid, 'r') as f:
                        pid_content = f.read().strip().split('\n')[0]  # 第一行是 PID
                    print(f"[WARNING] Found existing postmaster.pid: {pid_content}")
                    
                    # 尝试杀死该进程
                    try:
                        old_pid = int(pid_content)
                        import os
                        # 尝试杀死旧进程
                        os.kill(old_pid, 9)
                        print(f"[OK] Killed stale PostgreSQL process (PID: {old_pid})")
                        time.sleep(1)
                    except (ValueError, ProcessLookupError):
                        # PID 可能无效或进程已不存在
                        print("[INFO] Stale process not found or already terminated")
                    except Exception as e:
                        print(f"[WARNING] Could not kill old process: {e}")
                    
                    # 删除 lock 文件
                    print("[INFO] Attempting to remove stale lock file...")
                    postmaster_pid.unlink()
                    print("[OK] Removed stale postmaster.pid")
                    
                    # 也删除其他可能的 lock 文件
                    for lock_file in ['postmaster.pid.lock', '.s.PGSQL.lock']:
                        lock_path = data_dir / lock_file
                        if lock_path.exists():
                            try:
                                lock_path.unlink()
                                print(f"[OK] Removed {lock_file}")
                            except:
                                pass
                except Exception as e:
                    print(f"[WARNING] Could not clean lock files: {e}")
        
        # 初始化数据库（如果未初始化或损坏）
        pg_version_file = data_dir / 'PG_VERSION'
        needs_init = not data_dir.exists() or not pg_version_file.exists()
        
        if needs_init:
            if data_dir.exists():
                print(f"[WARNING] Data directory exists but PG_VERSION missing - database may be corrupted")
                print(f"[INFO] Backing up corrupted database...")
                import shutil
                backup_dir = get_app_data_dir() / 'pgdata_backup'
                if backup_dir.exists():
                    shutil.rmtree(backup_dir)
                shutil.move(str(data_dir), str(backup_dir))
                print(f"[OK] Backed up to: {backup_dir}")
            
            print("[INFO] Initializing PostgreSQL data directory...")
            print(f"[DEBUG] initdb path: {initdb_exe}")
            result = subprocess.run(
                [str(initdb_exe), '-D', str(data_dir), '-U', 'postgres', '-E', 'UTF8'],
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode != 0:
                print(f"[ERROR] Initialization failed: {result.stderr}")
                print(f"[DEBUG] initdb stdout: {result.stdout}")
                return None
            print("[OK] Initialization completed")
        else:
            print(f"[INFO] PostgreSQL data directory already exists: {data_dir}")
        
        # 启动 PostgreSQL
        pg_port = find_free_port()
        print(f"[INFO] Starting PostgreSQL (port: {pg_port})...")
        print(f"[DEBUG] PostgreSQL executable: {postgres_exe}")
        print(f"[DEBUG] Data directory: {data_dir}")
        print(f"[DEBUG] Listening on: 127.0.0.1:{pg_port}")
        
        postgres_process = subprocess.Popen(
            [
                str(postgres_exe),
                '-D', str(data_dir),
                '-p', str(pg_port),
                '-h', '127.0.0.1',
                '-F'  # 前台模式，这样日志会输出到 stderr
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        
        # 等待 PostgreSQL 启动并能够接受连接（最多120秒）
        max_wait = 120
        for i in range(max_wait):
            # 检查进程是否已崩溃
            if postgres_process.poll() is not None:
                stdout, stderr = postgres_process.communicate()
                print("[ERROR] PostgreSQL process exited immediately")
                if stdout:
                    print(f"[ERROR] stdout: {stdout.decode('utf-8', errors='ignore')}")
                if stderr:
                    print(f"[ERROR] stderr: {stderr.decode('utf-8', errors='ignore')}")
                return None
            
            # 尝试连接到 PostgreSQL
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(1)
                    result = s.connect_ex(('127.0.0.1', pg_port))
                    if result == 0:
                        print(f"[OK] PostgreSQL started and accepting connections (waited {i} seconds)")
                        time.sleep(1)  # 再等1秒确保完全就绪
                        break
            except:
                pass
            
            if i < max_wait - 1:
                time.sleep(1)
            else:
                print("[ERROR] PostgreSQL did not accept connections within 30 seconds")
                postgres_process.terminate()
                return None
        
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
        try:
            postgres_process.terminate()
            try:
                postgres_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("[WARNING] PostgreSQL did not stop gracefully, killing...")
                postgres_process.kill()
                postgres_process.wait()
        except Exception as e:
            print(f"[WARNING] Error stopping PostgreSQL: {e}")
        print("[OK] PostgreSQL stopped")
    
    # 也尝试杀死任何剩余的 postgres 进程
    try:
        import psutil
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if 'postgres' in proc.name().lower() or 'postgres.exe' in proc.name().lower():
                    print(f"[INFO] Found lingering PostgreSQL process: {proc.pid}")
                    proc.terminate()
            except:
                pass
    except:
        # psutil 不可用，这没关系
        pass
    
    # 清理 PyInstaller 临时文件（_MEI* 目录）
    cleanup_pyinstaller_temp()


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
    
    # Print port to stdout/stderr so Rust can capture it immediately
    print(f"[PORT] Backend port allocated: {backend_port}", flush=True)
    sys.stderr.write(f"[PORT] Backend port allocated: {backend_port}\n")
    sys.stderr.flush()
    print(f"[INFO] Port info written to: {port_file}", flush=True)


if __name__ == "__main__":
    # ========================================
    # 第一步：设置 Tauri 模式标记（必须在导入 app 之前）
    # ========================================
    os.environ['IS_TAURI_MODE'] = 'true'
    os.environ['SESSION_TIMEOUT_SECONDS'] = '999999999'  # ~31.7 年
    os.environ['SESSION_MAX_LIFETIME_SECONDS'] = '999999999'  # ~31.7 年
    print("[INFO] 🎯 Tauri 模式已启用")
    
    # ========================================
    # 第二步：确保 .env 文件存在
    # ========================================
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
    
    # ========================================
    # 第三步：注册退出时清理和启动数据库
    # ========================================    # 注册退出时清理
    atexit.register(stop_postgres)
    
    # 启动嵌入式 PostgreSQL
    print("[INFO] Starting embedded PostgreSQL...")
    postgres_info = start_embedded_postgres()
    
    # 配置数据库连接
    if postgres_info:
        db_url = f"postgresql://{postgres_info['user']}@{postgres_info['host']}:{postgres_info['port']}/{postgres_info['database']}"
        os.environ['DATABASE_URL'] = db_url
        print(f"[OK] PostgreSQL database configured: {postgres_info['host']}:{postgres_info['port']}")
        
        # 应用迁移（必须在数据库启动后进行）
        print("[INFO] Applying database migrations...")
        apply_migrations()
    else:
        # PostgreSQL 启动失败 - 降级到 SQLite
        print("[ERROR] Failed to start embedded PostgreSQL!")
        print("[ERROR] Application cannot start without database.")
        print("[ERROR] Please check:")
        print("  1. Is PostgreSQL installation complete at: backend/resources/postgres/")
        print("  2. Is there enough disk space?")
        print("  3. Are ports in use?")
        print("")
        print("[INFO] Fallback: Using SQLite database (limited functionality)...")
        
        # 使用 SQLite 作为临时后备
        app_data = get_app_data_dir()
        sqlite_path = app_data / 'drawsomething.db'
        db_url = f"sqlite:///{sqlite_path}"
        os.environ['DATABASE_URL'] = db_url
        print(f"[WARNING] Using SQLite database: {sqlite_path}")
        
        # 即使降级，也尝试应用迁移（可能会失败，但至少尝试）
        print("[INFO] Attempting to apply migrations to SQLite...")
        try:
            apply_migrations()
        except Exception as e:
            print(f"[WARNING] Migration failed on SQLite: {e}")
            print("[WARNING] Database schema may be incomplete. Some features will not work.")
        
        print("[WARNING] PostgreSQL is required for production use.")
    
    # ========================================
    # 第四步：导入应用（环境变量已在最开始设置）
    # ========================================
    # 导入应用（在启动 Uvicorn 前导入）
    from app.main import app
    import uvicorn
    
    # 查找可用端口（必须在 PostgreSQL 启动后，以避免冲突）
    backend_port = find_free_port()
    print(f"[INFO] Backend port allocated: {backend_port}")
    
    # 写入端口信息
    write_port_file(backend_port, postgres_info)
    
    print("="*50)
    print(f"[INFO] Starting backend service (port: {backend_port})...")
    print(f"[INFO] Access URL: http://127.0.0.1:{backend_port}")
    if postgres_info:
        print(f"[OK] Using PostgreSQL database")
    else:
        print(f"[WARNING] Using SQLite fallback database")
    print("="*50)
    
    # 使用明确指定的端口启动 Uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=backend_port,
        log_level="info"
    )
