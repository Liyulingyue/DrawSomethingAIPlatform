# Tauri 桌面应用打包指南

## 🚀 第一步：安装 Rust（必需）

### 方式一：自动安装（推荐）

1. **下载 Rust 安装器**
   - 访问：https://www.rust-lang.org/tools/install
   - 或直接下载：https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe

2. **运行安装器**
   ```powershell
   # 下载后直接运行，按提示操作（全部默认即可）
   # 安装完成后重启终端
   ```

3. **验证安装**
   ```powershell
   rustc --version
   cargo --version
   ```

### 方式二：命令行安装

```powershell
# 使用 winget（Windows 11）
winget install Rustlang.Rust.MSVC

# 或使用 scoop
scoop install rust
```

## 📦 第二步：安装 Tauri 依赖

安装完 Rust 后，在**新终端**中运行：

```powershell
cd f:\PythonCodes\DrawSomethingAIPlatform\frontend

# 安装 Tauri CLI 和 API
npm install -D @tauri-apps/cli@^1.5
npm install @tauri-apps/api@^1.5
```

## ✅ 验证安装

```powershell
# 检查 Rust
rustc --version
cargo --version

# 检查 Tauri
npm run tauri -- --version
```

---

## 🎯 安装完成后

请告诉我 "Rust 已安装"，我会继续后续配置：
1. 初始化 Tauri 项目
2. 配置嵌入式 PostgreSQL
3. 创建打包脚本
4. 一键生成 exe

---

## ⏱️ 预计时间

- Rust 安装：5-10 分钟
- Tauri 依赖安装：2-3 分钟
- 后续配置：我会自动完成

---

## 🆘 遇到问题？

### 问题1: 安装器下载慢
**解决**: 使用国内镜像
```powershell
$env:RUSTUP_DIST_SERVER = "https://rsproxy.cn"
$env:RUSTUP_UPDATE_ROOT = "https://rsproxy.cn/rustup"
# 然后运行安装器
```

### 问题2: 安装后 rustc 命令找不到
**解决**: 重启终端或电脑

### 问题3: 需要 Visual Studio 构建工具
**解决**: 安装器会自动提示，按提示安装即可
