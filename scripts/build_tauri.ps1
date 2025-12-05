# Tauri Build Script
param(
    [switch]$SkipPostgres,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$DevMode
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Tauri Desktop App Build Tool" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

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

# 只在不跳过前端时检查 Rust
if (-Not $SkipFrontend) {
    $rustVersion = rustc --version 2>$null
    if (-Not $rustVersion) {
        Write-Host "Rust not installed" -ForegroundColor Red
        Write-Host "Visit: https://www.rust-lang.org/tools/install" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Rust: $rustVersion" -ForegroundColor Green
}
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

# Build backend
if (-Not $SkipBackend) {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Building Backend" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    
    Push-Location (Join-Path $ProjectRoot "backend")
    
    # Check for virtual environment
    $venvPath = ".venv\Scripts\Activate.ps1"
    if (Test-Path $venvPath) {
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & $venvPath
    }
    
    $pyinstallerVersion = pyinstaller --version 2>$null
    if (-Not $pyinstallerVersion) {
        Write-Host "Installing PyInstaller..." -ForegroundColor Yellow
        pip install pyinstaller
        if ($LASTEXITCODE -ne 0) {
            Write-Host "PyInstaller installation failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
    
    if (Test-Path "dist") { Remove-Item -Recurse -Force dist }
    if (Test-Path "build") { Remove-Item -Recurse -Force build }
    
    Write-Host "Packaging backend..." -ForegroundColor Yellow
    pyinstaller --onefile --name backend --hidden-import uvicorn.logging --hidden-import uvicorn.loops --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols --hidden-import uvicorn.protocols.http --hidden-import uvicorn.protocols.http.auto --hidden-import uvicorn.protocols.websockets --hidden-import uvicorn.protocols.websockets.auto --hidden-import uvicorn.lifespan --hidden-import uvicorn.lifespan.on --hidden-import sqlalchemy.ext.declarative --add-data "alembic.ini;." --add-data "alembic;alembic" run_tauri.py
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend packaging failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "Backend packaging completed" -ForegroundColor Green
    Pop-Location
    Write-Host ""
}

# Copy backend to Tauri
Write-Host "Copying backend to Tauri..." -ForegroundColor Yellow
$backendExe = Join-Path $ProjectRoot "backend\dist\backend.exe"
$tauriSidecarDir = Join-Path $ProjectRoot "frontend\src-tauri\binaries"

if (-Not (Test-Path $backendExe)) {
    Write-Host "Backend exe not found: $backendExe" -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path $tauriSidecarDir)) {
    New-Item -ItemType Directory -Path $tauriSidecarDir -Force | Out-Null
}

# Copy backend with both naming conventions
Copy-Item $backendExe (Join-Path $tauriSidecarDir "backend.exe") -Force
Copy-Item $backendExe (Join-Path $tauriSidecarDir "backend-x86_64-pc-windows-msvc.exe") -Force
Write-Host "Backend copied to Tauri" -ForegroundColor Green
Write-Host ""

# Build Tauri
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Building Tauri" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Push-Location (Join-Path $ProjectRoot "frontend")

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
    Write-Host "Build Completed" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    
    $bundleDir = "src-tauri\target\release\bundle"
    if (Test-Path $bundleDir) {
        Write-Host "Generated files:" -ForegroundColor Cyan
        Get-ChildItem -Recurse $bundleDir -Include *.exe,*.msi | ForEach-Object {
            Write-Host "  - $($_.FullName)" -ForegroundColor White
        }
    }
}

Pop-Location

Write-Host ""
Write-Host "Done!" -ForegroundColor Green