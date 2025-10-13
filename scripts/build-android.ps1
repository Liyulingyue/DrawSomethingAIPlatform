# Android APK 快速构建脚本
# 构建前端并生成 Debug APK

param(
    [switch]$Release,
    [switch]$Install
)

Write-Host "🚀 开始构建 Android APK..." -ForegroundColor Green

# 检查是否在项目根目录
if (-not (Test-Path "frontend")) {
    Write-Host "❌ 请在项目根目录运行此脚本!" -ForegroundColor Red
    exit 1
}

# 检查是否已配置 Capacitor
if (-not (Test-Path "frontend/android")) {
    Write-Host "❌ 尚未配置 Capacitor!" -ForegroundColor Red
    Write-Host "请先运行: .\scripts\setup-capacitor.ps1" -ForegroundColor Yellow
    exit 1
}

# 1. 构建前端
Write-Host "`n📦 构建前端资源..." -ForegroundColor Cyan
Set-Location frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 2. 同步到 Android
Write-Host "`n🔄 同步到 Android 项目..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 同步失败!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 3. 构建 APK
Set-Location android

if ($Release) {
    Write-Host "`n🏗️  构建 Release APK..." -ForegroundColor Cyan
    .\gradlew assembleRelease
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    $apkType = "Release"
} else {
    Write-Host "`n🏗️  构建 Debug APK..." -ForegroundColor Cyan
    .\gradlew assembleDebug
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    $apkType = "Debug"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ APK 构建失败!" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

Set-Location ..\..

# 4. 检查 APK 是否生成
$fullApkPath = "frontend\android\$apkPath"
if (-not (Test-Path $fullApkPath)) {
    Write-Host "❌ APK 文件未找到!" -ForegroundColor Red
    exit 1
}

# 获取 APK 信息
$apkSize = (Get-Item $fullApkPath).Length / 1MB
$apkSize = [math]::Round($apkSize, 2)

Write-Host "`n✅ APK 构建成功!" -ForegroundColor Green
Write-Host "📍 类型: $apkType APK" -ForegroundColor Yellow
Write-Host "📍 位置: $fullApkPath" -ForegroundColor Yellow
Write-Host "📍 大小: $apkSize MB" -ForegroundColor Yellow

# 5. 安装到设备 (可选)
if ($Install) {
    Write-Host "`n📲 安装到设备..." -ForegroundColor Cyan
    
    # 检查是否有连接的设备
    $devices = adb devices
    if ($devices -match "device$") {
        adb install -r $fullApkPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 安装成功!" -ForegroundColor Green
        } else {
            Write-Host "❌ 安装失败!" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  未检测到连接的设备!" -ForegroundColor Yellow
        Write-Host "请通过 USB 连接设备并开启 USB 调试" -ForegroundColor Gray
    }
}

Write-Host "`n📖 提示:" -ForegroundColor Cyan
Write-Host "  - 直接传输 APK 到手机安装" -ForegroundColor Gray
Write-Host "  - 或使用 adb install: adb install $fullApkPath" -ForegroundColor Gray
Write-Host "  - 构建 Release APK: .\scripts\build-android.ps1 -Release" -ForegroundColor Gray
Write-Host "  - 构建并安装: .\scripts\build-android.ps1 -Install" -ForegroundColor Gray
