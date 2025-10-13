# Android APK 打包 - 快速选择指南

## 📱 我应该选择哪种方式?

### 🐳 选择 Docker 方式,如果你:
- ✅ 只想快速生成 APK,不关心 Android 开发细节
- ✅ 不想安装庞大的 Android Studio (~5GB)
- ✅ 需要在 CI/CD 中自动化构建
- ✅ 想要干净的开发环境

👉 **开始使用**: 
```powershell
.\scripts\docker-build-android.ps1
```
📖 **文档**: [docs/DOCKER_ANDROID_BUILD.md](./docs/DOCKER_ANDROID_BUILD.md)

---

### 🛠️ 选择传统方式,如果你:
- ✅ 需要深度定制 Android 应用
- ✅ 需要使用 Android Studio 的调试功能
- ✅ 需要添加原生 Android 代码或插件
- ✅ 已经熟悉 Android 开发

👉 **开始使用**: 
```powershell
.\scripts\setup-capacitor.ps1
.\scripts\build-android.ps1
```
📖 **文档**: [docs/ANDROID_BUILD_GUIDE.md](./docs/ANDROID_BUILD_GUIDE.md)

---

## 🎯 快速对比

| 特性 | Docker 方式 | 传统方式 |
|------|------------|----------|
| **安装大小** | ~500 MB | ~5 GB |
| **配置难度** | ⭐ 极简 | ⭐⭐⭐ 复杂 |
| **构建速度** | 🚀 快 | 🐢 中等 |
| **环境隔离** | ✅ 完全隔离 | ❌ 影响系统 |
| **调试能力** | ⚠️ 基本 | ✅ 完整 |
| **自动化** | ✅ 易于 CI/CD | ⚠️ 需配置 |
| **适合人群** | 所有用户 | Android 开发者 |

---

## 📚 完整文档

1. **[快速开始](./docs/ANDROID_QUICK_START.md)** - 两种方式的快速开始指南
2. **[Docker 构建](./docs/DOCKER_ANDROID_BUILD.md)** - 使用 Docker 的详细教程
3. **[传统构建](./docs/ANDROID_BUILD_GUIDE.md)** - 使用 Android Studio 的完整指南

---

## 🚀 立即开始

### Docker 方式 (推荐):
```powershell
# 1. 确保 Docker Desktop 已运行
# 2. 执行构建命令
.\scripts\docker-build-android.ps1

# 3. 获取 APK
# 位置: output/app-debug.apk
```

### 传统方式:
```powershell
# 1. 安装 Android Studio
# 2. 配置环境
.\scripts\setup-capacitor.ps1

# 3. 构建 APK
.\scripts\build-android.ps1
```

---

## 💡 常见问题

**Q: 首次构建需要多长时间?**
- Docker: 10-15 分钟 (下载镜像和依赖)
- 传统: 20-30 分钟 (下载 Android Studio 和 SDK)

**Q: 后续构建需要多长时间?**
- Docker: 3-5 分钟 (有缓存)
- 传统: 2-3 分钟

**Q: 生成的 APK 有区别吗?**
- 没有!两种方式生成的 APK 完全相同

**Q: 可以同时使用两种方式吗?**
- 可以!它们互不干扰

---

## 🎓 推荐学习路径

1. **新手用户**: 先用 Docker 方式快速生成 APK,熟悉流程
2. **进阶用户**: 学习传统方式,了解 Android 开发细节
3. **开发团队**: 本地用传统方式开发,CI/CD 用 Docker 方式构建

---

## 📦 项目配置

- **应用名称**: DrawSomething AI
- **包名**: com.drawsomething.ai
- **入口页面**: /app/home
- **运行模式**: 纯前端 (无需后端服务器)

---

## 🔧 可用脚本

```powershell
# Docker 方式
.\scripts\docker-build-android.ps1          # 构建 Debug APK
.\scripts\docker-build-android.ps1 -Release # 构建 Release APK
.\scripts\docker-build-android.ps1 -Rebuild # 重新构建镜像

# 传统方式
.\scripts\setup-capacitor.ps1               # 首次配置
.\scripts\build-android.ps1                 # 构建 Debug APK
.\scripts\build-android.ps1 -Release        # 构建 Release APK
.\scripts\build-android.ps1 -Install        # 构建并安装
```

---

## 🤝 需要帮助?

查看详细文档:
- [docs/DOCKER_ANDROID_BUILD.md](./docs/DOCKER_ANDROID_BUILD.md) - Docker 方式完整指南
- [docs/ANDROID_BUILD_GUIDE.md](./docs/ANDROID_BUILD_GUIDE.md) - 传统方式完整指南
- [docs/ANDROID_QUICK_START.md](./docs/ANDROID_QUICK_START.md) - 快速开始总览
