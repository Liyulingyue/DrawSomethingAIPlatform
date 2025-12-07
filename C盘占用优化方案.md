# DrawSomething AI - C盘占用优化方案

## 📋 问题描述

应用每次启动时C盘会增加约2GB占用，主要原因是PyInstaller的`--onefile`打包模式会将所有资源（包括1.05GB的PostgreSQL）解压到临时目录。

### 🔍 问题根源
- **PyInstaller机制**: `--onefile`模式下，每次运行都会解压到`%TEMP%\_MEI[随机数]\`
- **PostgreSQL占用**: 1.05GB的PostgreSQL二进制文件被打包进exe
- **临时目录堆积**: 程序异常退出时，临时目录不会被清理

## 💡 解决方案

### 方案1：切换到SQLite数据库（推荐）
**最彻底的解决方案，完全移除PostgreSQL依赖**

#### 修改内容
1. **打包脚本**: 移除PostgreSQL打包
2. **运行脚本**: 默认使用SQLite，PostgreSQL作为可选

#### 优点
- ✅ backend.exe体积减少到约80MB
- ✅ 零临时文件占用
- ✅ 启动速度快
- ✅ 完全解决C盘占用问题

#### 缺点
- ❌ 功能可能受限（如果应用依赖PostgreSQL特定功能）

---

### 方案2A：使用`--onedir`模式（推荐）
**保留PostgreSQL，优化打包方式**

#### 修改内容
```powershell
# scripts/build_tauri.ps1 第183行
pyinstaller --onedir --name backend ...  # 改为 --onedir
```

#### 优点
- ✅ **零临时文件占用**：资源只解压一次到安装目录
- ✅ **启动速度快**：不需要解压，直接运行
- ✅ **保留PostgreSQL**：完整功能不变
- ✅ **最彻底解决临时文件问题**

#### 缺点
- ❌ 打包后是一个文件夹（约1.5GB），而不是单个exe
- ❌ 分发时需要打包整个文件夹

#### 实施步骤
1. 修改`scripts/build_tauri.ps1`第183行：`--onefile` → `--onedir`
2. 重新打包
3. 生成的文件在`backend/dist/backend/`文件夹中
4. Tauri需要调整引用路径：`backend/backend.exe`（而不是`backend.exe`）

---

### 方案2B：添加临时文件清理机制
**保持`--onefile`，添加自动清理**

#### 修改内容
在`run_tauri.py`中添加清理函数：

```python
def cleanup_old_temp_dirs():
    """清理旧的PyInstaller临时目录"""
    import tempfile
    import shutil
    import time

    temp_dir = Path(tempfile.gettempdir())
    current_pid = os.getpid()

    # 查找所有 _MEI 目录
    for item in temp_dir.glob('_MEI*'):
        if not item.is_dir():
            continue

        try:
            # 获取目录创建时间
            dir_age = time.time() - item.stat().st_mtime

            # 如果超过1小时且不是当前进程的目录，则删除
            if dir_age > 3600:  # 1小时
                print(f"[INFO] Cleaning old temp dir: {item}")
                shutil.rmtree(item, ignore_errors=True)
        except Exception as e:
            # 可能被其他进程占用，跳过
            pass
```

#### 优点
- ✅ 保持单个exe分发
- ✅ 自动清理旧临时文件
- ✅ 保留PostgreSQL

#### 缺点
- ❌ 仍然每次启动时解压1.45GB（但会清理旧的）
- ❌ 启动速度慢（需要解压）
- ⚠️ 如果多个实例同时运行，可能会互相干扰

---

### 方案2C：使用外部PostgreSQL
**不打包PostgreSQL，运行时下载**

#### 修改内容
首次运行时下载PostgreSQL到固定位置：

```python
def ensure_postgres_installed():
    """确保PostgreSQL已安装到固定位置"""
    app_data = get_app_data_dir()
    pg_home = app_data / 'postgres'

    if not (pg_home / 'bin' / 'postgres.exe').exists():
        print("[INFO] PostgreSQL not found, downloading...")
        # 下载PostgreSQL portable版本到固定目录
        download_postgres(pg_home)

    return pg_home
```

#### 优点
- ✅ backend.exe只有约80MB（不含PostgreSQL）
- ✅ PostgreSQL只下载一次到`AppData/DrawSomethingAI/postgres/`
- ✅ 单个exe分发
- ✅ 启动时临时占用小

#### 缺点
- ❌ 首次运行需要联网下载PostgreSQL
- ❌ 需要实现下载和安装逻辑

---

## 🎖️ 推荐方案

### 首选：方案2A（--onedir模式）
- **理由**: 最彻底解决临时文件问题，启动速度最快，实施最简单
- **适用场景**: 对分发方式不敏感，希望最佳用户体验

### 备选：方案1（SQLite）
- **理由**: 完全解决体积和占用问题
- **适用场景**: PostgreSQL功能不是必需，或可以接受功能限制

### 临时缓解：方案2B（清理机制）
- **理由**: 保持当前架构，最小化改动
- **适用场景**: 需要快速解决问题，但可以接受启动速度慢

---

## 📊 方案对比表

| 方案 | exe体积 | 临时占用 | 启动速度 | 分发方式 | PostgreSQL | 实施难度 |
|------|---------|----------|----------|----------|------------|----------|
| 方案1 | ~80MB | 无 | 快 | 单exe | ❌ | 中 |
| 方案2A | ~1.5GB文件夹 | 无 | 快 | 文件夹 | ✅ | 低 |
| 方案2B | ~500MB | 每次1.45GB（自动清理） | 慢 | 单exe | ✅ | 中 |
| 方案2C | ~80MB | 首次下载1GB | 中 | 单exe | ✅ | 高 |

---

## 🚀 实施建议

1. **立即实施**: 方案2A（--onedir），最简单有效
2. **测试验证**: 确认新版本不再产生临时文件
3. **清理现有**: 删除用户C盘中的旧`_MEI*`目录
4. **监控效果**: 观察新版本的C盘占用情况

---

*最后更新: 2025年12月7日*</content>
<parameter name="filePath">f:\PythonCodes\DrawSomethingAIPlatform\C盘占用优化方案.md