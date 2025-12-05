# DrawSomething AI - Tauri 桌面版打包完整指南

## 🎯 概述

本指南将帮助您将 DrawSomething AI 打包成独立的 Windows 桌面应用。

**最终产物：**
- ✅ 单个 `.exe` 安装包或免安装版
- ✅ 内嵌 FastAPI 后端 + PostgreSQL 数据库
- ✅ 原生窗口体验，无浏览器概念
- ✅ 体积约 50-80 MB（含数据库）

## 📋 前置要求

### 必需软件

1. **Node.js** (>= 16.0)
   - 下载: https://nodejs.org/

2. **Python** (>= 3.8)
   - 下载: https://www.python.org/downloads/

3. **Rust**
   - 下载: https://www.rust-lang.org/tools/install
   - 安装后重启终端

### 验证安装

```powershell
node --version
python --version
rustc --version
cargo --version
```

## 🚀 一键打包

### 方式一：全自动打包（推荐）

```powershell
cd scripts
.\build_tauri.ps1
```

脚本会自动完成：
1. 下载嵌入式 PostgreSQL
2. 构建前端
3. 打包后端为 exe
4. 打包 Tauri 应用

### 方式二：分步打包

```powershell
# 1. 下载 PostgreSQL（首次需要）
cd scripts
.\download_postgres.ps1

# 2. 构建前端
cd ..\frontend
npm install
npm run build

# 3. 打包后端
cd ..\backend
pip install pyinstaller
pyinstaller --onefile --name backend run_tauri.py

# 4. 复制后端到 Tauri
New-Item -ItemType Directory -Path ..\frontend\src-tauri\binaries -Force
Copy-Item dist\backend.exe ..\frontend\src-tauri\binaries\backend-x86_64-pc-windows-msvc.exe

# 5. 打包 Tauri
cd ..\frontend
npm run tauri:build
```

## 📦 打包产物

打包完成后，在以下位置查找生成的文件：

```
frontend/src-tauri/target/release/bundle/
├── msi/
│   └── DrawSomething AI_1.0.0_x64.msi    # 安装包
└── nsis/
    └── DrawSomething AI_1.0.0_x64.exe    # 免安装版
```

## 🧪 测试打包应用

### 开发模式测试

```powershell
cd scripts
.\build_tauri.ps1 -DevMode
```

### 生产版本测试

直接运行生成的 `.exe` 或安装 `.msi`

## 🎨 自定义配置

### 修改应用图标

1. 准备图标文件（`.ico`, `.png`, `.icns`）
2. 放置到 `frontend/src-tauri/icons/`
3. 更新 `frontend/src-tauri/tauri.conf.json` 中的 `icon` 字段

### 修改应用名称

编辑 `frontend/src-tauri/tauri.conf.json`:

```json
{
  "package": {
    "productName": "您的应用名",
    "version": "1.0.0"
  }
}
```

### 修改窗口大小

编辑 `frontend/src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "windows": [{
      "width": 1400,
      "height": 900,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

## 🔧 故障排查

### 问题 1: Rust 安装后命令找不到

**解决方法:**
- 重启终端或 VS Code
- 或手动添加到 PATH: `C:\Users\你的用户名\.cargo\bin`

### 问题 2: PyInstaller 打包后端失败

**常见原因:**
- 缺少隐藏导入

**解决方法:**
查看错误日志，添加缺失的 `--hidden-import` 到 `build_tauri.ps1`

### 问题 3: Tauri 打包失败 - "sidecar not found"

**原因:** 后端 exe 未正确复制

**解决方法:**
```powershell
# 检查文件是否存在
ls frontend\src-tauri\binaries\

# 应该看到: backend-x86_64-pc-windows-msvc.exe
```

### 问题 4: 打包后应用无法连接后端

**原因:** 端口信息未正确传递

**解决方法:**
1. 检查 `backend/run_tauri.py` 是否正确写入端口文件
2. 检查 Rust 代码是否正确读取端口文件
3. 查看应用日志（在用户数据目录）

### 问题 5: PostgreSQL 下载失败

**解决方法:**
手动下载：
1. 访问: https://www.enterprisedb.com/download-postgresql-binaries
2. 下载 Windows x64 版本的 ZIP 包
3. 解压到 `backend/resources/postgres/`

### 问题 6: 打包体积过大

**优化方法:**
1. 排除不需要的依赖
2. 使用 UPX 压缩
3. 移除不必要的 Python 包

## 📁 重要文件说明

| 文件 | 用途 |
|------|------|
| `backend/run_tauri.py` | Tauri 模式后端启动脚本 |
| `frontend/src/config/api.ts` | API 配置（自动适配 Web/Tauri） |
| `frontend/src-tauri/src/main.rs` | Rust 主程序（管理后端进程） |
| `frontend/src-tauri/tauri.conf.json` | Tauri 配置文件 |
| `scripts/build_tauri.ps1` | 一键打包脚本 |
| `scripts/download_postgres.ps1` | PostgreSQL 下载脚本 |

## 🌐 双模式开发

### Web 模式（日常开发）

```powershell
# 终端 1 - 后端
cd backend
python run.py

# 终端 2 - 前端
cd frontend
npm run dev

# 浏览器访问: http://localhost:5175
```

### Tauri 模式（测试桌面版）

```powershell
cd frontend
npm run tauri:dev

# 会打开原生窗口
```

**两种模式共享同一套代码！**

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 安装包大小 | 50-80 MB |
| 首次启动时间 | 3-5 秒 |
| 内存占用 | 80-150 MB |
| CPU 占用 | 低（<5%） |

## 🎉 发布清单

打包完成后，发布前检查：

- [ ] 应用可正常启动
- [ ] 所有功能正常工作
- [ ] 数据库可正常读写
- [ ] AI 功能可正常调用
- [ ] 无控制台错误
- [ ] 应用图标正确显示
- [ ] 卸载程序正常工作（MSI 版本）

## 📞 获取帮助

如果遇到问题：

1. 查看 Tauri 官方文档: https://tauri.app/
2. 查看 PyInstaller 文档: https://pyinstaller.org/
3. 检查应用日志（位于用户数据目录）

---

**祝打包顺利！** 🎊
