#!/usr/bin/env python
"""
SmolVLM 推理服务启动脚本
激活虚拟环境后直接运行此脚本
"""

import subprocess
import sys
import os

def main():
    # 启动 smolvlm_server.py
    print("🚀 启动 SmolVLM 推理服务...")
    
    try:
        subprocess.run(
            [sys.executable, "smolvlm_server.py"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            check=False
        )
    except KeyboardInterrupt:
        print("\n⏹️  服务已停止")
        sys.exit(0)
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
