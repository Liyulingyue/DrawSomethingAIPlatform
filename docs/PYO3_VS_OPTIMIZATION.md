# PyO3 优化方案分析

## 问题诊断

PyO3 版本存在的核心问题：

1. **依赖文件缺失**: PyO3 版本需要包含完整的 backend 目录（app、alembic、依赖等）
2. **包大小反而增加**: 包含整个 Python 源代码后，最终包大小可能超过 SQLite 版本
3. **维护复杂性**: Python 代码与 Rust 代码紧耦合，难以调试和维护
4. **性能问题**: 嵌入式 Python 的启动和运行性能未必更好

## 当前大小对比

| 方案 | MSI | 原因 | 可行性 |
|------|-----|------|--------|
| SQLite sidecar | 72MB | 包含完整 Python 运行时 + 后端代码 | ✅ 完全可行 |
| PyO3 (无后端) | 3MB | 仅 Rust 可执行文件 | ❌ 无法运行 |
| PyO3 (含后端) | 70-75MB | Python 源代码 + Rust 可执行文件 | ❌ 无优势 |

## 真正有效的优化方案

### 方案 A: UPX 压缩 SQLite 版本（推荐）

**优点:**
- ✅ 最小改动
- ✅ 保持完整功能
- ✅ 可减小 50-60%（72MB → 30-35MB）
- ✅ 解压自动，用户无感知

**步骤:**
```powershell
# 1. 安装 UPX
choco install upx

# 2. 修改 build_tauri_sqlite.ps1
# 在构建完成后添加：
$exePath = "frontend\src-tauri\target\release\app.exe"
if (Test-Path $exePath) {
    upx --best --lzma $exePath
}
```

### 方案 B: 移除不必要的依赖

**减小 Python 包大小:**
```bash
# backend/requirements.txt 中移除:
- psycopg2-binary (改用 psycopg2)
- opencv-python (除非真正需要)
- 其他大型 ML 库

# 改用轻量级替代品
```

**预期减小: 10-15%**

### 方案 C: 分离大型资源文件

**将模型等大文件分离:**
```python
# 在首次运行时下载
def ensure_models_downloaded():
    if not os.path.exists("models/"):
        download_and_extract_models()
```

**预期减小: 15-25%**

## 最终建议

### ✅ 推荐方案
1. **使用 UPX 压缩** SQLite 版本 (72MB → 30-35MB)
2. **清理不必要依赖** (35MB → 28-30MB)
3. **分离资源文件** (可选, 28MB → 20-25MB)

**总体: 72MB → 25-30MB (减小 60-65%)**

### ❌ 不推荐 PyO3
- 需要打包完整 backend 目录，体积反而增加
- 新增调试难度，性能未必更优
- 边际收益不足以抵消维护成本

## 具体操作步骤

### 步骤 1: UPX 压缩

修改 `scripts/build_tauri_sqlite.ps1`:

```powershell
# 在 "Build Completed (SQLite)" 部分之后添加

Write-Host "Compressing executable with UPX..." -ForegroundColor Yellow
$exePath = "frontend\src-tauri\target\release\app.exe"
if (Test-Path $exePath) {
    upx --best --lzma $exePath -o "$exePath.upx"
    if ($LASTEXITCODE -eq 0) {
        Move-Item "$exePath.upx" $exePath -Force
        Write-Host "Executable compressed successfully" -ForegroundColor Green
    }
}
```

### 步骤 2: 优化 Python 依赖

编辑 `backend/requirements.txt`:
```
# 移除大型包
# - psycopg2-binary
# - 
```

### 步骤 3: 测试

```powershell
# 构建
.\scripts\build_tauri_sqlite.ps1

# 检查大小
ls frontend\src-tauri\target\release\bundle\nsis\*.exe
```

## 成本分析

| 方案 | 开发时间 | 包大小 | 功能完整 | 稳定性 | 总体评分 |
|------|--------|-------|---------|-------|---------|
| 优化 SQLite | 2-3小时 | 25-30MB | ✅ | ✅✅✅ | ⭐⭐⭐⭐⭐ |
| PyO3 | 10+ 小时 | 70-75MB | ❌ | ⭐⭐ | ⭐⭐ |

## 结论

**放弃 PyO3，转向优化 SQLite 版本更为明智。**

- 投入少，效果显著
- 保持应用稳定性
- 最终包大小 25-30MB 是可接受的
