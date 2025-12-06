#!/usr/bin/env python
"""
SmolVLM-256M-Instruct GGUF 服务启动脚本
使用 llama-cpp-python 的 OpenAI 兼容 API
"""

import os
import sys
import subprocess
from pathlib import Path

# 检查 llama-cpp-python 是否安装
try:
    import llama_cpp
    print("✅ llama-cpp-python 已安装")
except ImportError as e:
    print(f"❌ 导入失败: {e}")
    print("请先运行: pip install -r requirements.txt")
    sys.exit(1)

# 配置
MODEL_NAME = "SmolVLM-256M-Instruct-Q8_0.gguf"
MODEL_PATH = Path(__file__).parent / MODEL_NAME
MMPROJ_NAME = "mmproj-SmolVLM-256M-Instruct-f16.gguf"
MMPROJ_PATH = Path(__file__).parent / MMPROJ_NAME
HOST = "127.0.0.1"
PORT = 8888

def find_model():
    """查找模型文件"""
    # 直接使用当前目录的模型文件
    if MODEL_PATH.exists():
        return str(MODEL_PATH)
    
    print(f"❌ 未找到模型文件: {MODEL_PATH}")
    return None

def find_mmproj():
    """查找视觉编码器文件"""
    if MMPROJ_PATH.exists():
        return str(MMPROJ_PATH)
    
    print(f"⚠️  未找到视觉编码器文件: {MMPROJ_PATH}")
    return None

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 SmolVLM-256M-Instruct GGUF 服务启动")
    print("=" * 60)
    print()
    
    model_path = find_model()
    
    if not model_path:
        print(f"❌ 模型文件不存在")
        print(f"📍 期望路径: {MODEL_PATH}")
        sys.exit(1)
    
    mmproj_path = find_mmproj()
    
    print(f"✅ 找到模型: {model_path}")
    if mmproj_path:
        print(f"✅ 找到视觉编码器: {mmproj_path}")
    print(f"📍 监听地址: http://{HOST}:{PORT}")
    print(f"📚 API 文档: http://{HOST}:{PORT}/docs")
    print(f"🏥 健康检查: http://{HOST}:{PORT}/v1/models")
    print()
    print("⏹️  按 Ctrl+C 停止服务")
    print()
    
    # 启动 llama-cpp-python server
    cmd = [
        sys.executable,
        "-m",
        "llama_cpp.server",
        "--model",
        model_path,
        "--host",
        HOST,
        "--port",
        str(PORT),
        "--n_gpu_layers",
        "-1",  # 使用 GPU 加速
        "--n_threads",
        "4",
        "--n_batch",
        "512",
        "--chat_format",
        "llava-1-5",  # 使用 LLaVA 格式支持视觉
    ]
    
    # 如果找到视觉编码器，添加到命令
    if mmproj_path:
        cmd.extend(["--clip_model_path", mmproj_path])
    
    print(f"🔄 启动命令: {' '.join(cmd)}")
    print()
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n🔴 服务已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 服务启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

