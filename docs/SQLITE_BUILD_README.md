# SQLite 版本构建说明

此版本移除了 PostgreSQL 依赖，使用 SQLite 数据库，可以显著减小打包尺寸。

## 文件说明

- `build_tauri_sqlite.ps1` - SQLite 版本的构建脚本
- `run_tauri_sqlite.py` - 简化的启动脚本（无 PostgreSQL）
- `tauri_sqlite.conf.json` - Tauri 配置（移除 PostgreSQL sidecar）

## 使用方法

1. **构建应用**：
   ```powershell
   .\scripts\build_tauri_sqlite.ps1
   ```

2. **开发模式**：
   ```powershell
   .\scripts\build_tauri_sqlite.ps1 -DevMode
   ```

3. **跳过某些步骤**：
   ```powershell
   .\scripts\build_tauri_sqlite.ps1 -SkipFrontend  # 跳过前端构建
   .\scripts\build_tauri_sqlite.ps1 -SkipBackend   # 跳过后端构建
   ```

## 主要变化

- ✅ 移除 PostgreSQL 下载和打包 (~200MB 节省)
- ✅ 使用 SQLite 数据库（文件存储）
- ✅ 移除 PostgreSQL sidecar 配置
- ✅ 简化的启动脚本

## 数据库位置

SQLite 数据库文件存储在：
```
%APPDATA%\DrawSomethingAI\drawsomething.db
```

## 注意事项

- 所有原有功能保持不变
- 数据库迁移会自动应用
- 适合单用户桌面应用场景