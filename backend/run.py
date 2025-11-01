from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

from app.main import app
import uvicorn

# 在应用启动前应用数据库迁移
def apply_migrations():
    """应用所有待处理的 Alembic 迁移"""
    try:
        from alembic.config import Config
        from alembic import command
        
        # 获取 alembic.ini 的路径（与 run.py 同级）
        alembic_cfg_path = os.path.join(os.path.dirname(__file__), "alembic.ini")
        
        if not os.path.exists(alembic_cfg_path):
            print("警告: alembic.ini 文件不存在，跳过迁移应用")
            return
            
        print("正在应用数据库迁移...")
        alembic_cfg = Config(alembic_cfg_path)
        command.upgrade(alembic_cfg, "head")
        print("数据库迁移应用完成")
        
    except Exception as e:
        print(f"应用数据库迁移时出错: {e}")
        print("继续启动应用，但数据库结构可能不一致")

if __name__ == "__main__":
    # 应用数据库迁移
    apply_migrations()
    
    uvicorn.run(app, host="0.0.0.0", port=8002)
