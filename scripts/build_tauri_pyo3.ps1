# Tauri Build Script for PyO3
param(
    [switch]$SkipFrontend,
    [switch]$DevMode
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Tauri Desktop App Build Tool (PyO3)" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

# 设置 Ctrl+C 处理器以确保恢复原始文件
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host "`nCaught exit signal, cleaning up..." -ForegroundColor Yellow
    # 恢复将在 finally 块中进行
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if (-Not $nodeVersion) {
    Write-Host "Node.js not installed" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

$pythonVersion = python --version 2>$null
if (-Not $pythonVersion) {
    Write-Host "Python not installed" -ForegroundColor Red
    exit 1
}
Write-Host "Python: $pythonVersion" -ForegroundColor Green

# Check Rust
$rustVersion = rustc --version 2>$null
if (-Not $rustVersion) {
    Write-Host "Rust not installed" -ForegroundColor Red
    Write-Host "Visit: https://www.rust-lang.org/tools/install" -ForegroundColor Yellow
    exit 1
}
Write-Host "Rust: $rustVersion" -ForegroundColor Green

# Check Python development headers
Write-Host "Checking Python development headers..." -ForegroundColor Yellow
$pythonConfig = python -c "import sys; print(sys.version_info[:2])" 2>$null
if (-Not $pythonConfig) {
    Write-Host "Python development headers not found" -ForegroundColor Red
    Write-Host "Install Python with development headers or use: pip install pyo3" -ForegroundColor Yellow
    exit 1
}
Write-Host "Python development headers available" -ForegroundColor Green
Write-Host ""

# Build frontend
if (-Not $SkipFrontend) {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Building Frontend" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""

    Push-Location (Join-Path $ProjectRoot "frontend")

    if (-Not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }

    Write-Host "Building..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Write-Host "Frontend build completed" -ForegroundColor Green
    Pop-Location
    Write-Host ""
}

# Setup PyO3 configuration
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Setting up PyO3 configuration" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Push-Location (Join-Path $ProjectRoot "frontend\src-tauri")

# Backup original files
$cargoToml = "Cargo.toml"
$mainRs = "src\main.rs"
$tauriConf = "tauri.conf.json"

$backupCargoToml = "Cargo.toml.backup"
$backupMainRs = "src\main.rs.backup"
$backupTauriConf = "tauri.conf.json.backup"

# 创建 try-finally 块确保恢复
try {
    Write-Host "Backing up original files..." -ForegroundColor Yellow
    if (Test-Path $cargoToml) { Copy-Item $cargoToml $backupCargoToml -Force }
    if (Test-Path $mainRs) { Copy-Item $mainRs $backupMainRs -Force }
    if (Test-Path $tauriConf) { Copy-Item $tauriConf $backupTauriConf -Force }

    # Use PyO3 versions
    Write-Host "Using PyO3 configuration..." -ForegroundColor Yellow
    Copy-Item "Cargo_pyo3.toml" $cargoToml -Force
    Copy-Item "src\main_pyo3.rs" $mainRs -Force
    Copy-Item "tauri_pyo3.conf.json" $tauriConf -Force

    # Verify the copied config
    try {
        $configContent = Get-Content $tauriConf -Raw -Encoding UTF8
        $configJson = ConvertFrom-Json $configContent
        Write-Host "Configuration file validated successfully" -ForegroundColor Green
    } catch {
        Write-Host "Configuration file validation failed: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    # Build Tauri with PyO3
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Building Tauri (PyO3)" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""

    if ($DevMode) {
        Write-Host "Dev mode: Starting Tauri Dev..." -ForegroundColor Yellow
        npm run tauri:dev
    } else {
        Write-Host "Production mode: Building Tauri..." -ForegroundColor Yellow
        npm run tauri:build

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Tauri build failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }

        Write-Host ""
        Write-Host "===================================" -ForegroundColor Green
        Write-Host "Build Completed (PyO3)" -ForegroundColor Green
        Write-Host "===================================" -ForegroundColor Green
        Write-Host ""

        $bundleDir = "target\release\bundle"
        if (Test-Path $bundleDir) {
            Write-Host "Generated files:" -ForegroundColor Cyan
            Get-ChildItem -Recurse $bundleDir -Include *.exe,*.msi | ForEach-Object {
                Write-Host "  - $($_.FullName)" -ForegroundColor White
            }
        }
    }
} finally {
    # 始终恢复原始文件，即使出错
    Write-Host "Restoring original files..." -ForegroundColor Yellow
    if (Test-Path $backupCargoToml) { 
        Copy-Item $backupCargoToml $cargoToml -Force
        Remove-Item $backupCargoToml -Force
    }
    if (Test-Path $backupMainRs) { 
        Copy-Item $backupMainRs $mainRs -Force
        Remove-Item $backupMainRs -Force
    }
    if (Test-Path $backupTauriConf) { 
        Copy-Item $backupTauriConf $tauriConf -Force
        Remove-Item $backupTauriConf -Force
    }
    Write-Host "Original files restored" -ForegroundColor Green
    Pop-Location
}

Write-Host ""
Write-Host "Done! (PyO3 version)" -ForegroundColor Green