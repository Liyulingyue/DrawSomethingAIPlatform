# 应用包大小优化指南

## 当前大小对比

| 方案 | MSI | NSIS | 优点 | 缺点 |
|------|-----|------|------|------|
| **SQLite 版本** | 72.71MB | 72.02MB | 功能完整，运行稳定 | 包含 Python 运行时，较大 |
| **PyO3 版本** | 3.5MB | 2.48MB | 极小体积 | 部署复杂，易出错，难以维护 |

## 推荐方案：优化 SQLite 版本

### 1. 使用 UPX 压缩（可减小 50-60%）

**安装 UPX：**
```powershell
# 下载 https://upx.github.io/ 或使用 choco
choco install upx
```

**修改构建脚本添加 UPX 压缩：**

在 `build_tauri_sqlite.ps1` 中，构建后添加：
```powershell
# 压缩可执行文件
$exePath = "frontend\src-tauri\target\release\app.exe"
if (Test-Path $exePath) {
    Write-Host "Compressing executable with UPX..." -ForegroundColor Yellow
    upx --best --lzma $exePath
}
```

**预期结果：** 72MB → 30-35MB

### 2. 优化 Python 依赖

**移除不必要的包：**
```bash
# backend/requirements.txt 中可以删除：
# - psycopg2_binary（因为用 SQLite）
# - 任何 ML/AI 库的不用的依赖
```

### 3. 分离资源文件

**将大文件分离到单独的下载：**
- 模型文件
- 示例数据
- 本地化文件

**在首次运行时下载：**
```python
def download_resources_if_needed():
    if not os.path.exists("resources/models"):
        download_from_server("models.zip")
        extract_to("resources/")
```

### 4. 使用 msix 而不是 msi（可选）

MSIX 格式有更好的压缩，但需要 Windows 10+。

## 具体步骤

### 步骤 1：优化后端依赖

编辑 `backend/requirements.txt`：
```
# 移除
- psycopg2-binary
- 其他大型库

# 保留最小必需
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
# ... 其他必需的
```

### 步骤 2：修改数据库配置

在 `backend/app/database.py` 中：
```python
# 检查是否是 Tauri 环境
is_tauri = os.getenv("TAURI_ENV") == "production"

if is_tauri:
    # 使用本地 SQLite
    DB_URL = "sqlite:///./app_data/app.db"
    
    # 确保数据目录存在
    os.makedirs("app_data", exist_ok=True)
else:
    # 开发环境使用 PostgreSQL
    DB_URL = "postgresql://..."
```

### 步骤 3：构建并测试

```powershell
# 优化版本的 SQLite 构建
.\scripts\build_tauri_sqlite.ps1

# 结果应该在 35-40MB
```

## 成本分析

| 方案 | 开发成本 | 维护成本 | 稳定性 | 最终大小 |
|------|--------|--------|-------|--------|
| PyO3 | 高 | 高 | 低 | 2-3MB |
| 优化 SQLite | 低 | 低 | 高 | 30-40MB |

## 结论

**建议选择优化 SQLite 版本：**
- ✅ 保持原有稳定的 sidecar 架构
- ✅ 只需简单的依赖优化
- ✅ 最终大小 30-40MB（可接受）
- ✅ 维护和调试简单

PyO3 版本适合学术研究或极端优化需求，但对商业应用来说收益不大。
