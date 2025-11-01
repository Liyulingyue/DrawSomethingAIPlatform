#!/usr/bin/env python3
"""
清理 Alembic 迁移历史
"""

import os
import sys
from sqlalchemy import create_engine, text

# 添加backend路径
sys.path.insert(0, os.path.dirname(__file__))

def clean_alembic_history():
    """清理数据库中的alembic迁移历史"""

    # 数据库连接
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/drawsomething"

    try:
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            # 检查alembic_version表是否存在
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')"))
            exists = result.fetchone()[0]

            if exists:
                print("发现alembic_version表，正在清理...")
                # 删除表中的所有记录
                conn.execute(text("DELETE FROM alembic_version"))
                conn.commit()
                print("✅ 迁移历史已清理")
            else:
                print("ℹ️ 没有找到alembic_version表")

    except Exception as e:
        print(f"❌ 清理失败: {e}")
        return False

    return True

if __name__ == "__main__":
    print("开始清理Alembic迁移历史...")
    success = clean_alembic_history()
    if success:
        print("🎉 清理完成！现在可以重新开始迁移了。")
    else:
        print("💥 清理失败，请手动检查数据库。")