# Scripts Directory

本目录包含打包、部署和更新相关的脚本。

## 打包脚本

### `build_tauri_sqlite_shutdown.ps1` - SQLite 版本（主脚本）

**适用场景：** 桌面应用打包

**使用方式：**

```powershell
# 便携版（推荐）- 生成文件夹，打开即用
.\build_tauri_sqlite_shutdown.ps1 -Portable

# 安装包版本 - 生成安装程序
.\build_tauri_sqlite_shutdown.ps1

# 开发模式
.\build_tauri_sqlite_shutdown.ps1 -DevMode
```

**输出：**

| 模式 | 输出位置 |
|------|---------|
| 便携版 | `dist-portable/` 文件夹 |
| 安装包 | `frontend/src-tauri/target/release/bundle/` |

**特点：**
- 使用 SQLite 数据库（轻量、无需额外下载）
- 集成 llama-server + Qwen3-VL 本地模型 (~2.2GB)
- 优雅关闭功能，确保数据安全

---

### `build_tauri.ps1` - PostgreSQL 版本

**适用场景：** 生产环境、服务器部署（Web 模式）

**特点：**
- 使用 PostgreSQL 数据库
- 自动下载并打包嵌入式 PostgreSQL (~200MB)
- 集成 llama-server + Qwen3-VL 本地模型 (~2.2GB)
- 支持完整的数据库功能

**使用：**
```powershell
.\build_tauri.ps1           # 完整打包
.\build_tauri.ps1 -DevMode  # 开发模式
```

> ⚠️ PostgreSQL 版本适合服务器部署，不建议打包成桌面 exe

---

### `build_tauri_sqlite.ps1` - SQLite 基础版

**适用场景：** 测试和开发

**特点：**
- SQLite 数据库
- 基础功能，无优雅关闭
- 适合快速测试

---

### `build_tauri_pyo3.ps1` - PyO3 实验版

**适用场景：** 实验性开发

**特点：**
- 使用 PyO3 将 Python 嵌入 Rust
- 不依赖 PyInstaller
- 更原生的集成方式
- **注意：** 实验性，可能不稳定

---

## 工具脚本

### `download_postgres.ps1`

单独下载嵌入式 PostgreSQL 便携版。

**使用：**
```powershell
.\download_postgres.ps1
```

---

### `auto_update.py`

Git 热更新工具，用于服务器部署。

**功能：**
- 定时检查 Git 仓库更新
- 自动拉取最新代码
- 执行部署命令
- 重启服务

**配置：** 参见 `auto_update_config.json`

---

## 快速开始

### 桌面应用打包（便携版）

```powershell
cd scripts
.\build_tauri_sqlite_shutdown.ps1 -Portable
```

输出：`dist-portable/` 文件夹，包含：
- `DrawSomething AI.exe` - 主程序
- `DrawSomethingBackend.exe` - 后端服务
- `llama-server.exe` - 本地模型服务
- `models/` - 模型文件

### 前置条件

打包前确保模型文件存在：
```
cpp_model_services/
├── llama-server.exe
└── models/
    └── Qwen3VL-2B-Instruct/
        ├── Qwen3VL-2B-Instruct-Q8_0.gguf
        └── mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf
```

如果不存在，运行：
```powershell
cd cpp_model_services
python prepare_model.py
```

---

## 版本对比

| 特性 | PostgreSQL 版 | SQLite 版 |
|------|--------------|-----------|
| 数据库 | PostgreSQL | SQLite |
| 打包体积 | 较大 (~3GB) | 较小 (~2.5GB) |
| 多用户支持 | ✓ | ✗ |
| 数据库功能 | 完整 | 基础 |
| 部署复杂度 | 中等 | 简单 |
| 推荐场景 | 生产/服务器 | 桌面应用 |
