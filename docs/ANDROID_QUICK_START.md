# 如何将 DrawSomething AI Platform 打包为 Android APK

## 🚀 两种打包方案

### 方案 1: Docker 方式 (推荐) ⭐

**优势**: 
- ✅ 无需安装 Android Studio
- ✅ 环境干净,不污染系统
- ✅ 完全自动化,一键完成
- ✅ 跨平台支持 (Windows/Mac/Linux)

#### 快速开始:

1. **安装 Docker Desktop**
   ```
   下载: https://www.docker.com/products/docker-desktop/
   ```

2. **一键构建 APK**
   ```powershell
   # 构建 Debug APK (测试用)
   .\scripts\docker-build-android.ps1
   
   # 构建 Release APK (发布用)
   .\scripts\docker-build-android.ps1 -Release
   ```

3. **获取 APK**
   ```
   位置: output/app-debug.apk
   直接传输到手机安装即可!
   ```

📖 **详细文档**: [DOCKER_ANDROID_BUILD.md](./DOCKER_ANDROID_BUILD.md)

---

### 方案 2: 传统方式 (需要 Android Studio)

**优势**: 
- ✅ 功能完整,适合深度定制
- ✅ 可以使用 Android Studio 调试
- ✅ 支持更多高级功能

#### 快速开始 (3 步):

**1️⃣ 安装 Android Studio**
```
下载: https://developer.android.com/studio
```

**2️⃣ 配置 Capacitor**
```powershell
.\scripts\setup-capacitor.ps1
```

此脚本会自动:
- 安装 Capacitor 和 Android 平台
- 初始化配置文件
- 构建前端资源
- 创建 Android 项目结构

**3️⃣ 构建 APK**

方式 A: 使用脚本 (推荐)
```powershell
# 构建 Debug APK
.\scripts\build-android.ps1

# 构建 Release APK
.\scripts\build-android.ps1 -Release

# 构建并安装到设备
.\scripts\build-android.ps1 -Install
```

方式 B: 使用 Android Studio
```powershell
# 打开 Android Studio
cd frontend
npx cap open android
```
然后: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`

📖 **详细文档**: [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)

## 配置说明

### 应用信息
- **应用名称**: DrawSomething AI
- **包名**: com.drawsomething.ai
- **入口页面**: /app/home

### 后端模式
`/app/*` 路由已配置为**纯前端模式**:
- ✅ 所有数据存储在 localStorage
- ✅ 不需要后端服务器
- ✅ 可离线使用

### APK 输出位置
- Debug: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `frontend/android/app/build/outputs/apk/release/app-release.apk`

## 更新 APK

每次修改代码后:
```powershell
.\scripts\build-android.ps1
```

## 常见问题

**Q: 构建失败?**
- 确保已安装 Android Studio 和 Java JDK
- 确保已设置 ANDROID_HOME 环境变量

**Q: APK 安装后白屏?**
- 检查是否运行了 `npm run build`
- 检查 `capacitor.config.ts` 中 `webDir: 'dist'`

**Q: 如何在真机上调试?**
- 查看完整文档: `docs/ANDROID_BUILD_GUIDE.md`

## 完整文档
详细步骤和高级配置请参考: [docs/ANDROID_BUILD_GUIDE.md](./docs/ANDROID_BUILD_GUIDE.md)
