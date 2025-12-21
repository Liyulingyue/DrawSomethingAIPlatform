#!/usr/bin/env python3
"""
Z-Image Service 打包脚本
使用 PyInstaller 将 Z-Image 服务打包为独立exe文件

运行方法:
.venv\Scripts\python.exe build_exe.py  (Windows)
.venv/bin/python build_exe.py  (Linux/Mac)
"""

import os
import sys
import subprocess

def main():
    """主函数"""
    print("=== Z-Image Service 打包脚本 ===")
    print("服务名称: Z-Image-Service")
    print("主脚本: z_image_service.py")
    print()

    # 检查spec文件
    spec_file = "z_image_service.spec"
    if not os.path.exists(spec_file):
        print(f"错误: 未找到spec文件: {spec_file}")
        return 1

    print(f"✓ 找到spec文件: {spec_file}")

    # 运行PyInstaller
    print("\n=== 开始打包 ===")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        "--log-level=INFO",
        spec_file
    ]

    print(f"执行命令: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, check=True)
        print("✓ 打包成功完成!")

        # 检查输出
        exe_path = "dist/Z-Image-Service.exe"
        if os.path.exists(exe_path):
            file_size = os.path.getsize(exe_path) / (1024 * 1024)  # MB
            print(f"✓ 生成exe文件: {exe_path}")
            print(f"文件大小: {file_size:.2f} MB")
        print("\n=== 打包流程完成! ===")
        print()
        print("使用说明:")
        print("1. 运行exe文件启动服务: dist\\Z-Image-Service.exe")
        print("2. 服务将在自动选择的端口上启动")
        print("3. 访问 http://localhost:<port> 查看API文档")
        print("4. 使用 /load 端点加载模型")
        print("5. 使用 /images/generations 端点生成图像")
        print()
        print("注意: 模型文件需要单独放置，不包含在exe中")

        return 0

    except subprocess.CalledProcessError as e:
        print(f"✗ 打包失败: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())