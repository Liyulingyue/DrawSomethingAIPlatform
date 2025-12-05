# 下载嵌入式 PostgreSQL 便携版脚本
# 用途：为 Tauri 打包准备嵌入式数据库

param(
    [string]$Version = "16.1-1",  # PostgreSQL 版本
    [string]$OutputDir = "..\backend\resources\postgres"
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "下载嵌入式 PostgreSQL" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 创建输出目录
$OutputPath = Join-Path $PSScriptRoot $OutputDir
if (-Not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Host "✅ 创建目录: $OutputPath" -ForegroundColor Green
}

# PostgreSQL 便携版下载链接
$PgVersion = "16.1-1"  # 使用稳定版本
$DownloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64-binaries.zip"
$ZipFile = Join-Path $OutputPath "postgresql.zip"
$ExtractPath = Join-Path $OutputPath "pgsql"

Write-Host "📦 下载地址: $DownloadUrl" -ForegroundColor Yellow
Write-Host ""

# 检查是否已下载
if (Test-Path $ExtractPath) {
    $choice = Read-Host "PostgreSQL 已存在，是否重新下载？(Y/N)"
    if ($choice -ne "Y" -and $choice -ne "y") {
        Write-Host "✅ 使用现有 PostgreSQL" -ForegroundColor Green
        exit 0
    }
    Remove-Item -Recurse -Force $ExtractPath
}

# 下载
Write-Host "⬇️  开始下载 PostgreSQL（约 200MB，请耐心等待）..." -ForegroundColor Yellow
try {
    # 使用国内镜像加速（如果官方下载慢）
    # $DownloadUrl = "https://mirrors.tuna.tsinghua.edu.cn/postgresql/binary/v$PgVersion/win32/postgresql-$PgVersion-windows-x64-binaries.zip"
    
    $ProgressPreference = 'SilentlyContinue'  # 加速下载
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipFile -UseBasicParsing
    $ProgressPreference = 'Continue'
    
    Write-Host "✅ 下载完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "手动下载方法:" -ForegroundColor Yellow
    Write-Host "1. 访问: https://www.enterprisedb.com/download-postgresql-binaries" -ForegroundColor White
    Write-Host "2. 下载 Windows x64 版本的 ZIP 包" -ForegroundColor White
    Write-Host "3. 解压到: $OutputPath" -ForegroundColor White
    exit 1
}

# 解压
Write-Host "📂 解压中..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ZipFile -DestinationPath $OutputPath -Force
    Write-Host "✅ 解压完成" -ForegroundColor Green
    
    # 删除 ZIP 文件节省空间
    Remove-Item $ZipFile -Force
} catch {
    Write-Host "❌ 解压失败: $_" -ForegroundColor Red
    exit 1
}

# 验证
$PgBin = Join-Path $ExtractPath "bin\postgres.exe"
if (Test-Path $PgBin) {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "✅ PostgreSQL 下载成功！" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "位置: $ExtractPath" -ForegroundColor Cyan
    
    # 获取版本
    $pgVersion = & $PgBin --version
    Write-Host "版本: $pgVersion" -ForegroundColor Cyan
} else {
    Write-Host "❌ 下载的文件不完整" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 后续步骤:" -ForegroundColor Yellow
Write-Host "1. 运行后端打包脚本" -ForegroundColor White
Write-Host "2. 运行 Tauri 打包脚本" -ForegroundColor White
Write-Host "3. 生成最终的 exe 文件" -ForegroundColor White
