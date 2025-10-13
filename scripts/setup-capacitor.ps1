# Capacitor 自动安装配置脚本
# 用于快速将项目配置为 Android APK 打包环境

Write-Host "🚀 开始配置 Capacitor for Android..." -ForegroundColor Green

# 检查是否在项目根目录
if (-not (Test-Path "frontend")) {
    Write-Host "❌ 请在项目根目录运行此脚本!" -ForegroundColor Red
    exit 1
}

# 进入 frontend 目录
Set-Location frontend

# 1. 安装 Capacitor 核心包
Write-Host "`n📦 安装 Capacitor 核心包..." -ForegroundColor Cyan
npm install @capacitor/core @capacitor/cli

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 安装失败!" -ForegroundColor Red
    exit 1
}

# 2. 检查是否已经初始化
if (Test-Path "capacitor.config.ts") {
    Write-Host "⚠️  Capacitor 已经初始化,跳过 init 步骤" -ForegroundColor Yellow
} else {
    Write-Host "`n🔧 初始化 Capacitor..." -ForegroundColor Cyan
    Write-Host "请按照提示输入:" -ForegroundColor Yellow
    Write-Host "  App name: DrawSomething AI" -ForegroundColor Gray
    Write-Host "  App ID: com.drawsomething.ai" -ForegroundColor Gray
    Write-Host "  Web asset directory: dist" -ForegroundColor Gray
    
    npx cap init
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 初始化失败!" -ForegroundColor Red
        exit 1
    }
}

# 3. 安装 Android 平台
Write-Host "`n📱 安装 Android 平台..." -ForegroundColor Cyan
npm install @capacitor/android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 安装失败!" -ForegroundColor Red
    exit 1
}

# 4. 添加 Android 项目
if (Test-Path "android") {
    Write-Host "⚠️  Android 项目已存在,跳过添加步骤" -ForegroundColor Yellow
} else {
    Write-Host "`n🏗️  添加 Android 项目..." -ForegroundColor Cyan
    npx cap add android
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 添加 Android 项目失败!" -ForegroundColor Red
        exit 1
    }
}

# 5. 创建或更新 capacitor.config.ts
Write-Host "`n⚙️  配置 Capacitor..." -ForegroundColor Cyan

$configContent = @"
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drawsomething.ai',
  appName: 'DrawSomething AI',
  webDir: 'dist',
  server: {
    // 生产模式:使用打包后的文件
    androidScheme: 'https'
  },
  android: {
    // 允许混合内容(HTTP + HTTPS)
    allowMixedContent: true,
  }
};

export default config;
"@

Set-Content -Path "capacitor.config.ts" -Value $configContent -Encoding UTF8
Write-Host "✅ 配置文件已更新" -ForegroundColor Green

# 6. 构建前端
Write-Host "`n🔨 构建前端资源..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败!" -ForegroundColor Red
    exit 1
}

# 7. 同步到 Android
Write-Host "`n🔄 同步到 Android 项目..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 同步失败!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Capacitor 配置完成!" -ForegroundColor Green
Write-Host "`n📋 后续步骤:" -ForegroundColor Yellow
Write-Host "  1. 安装 Android Studio: https://developer.android.com/studio" -ForegroundColor Gray
Write-Host "  2. 运行: npx cap open android" -ForegroundColor Gray
Write-Host "  3. 在 Android Studio 中构建 APK" -ForegroundColor Gray
Write-Host "`n📖 详细文档请查看: docs/ANDROID_BUILD_GUIDE.md" -ForegroundColor Cyan

Set-Location ..
