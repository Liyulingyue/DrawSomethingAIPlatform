# 使用 Docker 构建 Android APK

本指南介绍如何在 Docker 容器中构建 Android APK,**无需本地安装 Android Studio**。

## 优势

✅ **无需本地配置**: 不需要安装 Android Studio、Java JDK、Android SDK  
✅ **环境统一**: Docker 容器保证构建环境一致  
✅ **跨平台**: Windows、Mac、Linux 都可以使用  
✅ **自动化**: 一键完成所有构建步骤  
✅ **隔离性**: 不污染本地环境  

## 前置要求

只需要安装 **Docker Desktop**:
- Windows: https://www.docker.com/products/docker-desktop/
- Mac: https://www.docker.com/products/docker-desktop/
- Linux: https://docs.docker.com/engine/install/

## 快速开始

### 方式 1: 使用 PowerShell 脚本 (推荐)

```powershell
# 构建 Debug APK
.\scripts\docker-build-android.ps1

# 构建 Release APK
.\scripts\docker-build-android.ps1 -Release

# 强制重新构建 Docker 镜像
.\scripts\docker-build-android.ps1 -Rebuild
```

### 方式 2: 使用 Docker Compose

```powershell
# 构建 Debug APK
docker-compose -f docker-compose.android.yml run --rm android-builder

# 构建 Release APK
docker-compose -f docker-compose.android.yml run --rm android-builder-release
```

### 方式 3: 使用原始 Docker 命令

```powershell
# 1. 构建 Docker 镜像
docker build -f Dockerfile.android -t drawsomething-android-builder .

# 2. 运行容器并构建 APK
docker run --rm -v ${PWD}/output:/output drawsomething-android-builder build-apk.sh debug

# 构建 Release APK
docker run --rm -v ${PWD}/output:/output drawsomething-android-builder build-apk.sh release
```

## 构建流程

脚本会自动执行以下步骤:

1. ✅ 检查 Docker 是否运行
2. ✅ 创建 Capacitor 配置文件 (如果不存在)
3. ✅ 构建 Docker 镜像 (包含 Android SDK、Node.js、Gradle)
4. ✅ 在容器中构建前端资源
5. ✅ 配置 Capacitor 和 Android 项目
6. ✅ 编译 Android APK
7. ✅ 导出 APK 到 `output/` 目录

## 输出位置

构建完成后,APK 文件会保存在:

```
output/
├── app-debug.apk      # Debug 版本
└── app-release.apk    # Release 版本
```

## 构建选项

### Debug APK (测试用)
```powershell
.\scripts\docker-build-android.ps1
```
- 适合开发测试
- 无需签名
- 可以直接安装

### Release APK (发布用)
```powershell
.\scripts\docker-build-android.ps1 -Release
```
- 适合正式发布
- 需要签名才能上传 Google Play
- 代码经过混淆和优化

### 重新构建镜像
```powershell
.\scripts\docker-build-android.ps1 -Rebuild
```
- 当修改了 Dockerfile 或依赖项时使用
- 清除缓存,从头构建镜像

## 安装 APK

### 方法 1: 直接传输
将 `output/app-debug.apk` 传输到手机,点击安装

### 方法 2: 使用 adb
```powershell
# 确保手机已连接并开启 USB 调试
adb install output/app-debug.apk
```

### 方法 3: 二维码分享
使用在线工具生成 APK 下载二维码,手机扫码安装

## 配置文件说明

### Dockerfile.android
定义 Android 构建环境:
- 基础镜像: `thyrlian/android-sdk`
- 包含: Android SDK、Node.js、Gradle
- 自动构建前端和 Android 项目

### docker-compose.android.yml
定义构建服务:
- `android-builder`: Debug APK 构建
- `android-builder-release`: Release APK 构建
- 自动挂载 `output/` 目录

### scripts/docker-build-apk.sh
容器内执行的构建脚本:
- 调用 Gradle 构建 APK
- 复制 APK 到输出目录
- 显示构建信息

## 常见问题

### Q: Docker 镜像构建很慢?
**A**: 
- 首次构建需要下载 Android SDK (约 1-2 GB)
- 后续构建会使用缓存,速度更快
- 可以在网络好的时候预先构建镜像

### Q: 构建失败,提示 "Docker 未运行"?
**A**: 
- 启动 Docker Desktop
- 等待 Docker 完全启动后再运行脚本

### Q: APK 安装后白屏?
**A**: 
- 检查 `frontend/capacitor.config.ts` 中 `webDir: 'dist'`
- 确保前端构建成功 (`npm run build`)
- 查看 Docker 构建日志是否有错误

### Q: 如何调试构建过程?
**A**: 
```powershell
# 进入容器查看
docker run -it --rm drawsomething-android-builder bash

# 查看日志
docker-compose -f docker-compose.android.yml logs
```

### Q: 构建的 APK 太大?
**A**: 
- 使用 Release 构建 (自动启用代码压缩)
- 修改 `android/app/build.gradle` 启用 ProGuard
- 只打包必要的 CPU 架构 (arm64-v8a, armeabi-v7a)

### Q: 如何清理 Docker 资源?
**A**: 
```powershell
# 停止并删除容器
docker-compose -f docker-compose.android.yml down

# 删除镜像
docker-compose -f docker-compose.android.yml down --rmi all

# 清理所有未使用的 Docker 资源
docker system prune -a
```

## 与传统方法对比

| 特性 | Docker 方式 | 传统方式 (Android Studio) |
|------|------------|--------------------------|
| 安装大小 | ~500 MB (Docker) | ~5 GB (Android Studio) |
| 配置难度 | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| 构建速度 | 快 (缓存后) | 中等 |
| 环境隔离 | ✅ 完全隔离 | ❌ 影响系统 |
| 跨平台 | ✅ 完全支持 | ⚠️ 平台差异 |
| 自动化 | ✅ 易于 CI/CD | ⚠️ 需额外配置 |
| 调试能力 | ⚠️ 受限 | ✅ 功能完整 |

## 高级配置

### 自定义 Android SDK 版本

编辑 `Dockerfile.android`:
```dockerfile
# 修改 Android SDK 版本
RUN sdkmanager "platforms;android-34" \
    "build-tools;34.0.0"
```

### 配置 Gradle 缓存

在 `docker-compose.android.yml` 中添加卷挂载:
```yaml
volumes:
  - ./output:/output
  - gradle-cache:/root/.gradle  # 缓存 Gradle 依赖
  
volumes:
  gradle-cache:
```

### 多架构 APK

修改 `frontend/android/app/build.gradle`:
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'
            universalApk true  // 生成通用 APK
        }
    }
}
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build APK with Docker
        run: |
          docker-compose -f docker-compose.android.yml run --rm android-builder
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: output/app-debug.apk
```

## 性能优化

### 1. 使用多阶段构建
减小最终镜像大小

### 2. 缓存 npm 依赖
```yaml
volumes:
  - npm-cache:/root/.npm
```

### 3. 并行构建
如果有多个变体,可以并行构建

## 相关文档

- [完整 APK 打包指南](./ANDROID_BUILD_GUIDE.md)
- [快速开始指南](../ANDROID_QUICK_START.md)
- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Docker 官方文档](https://docs.docker.com/)

## 技术支持

遇到问题?
1. 查看 [常见问题](#常见问题) 部分
2. 检查 Docker 日志: `docker-compose -f docker-compose.android.yml logs`
3. 查看完整构建日志,定位错误原因
