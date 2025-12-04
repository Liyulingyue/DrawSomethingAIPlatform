# Electron 打包方案

## 方案概述

将前端打包为 Electron 应用，后端 Python 打包为独立可执行文件，两者集成在一起。

## 步骤 1：打包 Python 后端

### 使用 PyInstaller

```bash
cd backend

# 安装 PyInstaller
pip install pyinstaller

# 打包为单个 exe
pyinstaller --onefile --name DrawSomethingBackend run.py

# 或打包为文件夹（启动更快）
pyinstaller --name DrawSomethingBackend run.py
```

### 优化配置文件 `backend.spec`

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=[],
    datas=[
        # 如果有静态文件，添加在这里
        # ('app/static', 'static'),
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        # 添加其他隐式导入
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
    name='DrawSomethingBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # 设为 False 隐藏控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico'  # 添加图标
)
```

## 步骤 2：创建 Electron 应用

### 初始化 Electron 项目

```bash
# 在项目根目录创建 electron 文件夹
mkdir electron
cd electron
npm init -y

# 安装依赖
npm install electron electron-builder --save-dev
```

### 创建主进程文件 `electron/main.js`

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let backendProcess

// 启动 Python 后端
function startBackend() {
  const isDev = !app.isPackaged
  
  if (isDev) {
    // 开发模式：直接运行 Python
    backendProcess = spawn('python', ['../backend/run.py'], {
      cwd: path.join(__dirname, '..')
    })
  } else {
    // 生产模式：运行打包的 exe
    const backendPath = path.join(
      process.resourcesPath,
      'backend',
      'DrawSomethingBackend.exe'
    )
    backendProcess = spawn(backendPath)
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png')
  })

  // 等待后端启动
  setTimeout(() => {
    const isDev = !app.isPackaged
    
    if (isDev) {
      // 开发模式：加载 Vite 开发服务器
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    } else {
      // 生产模式：加载打包的前端文件
      mainWindow.loadFile(path.join(__dirname, '../frontend-dist/index.html'))
    }
  }, 2000)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})
```

### 创建预加载脚本 `electron/preload.js`

```javascript
// 如果需要暴露 Node.js API 给渲染进程
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 添加需要的 API
})
```

### 配置 `electron/package.json`

```json
{
  "name": "drawsomething-ai-platform",
  "version": "1.0.0",
  "description": "AI 绘画挑战平台",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win --x64",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.drawsomething.aiplatform",
    "productName": "DrawSomething AI Platform",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "../frontend-dist/**/*"
    ],
    "extraResources": [
      {
        "from": "../backend/dist/DrawSomethingBackend.exe",
        "to": "backend/DrawSomethingBackend.exe"
      }
    ],
    "win": {
      "target": ["nsis"],
      "icon": "icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "target": ["dmg"],
      "icon": "icon.icns"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "icon.png"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

## 步骤 3：打包流程

### 创建打包脚本 `scripts/build-all.ps1`

```powershell
# 设置错误时停止
$ErrorActionPreference = "Stop"

Write-Host "=== 开始打包 DrawSomething AI Platform ===" -ForegroundColor Green

# 1. 构建前端
Write-Host "`n[1/4] 构建前端..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build
Copy-Item -Path dist -Destination ../frontend-dist -Recurse -Force
Set-Location ..

# 2. 打包后端
Write-Host "`n[2/4] 打包后端..." -ForegroundColor Yellow
Set-Location backend
pip install pyinstaller
pyinstaller backend.spec
Set-Location ..

# 3. 复制必要文件到 electron
Write-Host "`n[3/4] 准备 Electron 资源..." -ForegroundColor Yellow
if (-not (Test-Path "electron/node_modules")) {
    Set-Location electron
    npm install
    Set-Location ..
}

# 4. 打包 Electron 应用
Write-Host "`n[4/4] 打包 Electron 应用..." -ForegroundColor Yellow
Set-Location electron
npm run build:win
Set-Location ..

Write-Host "`n=== 打包完成！===" -ForegroundColor Green
Write-Host "安装包位置: electron/dist/" -ForegroundColor Cyan
```

## 步骤 4：简化配置（移除数据库依赖）

为了简化单机版，建议：

1. **修改后端配置** - 使用 SQLite 内存数据库或移除数据库
2. **环境变量内置** - 将 AI API Key 内置或提供配置界面
3. **移除登录** - 改为匿名模式

### 修改 `backend/app/config.py`

```python
# 单机版配置
STANDALONE_MODE = os.getenv("STANDALONE_MODE", "true").lower() == "true"

if STANDALONE_MODE:
    # 使用 SQLite 内存数据库
    DATABASE_URL = "sqlite:///:memory:"
    # 不需要登录
    REQUIRE_LOGIN = False
    # 无限调用次数
    UNLIMITED_CALLS = True
```

## 使用说明

### 开发模式

```bash
# 终端 1: 启动后端
cd backend
python run.py

# 终端 2: 启动前端
cd frontend
npm run dev

# 终端 3: 启动 Electron
cd electron
npm start
```

### 生产模式打包

```bash
# Windows
powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1

# 或手动执行
cd frontend && npm run build && cd ..
cd backend && pyinstaller backend.spec && cd ..
cd electron && npm run build:win
```

## 注意事项

1. **AI API Key 配置**
   - 可以打包时内置到 exe
   - 或在首次启动时让用户配置

2. **文件大小**
   - Python 后端打包后约 50-100 MB
   - Electron + 前端约 100-150 MB
   - 总计约 150-250 MB

3. **杀毒软件**
   - PyInstaller 打包的 exe 可能被误报
   - 需要添加代码签名证书

4. **自动更新**
   - 可以使用 electron-updater
   - 或提供手动下载更新
