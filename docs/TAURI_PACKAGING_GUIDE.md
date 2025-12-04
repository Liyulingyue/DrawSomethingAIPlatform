# Tauri 打包方案（推荐，更小体积）

## 方案概述

Tauri 是 Electron 的替代品，使用 Rust 编写，打包体积更小（约 10-20 MB）。

## 优势

- ✅ **体积小**：比 Electron 小 10 倍以上
- ✅ **性能好**：启动速度快，内存占用少
- ✅ **安全性高**：Rust 编写的核心
- ✅ **跨平台**：Windows/Mac/Linux

## 步骤 1：安装 Rust 和 Tauri CLI

### Windows

```powershell
# 安装 Rust
# 下载并运行 https://www.rust-lang.org/tools/install

# 安装 Tauri CLI
cargo install tauri-cli

# 或使用 npm
npm install -g @tauri-apps/cli
```

## 步骤 2：初始化 Tauri 项目

```bash
cd frontend

# 添加 Tauri
npm install -D @tauri-apps/cli @tauri-apps/api

# 初始化
npm tauri init
```

### 配置问题回答

```
What is your app name? DrawSomething AI Platform
What should the window title be? DrawSomething AI
Where are your web assets located? ../dist
What is the url of your dev server? http://localhost:5173
What is your frontend dev command? npm run dev
What is your frontend build command? npm run build
```

## 步骤 3：配置 Tauri

### `frontend/src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist",
    "withGlobalTauri": true
  },
  "package": {
    "productName": "DrawSomething AI Platform",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true,
        "sidecar": true,
        "scope": [
          {
            "name": "backend",
            "sidecar": true,
            "args": true
          }
        ]
      },
      "protocol": {
        "asset": true,
        "assetScope": ["**"]
      },
      "fs": {
        "writeFile": true,
        "readFile": true,
        "scope": ["$APPDATA/*", "$APPDATA/**"]
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.drawsomething.aiplatform",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "resources": [],
      "externalBin": ["backend"],
      "copyright": "",
      "category": "Graphics",
      "shortDescription": "AI 绘画挑战平台",
      "longDescription": "基于 AI 的绘画挑战游戏平台",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "DrawSomething AI Platform",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

## 步骤 4：创建后端启动脚本

### `frontend/src-tauri/src/main.rs`

```rust
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::api::process::{Command, CommandEvent};
use std::sync::Mutex;

struct BackendProcess(Mutex<Option<std::process::Child>>);

#[tauri::command]
fn start_backend() -> Result<String, String> {
    // 启动 Python 后端
    let (mut rx, _child) = Command::new_sidecar("backend")
        .expect("failed to create `backend` binary command")
        .spawn()
        .expect("Failed to spawn sidecar");

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => println!("Backend: {}", line),
                CommandEvent::Stderr(line) => eprintln!("Backend Error: {}", line),
                _ => {}
            }
        }
    });

    Ok("Backend started".to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 启动后端
            start_backend().ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_backend])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 步骤 5：打包后端为 sidecar

### 修改 `backend/run.py`

```python
#!/usr/bin/env python3
"""
Tauri Sidecar 启动脚本
"""
import sys
import os

# 设置为单机模式
os.environ["STANDALONE_MODE"] = "true"

# 导入应用
from app.main import app
import uvicorn

if __name__ == "__main__":
    # 使用固定端口
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8002,
        log_level="info"
    )
```

### 打包后端

```bash
cd backend

# 使用 PyInstaller 打包
pyinstaller --onefile --name backend run.py

# 复制到 Tauri binaries 目录
# Windows
Copy-Item dist/backend.exe ../frontend/src-tauri/binaries/backend-x86_64-pc-windows-msvc.exe

# macOS
# cp dist/backend ../frontend/src-tauri/binaries/backend-x86_64-apple-darwin

# Linux
# cp dist/backend ../frontend/src-tauri/binaries/backend-x86_64-unknown-linux-gnu
```

## 步骤 6：构建和打包

### 开发模式

```bash
cd frontend
npm tauri dev
```

### 生产打包

```bash
# 构建
npm tauri build

# 输出位置
# Windows: src-tauri/target/release/bundle/nsis/
# macOS: src-tauri/target/release/bundle/dmg/
# Linux: src-tauri/target/release/bundle/appimage/
```

## 完整打包脚本

### `scripts/build-tauri.ps1`

```powershell
$ErrorActionPreference = "Stop"

Write-Host "=== Tauri 打包流程 ===" -ForegroundColor Green

# 1. 打包后端
Write-Host "`n[1/3] 打包 Python 后端..." -ForegroundColor Yellow
Set-Location backend
pip install -r requirements.txt
pip install pyinstaller

pyinstaller --onefile `
    --name backend `
    --hidden-import=fastapi `
    --hidden-import=uvicorn `
    run.py

# 复制到 Tauri binaries
$binaryPath = "../frontend/src-tauri/binaries"
New-Item -ItemType Directory -Force -Path $binaryPath
Copy-Item dist/backend.exe "$binaryPath/backend-x86_64-pc-windows-msvc.exe" -Force

Set-Location ..

# 2. 构建前端
Write-Host "`n[2/3] 构建前端..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build

# 3. 打包 Tauri 应用
Write-Host "`n[3/3] 打包 Tauri 应用..." -ForegroundColor Yellow
npm tauri build

Set-Location ..

Write-Host "`n=== 打包完成！===" -ForegroundColor Green
Write-Host "安装包位置: frontend/src-tauri/target/release/bundle/" -ForegroundColor Cyan
```

## 体积对比

| 方案 | Windows 体积 | 优势 |
|------|-------------|------|
| Electron | ~150-250 MB | 成熟稳定 |
| Tauri | ~15-30 MB | 体积小，性能好 |
| 纯 Python | ~50-100 MB | 简单直接 |

## 推荐使用 Tauri 的理由

1. **体积小**：只有 Electron 的 1/10
2. **启动快**：冷启动 < 1 秒
3. **内存少**：运行时内存占用 < 50 MB
4. **原生性能**：使用系统 WebView，不内置浏览器
5. **安全性好**：权限系统更严格
