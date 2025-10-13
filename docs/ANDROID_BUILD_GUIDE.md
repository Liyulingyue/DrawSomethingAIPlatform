# Android APK 打包指南

本文档介绍如何将 DrawSomething AI Platform 打包为 Android APK。

## 方案对比

### 1. Capacitor (推荐) ⭐
- ✅ 与 Vite/React 完美集成
- ✅ 原生性能好
- ✅ 支持插件生态
- ✅ TypeScript 支持
- ⚠️ 需要 Android Studio

### 2. Cordova
- ✅ 成熟稳定
- ✅ 插件丰富
- ⚠️ 配置较复杂
- ⚠️ 与现代前端框架集成不如 Capacitor

### 3. React Native (重写)
- ✅ 真正的原生应用
- ❌ 需要完全重写前端代码

## 使用 Capacitor 打包 (推荐)

### 前置要求

1. **Node.js** (已安装)
2. **Android Studio** (下载: https://developer.android.com/studio)
3. **Java JDK 11+**
4. **Android SDK** (通过 Android Studio 安装)

### 步骤 1: 安装 Capacitor

```powershell
cd frontend

# 安装 Capacitor 核心包
npm install @capacitor/core @capacitor/cli

# 初始化 Capacitor
npx cap init

# 提示时输入:
# App name: DrawSomething AI
# App ID: com.drawsomething.ai
# Web asset directory: dist
```

### 步骤 2: 添加 Android 平台

```powershell
# 安装 Android 平台
npm install @capacitor/android

# 添加 Android 项目
npx cap add android
```

### 步骤 3: 配置应用

编辑 `frontend/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drawsomething.ai',
  appName: 'DrawSomething AI',
  webDir: 'dist',
  server: {
    // 开发模式:使用本地服务器
    // url: 'http://192.168.1.100:5173',
    // cleartext: true,
    
    // 生产模式:使用打包后的文件
    androidScheme: 'https'
  },
  android: {
    // 允许混合内容(HTTP + HTTPS)
    allowMixedContent: true,
  }
};

export default config;
```

### 步骤 4: 修改前端路由配置

由于 Android 应用需要以 `/app/home` 为入口,修改路由:

编辑 `frontend/src/App.tsx`:

```typescript
// 在 App 组件中添加重定向逻辑
function App() {
  return (
    <AntApp>
      <UserProvider>
        <Router>
          <div className="app-shell">
            <Routes>
              {/* Android APK 默认入口 */}
              <Route path="/" element={<Navigate to="/app/home" replace />} />
              <Route path="/app/home" element={<AppHome />} />
              {/* ... 其他路由 */}
            </Routes>
          </div>
        </Router>
      </UserProvider>
    </AntApp>
  )
}
```

### 步骤 5: 构建前端资源

```powershell
# 构建生产版本
npm run build

# 同步到 Android 项目
npx cap sync android
```

### 步骤 6: 配置后端 API

有两种方式处理后端:

#### 方式 A: 纯前端模式 (推荐用于 /app 路由)

所有 `/app/*` 路由已经配置为纯前端模式,数据存储在 localStorage,无需后端。

#### 方式 B: 连接远程后端服务器

如果需要后端功能(如多人游戏),修改 `frontend/src/utils/api.ts`:

```typescript
// 将 baseURL 改为你的服务器地址
const api = axios.create({
  baseURL: 'https://your-backend-server.com', // 修改为实际的服务器地址
  timeout: 15000,
  withCredentials: true,
})
```

#### 方式 C: 在 Android 应用内嵌入 Python 后端 (高级)

使用 Chaquopy 插件在 Android 中运行 Python:
- 复杂度高
- APK 体积大 (50MB+)
- 不推荐新手使用

### 步骤 7: 在 Android Studio 中打开项目

```powershell
# 用 Android Studio 打开
npx cap open android
```

### 步骤 8: 构建 APK

在 Android Studio 中:

1. **选择菜单**: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`

2. **配置签名** (首次需要):
   - `Build` → `Generate Signed Bundle / APK`
   - 选择 `APK`
   - 创建新的 keystore 或使用已有的
   - 填写密钥信息

3. **构建类型**:
   - **Debug APK**: 用于测试,无需签名
   - **Release APK**: 用于发布,需要签名

4. **生成位置**:
   - Debug: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `frontend/android/app/build/outputs/apk/release/app-release.apk`

### 步骤 9: 安装到手机

```powershell
# 通过 adb 安装 (需开启 USB 调试)
adb install frontend/android/app/build/outputs/apk/debug/app-debug.apk

# 或者直接将 APK 文件传到手机安装
```

## 开发调试

### 在真机上调试

1. 启动前端开发服务器:
```powershell
cd frontend
npm run dev
```

2. 修改 `capacitor.config.ts` 启用开发模式:
```typescript
server: {
  url: 'http://你的电脑IP:5173', // 例如: http://192.168.1.100:5173
  cleartext: true,
}
```

3. 同步并运行:
```powershell
npx cap sync
npx cap run android
```

### 查看日志

```powershell
# Android 日志
adb logcat

# 或在 Chrome 中打开
chrome://inspect/#devices
```

## 优化建议

### 1. 减小 APK 体积

编辑 `frontend/android/app/build.gradle`:

```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    // 只打包需要的架构
    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a'
            universalApk false
        }
    }
}
```

### 2. 配置应用图标和启动屏

```powershell
# 安装 Capacitor 资源生成器
npm install -g @capacitor/assets

# 准备图标和启动屏
# - icon.png (1024x1024)
# - splash.png (2732x2732)

# 生成资源
npx capacitor-assets generate
```

### 3. 添加权限

编辑 `frontend/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- 存储权限 (如果需要保存图片) -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
</manifest>
```

### 4. 配置应用名称和版本

编辑 `frontend/android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.drawsomething.ai"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

## 常见问题

### Q1: APK 安装后白屏?
**A**: 检查 `webDir` 配置是否正确,确保 `npm run build` 生成了 `dist` 目录。

### Q2: 无法连接后端?
**A**: 检查:
1. `/app/*` 路由应该使用纯前端模式,不需要后端
2. 如果需要后端,确保服务器使用 HTTPS (Android 默认不允许 HTTP)
3. 或在 `capacitor.config.ts` 中设置 `allowMixedContent: true`

### Q3: 如何更新 APK?
**A**: 
```powershell
npm run build
npx cap sync android
# 然后在 Android Studio 中重新构建
```

### Q4: 真机调试看不到日志?
**A**: 在 Chrome 浏览器中打开 `chrome://inspect/#devices`,可以看到 WebView 的控制台输出。

## 自动化构建脚本

创建 `scripts/build-android.ps1`:

```powershell
# Android APK 自动构建脚本

Write-Host "🚀 开始构建 Android APK..." -ForegroundColor Green

# 1. 构建前端
Write-Host "📦 构建前端资源..." -ForegroundColor Cyan
cd frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败!" -ForegroundColor Red
    exit 1
}

# 2. 同步到 Android
Write-Host "🔄 同步到 Android 项目..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 同步失败!" -ForegroundColor Red
    exit 1
}

# 3. 构建 APK
Write-Host "🏗️ 构建 APK (需要 Android Studio 已安装)..." -ForegroundColor Cyan
cd android
./gradlew assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ APK 构建失败!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ APK 构建成功!" -ForegroundColor Green
Write-Host "📍 APK 位置: frontend/android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Yellow
```

## 发布到 Google Play

1. 生成签名的 Release APK
2. 在 Google Play Console 创建应用
3. 上传 APK 或 AAB (Android App Bundle)
4. 填写应用信息、截图等
5. 提交审核

## 参考链接

- Capacitor 官方文档: https://capacitorjs.com/docs
- Android Studio 下载: https://developer.android.com/studio
- Capacitor Android 指南: https://capacitorjs.com/docs/android
