# Docker APK 构建脚本 (PowerShell)
# 使用 Docker 容器构建 Android APK,无需本地安装 Android Studio

param(
    [switch]$Release,
    [switch]$Rebuild
)

Write-Host "🐳 使用 Docker 构建 Android APK..." -ForegroundColor Green

# 检查是否在项目根目录
if (-not (Test-Path "frontend")) {
    Write-Host "❌ 请在项目根目录运行此脚本!" -ForegroundColor Red
    exit 1
}

# 检查 Docker 是否运行
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker 未运行"
    }
} catch {
    Write-Host "❌ Docker 未运行或未安装!" -ForegroundColor Red
    Write-Host "请先启动 Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# 创建输出目录
$outputDir = "output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# 确保 Capacitor 已配置
if (-not (Test-Path "frontend/capacitor.config.ts")) {
    Write-Host "📝 检测到未配置 Capacitor,正在创建配置文件..." -ForegroundColor Yellow
    
    $configContent = @"
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drawsomething.ai',
  appName: 'DrawSomething AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
"@
    
    Set-Content -Path "frontend/capacitor.config.ts" -Value $configContent -Encoding UTF8
    Write-Host "✅ Capacitor 配置文件已创建" -ForegroundColor Green
}

# 构建 Docker 镜像
if ($Rebuild) {
    Write-Host "`n🏗️  重新构建 Docker 镜像..." -ForegroundColor Cyan
    docker-compose -f docker-compose.android.yml build --no-cache
} else {
    Write-Host "`n🏗️  构建 Docker 镜像 (如已存在则跳过)..." -ForegroundColor Cyan
    docker-compose -f docker-compose.android.yml build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 镜像构建失败!" -ForegroundColor Red
    exit 1
}

# 运行构建容器
if ($Release) {
    Write-Host "`n📦 构建 Release APK..." -ForegroundColor Cyan
    docker-compose -f docker-compose.android.yml run --rm android-builder-release
    $apkName = "app-release.apk"
} else {
    Write-Host "`n📦 构建 Debug APK..." -ForegroundColor Cyan
    docker-compose -f docker-compose.android.yml run --rm android-builder
    $apkName = "app-debug.apk"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ APK 构建失败!" -ForegroundColor Red
    exit 1
}

# 检查输出文件
$apkPath = Join-Path $outputDir $apkName
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    $apkSize = [math]::Round($apkSize, 2)
    
    Write-Host "`n✅ APK 构建成功!" -ForegroundColor Green
    Write-Host "📍 位置: $apkPath" -ForegroundColor Yellow
    Write-Host "📊 大小: $apkSize MB" -ForegroundColor Yellow
    
    # 显示安装提示
    Write-Host "`n📱 安装方法:" -ForegroundColor Cyan
    Write-Host "  1. 直接传输 APK 到手机安装" -ForegroundColor Gray
    Write-Host "  2. 或使用 adb: adb install $apkPath" -ForegroundColor Gray
} else {
    Write-Host "❌ 未找到生成的 APK 文件!" -ForegroundColor Red
    exit 1
}

Write-Host "`n💡 提示:" -ForegroundColor Cyan
Write-Host "  - 构建 Release APK: .\scripts\docker-build-android.ps1 -Release" -ForegroundColor Gray
Write-Host "  - 强制重新构建: .\scripts\docker-build-android.ps1 -Rebuild" -ForegroundColor Gray
Write-Host "  - 清理 Docker 资源: docker-compose -f docker-compose.android.yml down --rmi all" -ForegroundColor Gray
