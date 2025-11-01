#!/usr/bin/env python3
"""
Gallery数据迁移脚本
将gallery.json的数据迁移到数据库中
"""

import os
import json
import base64
import sys
from datetime import datetime

# 添加backend路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal, Gallery

def migrate_gallery_data():
    """迁移gallery.json数据到数据库"""

    gallery_dir = os.path.join(os.path.dirname(__file__), '..', 'Source', 'gallery')
    gallery_json_path = os.path.join(gallery_dir, "gallery.json")

    if not os.path.exists(gallery_json_path):
        print("gallery.json文件不存在，跳过迁移")
        return

    print("开始迁移gallery数据...")

    # 读取JSON数据
    with open(gallery_json_path, "r", encoding="utf-8") as f:
        gallery_data = json.load(f)

    print(f"找到 {len(gallery_data)} 个画廊项目")

    # 创建数据库会话
    db = SessionLocal()

    try:
        migrated_count = 0
        skipped_count = 0

        for item in gallery_data:
            filename = item.get("filename")
            username = item.get("name", "佚名")
            timestamp = item.get("timestamp")
            likes = item.get("likes", 0)

            # 检查是否已存在
            existing = db.query(Gallery).filter(Gallery.filename == filename).first()
            if existing:
                print(f"跳过已存在的项目: {filename}")
                skipped_count += 1
                continue

            # 读取图片文件数据
            image_path = os.path.join(gallery_dir, filename)
            if not os.path.exists(image_path):
                print(f"图片文件不存在，跳过: {image_path}")
                skipped_count += 1
                continue

            try:
                with open(image_path, 'rb') as f:
                    image_data = f.read()
            except Exception as e:
                print(f"读取图片文件失败 {image_path}: {e}")
                skipped_count += 1
                continue

            # 解析时间戳为datetime对象
            try:
                # timestamp格式: YYYYMMDD_HHMMSS
                created_at = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")
            except ValueError:
                # 如果解析失败，使用当前时间
                created_at = datetime.now()
                print(f"无法解析时间戳 {timestamp}，使用当前时间")

            # 创建数据库记录
            gallery_item = Gallery(
                filename=filename,
                username=username,
                timestamp=timestamp,
                likes=likes,
                image_data=image_data,
                image_mime_type='image/png',
                created_at=created_at
            )

            db.add(gallery_item)
            migrated_count += 1
            print(f"迁移项目: {filename} - {username}")

        # 提交事务
        db.commit()
        print(f"迁移完成！成功迁移: {migrated_count} 个项目，跳过: {skipped_count} 个项目")

        # 备份原文件和JSON文件
        backup_json_path = gallery_json_path + ".backup"
        if os.path.exists(gallery_json_path):
            os.rename(gallery_json_path, backup_json_path)
            print(f"原JSON文件已备份到: {backup_json_path}")

        # 可选：删除旧的图片文件（谨慎操作）
        # print("注意：旧的图片文件仍然保留在文件中，如需清理请手动删除")

    except Exception as e:
        db.rollback()
        print(f"迁移失败: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_gallery_data()