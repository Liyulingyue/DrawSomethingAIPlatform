# Tauri Build Script for SQLite
param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$DevMode
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Tauri Desktop App Build Tool (SQLite)" -ForegroundColor Cyan
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
    Write-Host "Building Backend (SQLite)" -ForegroundColor Cyan
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

    # Check for Alembic configuration
    $alembicIni = Join-Path (Join-Path $ProjectRoot "backend") "alembic.ini"
    $alembicDir = Join-Path (Join-Path $ProjectRoot "backend") "alembic"
    if (-Not (Test-Path $alembicIni)) {
        Write-Host "Warning: alembic.ini not found" -ForegroundColor Yellow
    }
    if (-Not (Test-Path $alembicDir)) {
        Write-Host "Warning: alembic directory not found" -ForegroundColor Yellow
    }

    # SQLite version - no PostgreSQL to include
    $pyinstallerCmd = "pyinstaller --onefile --icon icon.ico --name DrawSomethingBackend --hidden-import uvicorn.logging --hidden-import uvicorn.loops --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols --hidden-import uvicorn.protocols.http --hidden-import uvicorn.protocols.http.auto --hidden-import uvicorn.protocols.websockets --hidden-import uvicorn.protocols.websockets.auto --hidden-import uvicorn.lifespan --hidden-import uvicorn.lifespan.on --hidden-import sqlalchemy.ext.declarative --add-data `"alembic.ini;.`" --add-data `"alembic;alembic`" run_tauri_sqlite.py"

    Invoke-Expression $pyinstallerCmd

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
$backendExe = Join-Path $ProjectRoot "backend\dist\DrawSomethingBackend.exe"
$tauriSidecarDir = Join-Path $ProjectRoot "frontend\src-tauri\binaries"

if (-Not (Test-Path $backendExe)) {
    Write-Host "Backend exe not found: $backendExe" -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path $tauriSidecarDir)) {
    New-Item -ItemType Directory -Path $tauriSidecarDir -Force | Out-Null
}

# Copy backend with both naming conventions
Copy-Item $backendExe (Join-Path $tauriSidecarDir "DrawSomethingBackend.exe") -Force
Copy-Item $backendExe (Join-Path $tauriSidecarDir "DrawSomethingBackend-x86_64-pc-windows-msvc.exe") -Force
Write-Host "Backend copied to Tauri" -ForegroundColor Green
Write-Host ""

# Build Tauri
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Building Tauri" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Push-Location (Join-Path $ProjectRoot "frontend")

# Build Tauri
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Building Tauri" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Push-Location (Join-Path $ProjectRoot "frontend")

# Backup original config, use SQLite config, and restore after build
$configPath = "src-tauri/tauri.conf.json"
$sqliteConfigPath = "src-tauri/tauri_sqlite.conf.json"
$backupPath = "src-tauri/tauri.conf.json.backup"

# Backup original
if (Test-Path $configPath) {
    Copy-Item $configPath $backupPath -Force
}

# Use SQLite config
Write-Host "Using SQLite configuration..." -ForegroundColor Yellow
Copy-Item $sqliteConfigPath $configPath -Force

try {
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
        Write-Host "Build Completed (SQLite)" -ForegroundColor Green
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
} finally {
    # Always restore original config
    Write-Host "Restoring original configuration..." -ForegroundColor Yellow
    if (Test-Path $backupPath) {
        Move-Item $backupPath $configPath -Force
        Write-Host "Original tauri.conf.json restored" -ForegroundColor Green
    }
}

Pop-Location

Write-Host ""
Write-Host "Done! (SQLite version)" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "Done! (SQLite version)" -ForegroundColor Green