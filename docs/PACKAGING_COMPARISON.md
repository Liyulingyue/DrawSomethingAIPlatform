# 单机 EXE 打包方案对比

## 📊 方案对比表

| 特性 | Tauri ⭐ | Electron | 纯 Python |
|------|---------|----------|-----------|
| **最终体积** | 15-30 MB | 150-250 MB | 50-100 MB |
| **启动速度** | ⚡ 极快 (<1s) | 中等 (2-3s) | 较慢 (3-5s) |
| **内存占用** | 💚 很少 (<50MB) | 🟡 中等 (100-200MB) | 💚 较少 (60-100MB) |
| **打包难度** | 🟡 中等 | 💚 简单 | 💚 简单 |
| **开发体验** | 💚 很好 | 💚 很好 | 🟡 一般 |
| **原生功能** | ✅ 丰富 | ✅ 丰富 | ❌ 受限 |
| **系统托盘** | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| **自动更新** | ✅ 内置 | ✅ 内置 | ❌ 需自己实现 |
| **跨平台** | ✅ Win/Mac/Linux | ✅ Win/Mac/Linux | ✅ Win/Mac/Linux |
| **学习曲线** | 🟡 需学 Rust | 💚 熟悉的 JS | 💚 纯 Python |

## 🎯 推荐选择

### 推荐 1：Tauri（最佳选择）

**适合：**
- ✅ 希望体积最小
- ✅ 追求性能和启动速度
- ✅ 愿意学习一点 Rust 基础
- ✅ 需要现代化的桌面应用

**文档：** `TAURI_PACKAGING_GUIDE.md`

**最终产物：**
- Windows: `.exe` 安装包 (~15-30 MB)
- 免安装版: 单文件夹 (~20-35 MB)

### 推荐 2：纯 Python（最简单）

**适合：**
- ✅ 只懂 Python，不想学前端打包
- ✅ 快速发布，简单分发
- ✅ 不介意浏览器界面
- ✅ 体积要求不太严格

**文档：** `PYTHON_STANDALONE_GUIDE.md`

**最终产物：**
- Windows: 单个 `.exe` 文件 (~50-100 MB)

### 备选：Electron（稳妥保守）

**适合：**
- ✅ 需要最稳定的方案
- ✅ 需要丰富的社区资源
- ✅ 不在意体积
- ✅ 需要复杂的原生功能

**文档：** `ELECTRON_PACKAGING_GUIDE.md`

**最终产物：**
- Windows: NSIS 安装包 (~150-250 MB)

## 🚀 快速开始（推荐 Tauri）

### 1. 安装前置依赖

```powershell
# 安装 Rust (Tauri 需要)
# 访问 https://www.rust-lang.org/tools/install

# 验证安装
rustc --version
cargo --version
```

### 2. 打包前端

```bash
cd frontend
npm install
npm run build
```

### 3. 打包后端

```bash
cd backend
pip install pyinstaller
pyinstaller --onefile --name backend run.py
```

### 4. 初始化 Tauri

```bash
cd frontend
npm install -D @tauri-apps/cli @tauri-apps/api
npm tauri init
```

### 5. 一键打包

```powershell
# 使用提供的脚本
powershell -ExecutionPolicy Bypass -File scripts/build-tauri.ps1
```

## 📦 各方案详细步骤

### Tauri 完整流程

查看 `docs/TAURI_PACKAGING_GUIDE.md`

**关键步骤：**
1. 安装 Rust 工具链
2. 初始化 Tauri 项目
3. 配置后端为 sidecar
4. 运行打包脚本

**时间估计：** 首次 2-3 小时，熟练后 30 分钟

### 纯 Python 完整流程

查看 `docs/PYTHON_STANDALONE_GUIDE.md`

**关键步骤：**
1. 修改后端嵌入前端静态文件
2. 创建 PyInstaller 配置
3. 运行打包脚本

**时间估计：** 首次 1-2 小时，熟练后 15 分钟

### Electron 完整流程

查看 `docs/ELECTRON_PACKAGING_GUIDE.md`

**关键步骤：**
1. 创建 Electron 项目结构
2. 配置主进程启动后端
3. 配置 electron-builder
4. 运行打包脚本

**时间估计：** 首次 3-4 小时，熟练后 45 分钟

## 💡 优化建议

### 减小体积

1. **移除未使用的依赖**
   ```bash
   # 分析依赖
   npm ls
   pip list
   
   # 移除不需要的包
   ```

2. **使用 UPX 压缩**
   ```bash
   # PyInstaller 自动支持
   pyinstaller --upx-dir=/path/to/upx ...
   ```

3. **精简 AI 模型**
   - 只打包必要的模型文件
   - 使用在线 API 而非本地模型

### 提升性能

1. **数据库优化**
   - 使用 SQLite 内存模式
   - 或直接移除数据库

2. **懒加载**
   - 延迟加载非关键模块
   - 分包加载前端资源

3. **多线程**
   - 后端使用异步 IO
   - 前端使用 Web Workers

## 🔧 常见问题

### 杀毒软件误报

**问题：** PyInstaller 打包的 exe 被报毒

**解决：**
1. 添加代码签名证书
2. 上传到 VirusTotal 建立信任
3. 提供源码让用户自行构建

### 打包后无法启动

**问题：** 双击 exe 没反应

**解决：**
1. 检查是否有隐藏的错误窗口
2. 从命令行启动查看错误
3. 检查 spec 文件中的 hiddenimports

### 体积过大

**问题：** 打包后超过预期大小

**解决：**
1. 使用 `--exclude-module` 排除不需要的包
2. 检查是否包含了测试文件
3. 使用 UPX 压缩

## 📚 相关资源

- [Tauri 官方文档](https://tauri.app/)
- [Electron 官方文档](https://www.electronjs.org/)
- [PyInstaller 文档](https://pyinstaller.org/)
- [electron-builder 文档](https://www.electron.build/)

## 🎉 总结

**我的推荐顺序：**

1. **Tauri** ⭐⭐⭐⭐⭐ - 现代、高效、体积小
2. **纯 Python** ⭐⭐⭐⭐ - 简单、快速、够用
3. **Electron** ⭐⭐⭐ - 稳定、功能全、体积大

**具体选择建议：**
- 🎯 **追求完美体验** → 选 Tauri
- 🚀 **快速上线** → 选纯 Python
- 🛡️ **求稳不折腾** → 选 Electron

每个方案都已经提供了完整的文档和脚本，按步骤操作即可！
