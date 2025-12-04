# 纯 Python 单文件打包方案

## 方案概述

将前端打包为静态文件，嵌入到 Python 后端中，使用 PyInstaller 打包为单个 exe。

## 优势

- ✅ **最简单**：只需要 Python，无需 Node.js 环境
- ✅ **体积适中**：50-100 MB
- ✅ **一个文件**：真正的单文件 exe
- ✅ **易于分发**：双击即可运行

## 步骤 1：修改后端嵌入前端

### 安装额外依赖

```bash
cd backend
pip install aiofiles jinja2
```

### 修改 `backend/app/main.py`

```python
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path

app = FastAPI()

# 获取静态文件路径
if getattr(sys, 'frozen', False):
    # 打包后的路径
    STATIC_DIR = Path(sys._MEIPASS) / "static"
else:
    # 开发环境路径
    STATIC_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 路由
from .routes import (
    auth_router,
    ai_router,
    gallery_router,
    sketch_router,
)

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(gallery_router)
app.include_router(sketch_router)

# 挂载静态文件（必须在其他路由之后）
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse(str(STATIC_DIR / "index.html"))
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # SPA 路由支持
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # 返回 index.html 用于前端路由
        return FileResponse(str(STATIC_DIR / "index.html"))
else:
    @app.get("/")
    async def root():
        return {"msg": "DrawSomethingAIPlatform backend running (no frontend)"}
```

### 创建启动脚本 `backend/run_standalone.py`

```python
#!/usr/bin/env python3
"""
单机版启动脚本
"""
import sys
import os
import webbrowser
import threading
import time

# 设置单机模式
os.environ["STANDALONE_MODE"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./drawsomething.db"

def open_browser():
    """延迟打开浏览器"""
    time.sleep(2)
    webbrowser.open("http://127.0.0.1:8002")

if __name__ == "__main__":
    from app.main import app
    import uvicorn
    
    print("=" * 60)
    print("DrawSomething AI Platform - 单机版")
    print("=" * 60)
    print("\n正在启动服务器...")
    print("访问地址: http://127.0.0.1:8002")
    print("\n按 Ctrl+C 停止服务器\n")
    
    # 在后台线程中打开浏览器
    threading.Thread(target=open_browser, daemon=True).start()
    
    # 启动服务器
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8002,
        log_level="info"
    )
```

## 步骤 2：创建 PyInstaller 配置

### `backend/standalone.spec`

```python
# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path

block_cipher = None

# 前端构建目录
frontend_dist = Path('../frontend/dist')

# 收集前端静态文件
datas = []
if frontend_dist.exists():
    # 递归添加所有前端文件
    for root, dirs, files in os.walk(frontend_dist):
        for file in files:
            file_path = Path(root) / file
            relative_path = file_path.relative_to(frontend_dist.parent)
            datas.append((str(file_path), str(relative_path.parent)))

a = Analysis(
    ['run_standalone.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sqlalchemy',
        'pydantic',
        'starlette',
        'aiofiles',
        'jinja2',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='DrawSomethingAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 显示控制台窗口，便于调试
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../docs/icon.ico'  # 添加图标
)
```

## 步骤 3：简化配置

### 修改 `backend/app/config.py`

```python
import os
from pathlib import Path

class Config:
    # 单机模式
    STANDALONE_MODE = os.getenv("STANDALONE_MODE", "true").lower() == "true"
    
    # 数据库配置
    if STANDALONE_MODE:
        # 使用当前目录的 SQLite 数据库
        DATABASE_URL = os.getenv(
            "DATABASE_URL",
            f"sqlite:///{Path.home() / 'DrawSomethingAI' / 'data.db'}"
        )
    else:
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://...")
    
    # AI 配置
    MODEL_KEY = os.getenv("MODEL_KEY", "")
    
    # 单机版无需登录
    REQUIRE_LOGIN = False if STANDALONE_MODE else True
    
    # 单机版无限调用
    UNLIMITED_CALLS = True if STANDALONE_MODE else False
    DEFAULT_NEW_USER_CALLS = 9999 if STANDALONE_MODE else 10
    
    # 其他配置...
    SESSION_TIMEOUT_SECONDS = 3600
    SESSION_MAX_LIFETIME_SECONDS = 86400
    GALLERY_DIR = str(Path.home() / "DrawSomethingAI" / "gallery")
    
    # 管理员配置（可选）
    ADMIN_USER = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

config = Config()
```

## 步骤 4：打包流程

### 创建完整打包脚本 `scripts/build-standalone.ps1`

```powershell
$ErrorActionPreference = "Stop"

Write-Host "=== 构建单机版 DrawSomething AI ===" -ForegroundColor Green

# 1. 构建前端
Write-Host "`n[1/3] 构建前端..." -ForegroundColor Yellow
Set-Location frontend

if (-not (Test-Path "node_modules")) {
    npm install
}

npm run build

Set-Location ..

# 2. 准备 Python 环境
Write-Host "`n[2/3] 准备 Python 环境..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}

.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller aiofiles jinja2

# 3. 打包为 exe
Write-Host "`n[3/3] 打包为单文件 exe..." -ForegroundColor Yellow
pyinstaller standalone.spec --clean

Set-Location ..

Write-Host "`n=== 打包完成！===" -ForegroundColor Green
Write-Host "exe 位置: backend/dist/DrawSomethingAI.exe" -ForegroundColor Cyan
Write-Host "`n使用说明:" -ForegroundColor Yellow
Write-Host "1. 双击 DrawSomethingAI.exe 启动" -ForegroundColor White
Write-Host "2. 浏览器会自动打开 http://127.0.0.1:8002" -ForegroundColor White
Write-Host "3. 首次使用需要配置 AI API Key" -ForegroundColor White
```

### Linux/Mac 版本 `scripts/build-standalone.sh`

```bash
#!/bin/bash
set -e

echo "=== 构建单机版 DrawSomething AI ==="

# 1. 构建前端
echo -e "\n[1/3] 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 2. 准备 Python 环境
echo -e "\n[2/3] 准备 Python 环境..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller aiofiles jinja2

# 3. 打包
echo -e "\n[3/3] 打包..."
pyinstaller standalone.spec --clean

cd ..

echo -e "\n=== 打包完成！==="
echo "可执行文件: backend/dist/DrawSomethingAI"
```

## 步骤 5：配置向导（可选）

### 创建首次启动配置 `backend/app/config_wizard.py`

```python
"""
配置向导 - 首次启动时引导用户配置
"""
import os
from pathlib import Path

def run_config_wizard():
    """运行配置向导"""
    config_file = Path.home() / "DrawSomethingAI" / "config.env"
    
    if config_file.exists():
        return  # 已配置过
    
    print("\n" + "=" * 60)
    print("欢迎使用 DrawSomething AI Platform!")
    print("=" * 60)
    print("\n首次使用需要配置 AI 服务\n")
    
    # 获取 API Key
    api_key = input("请输入 AI API Key (或按回车跳过): ").strip()
    
    # 创建配置目录
    config_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 写入配置
    with open(config_file, "w", encoding="utf-8") as f:
        if api_key:
            f.write(f"MODEL_KEY={api_key}\n")
        f.write("STANDALONE_MODE=true\n")
    
    print("\n✅ 配置完成！服务器即将启动...\n")

# 在 run_standalone.py 中调用
if __name__ == "__main__":
    from app.config_wizard import run_config_wizard
    run_config_wizard()
    # ... 其余启动代码
```

## 使用说明

### 打包

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts/build-standalone.ps1

# Linux/Mac
chmod +x scripts/build-standalone.sh
./scripts/build-standalone.sh
```

### 分发

生成的 `DrawSomethingAI.exe` 是完全独立的，可以：
- 直接发送给用户
- 上传到网盘/GitHub Releases
- 创建安装程序（使用 Inno Setup）

### 创建安装程序（可选）

使用 Inno Setup 创建 Windows 安装程序：

```iss
; DrawSomethingAI.iss
[Setup]
AppName=DrawSomething AI Platform
AppVersion=1.0
DefaultDirName={autopf}\DrawSomethingAI
DefaultGroupName=DrawSomething AI
OutputDir=output
OutputBaseFilename=DrawSomethingAI-Setup
Compression=lzma2
SolidCompression=yes

[Files]
Source: "backend\dist\DrawSomethingAI.exe"; DestDir: "{app}"

[Icons]
Name: "{group}\DrawSomething AI"; Filename: "{app}\DrawSomethingAI.exe"
Name: "{autodesktop}\DrawSomething AI"; Filename: "{app}\DrawSomethingAI.exe"

[Run]
Filename: "{app}\DrawSomethingAI.exe"; Description: "启动应用"; Flags: postinstall nowait skipifsilent
```

## 优缺点总结

### 优点
- ✅ 真正的单文件 exe
- ✅ 无需安装其他依赖
- ✅ 体积适中（50-100 MB）
- ✅ 打包流程简单

### 缺点
- ❌ 首次启动较慢（解压资源）
- ❌ UI 需要浏览器
- ❌ 无法使用系统托盘等原生功能
