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

# Download PostgreSQL if needed
if (-Not $SkipPostgres) {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Checking PostgreSQL" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    
    $postgresDir = Join-Path $ProjectRoot "backend\resources\postgres"
    $pgVersion = "16.1-1"
    $downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-$pgVersion-windows-x64-binaries.zip"
    $zipFile = Join-Path $postgresDir "postgresql.zip"
    $extractPath = Join-Path $postgresDir "pgsql"
    
    if (-Not (Test-Path $extractPath)) {
        Write-Host "PostgreSQL not found. Creating directory..." -ForegroundColor Yellow
        if (-Not (Test-Path $postgresDir)) {
            New-Item -ItemType Directory -Path $postgresDir -Force | Out-Null
        }
        
        Write-Host "Download URL: $downloadUrl" -ForegroundColor Yellow
        Write-Host "Starting download (approx 200MB, please wait)..." -ForegroundColor Yellow
        
        try {
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
            $ProgressPreference = 'Continue'
            Write-Host "Download completed" -ForegroundColor Green
        } catch {
            Write-Host "Download failed: $_" -ForegroundColor Red
            Write-Host ""
            Write-Host "Manual download method:" -ForegroundColor Yellow
            Write-Host "1. Visit: https://www.enterprisedb.com/download-postgresql-binaries" -ForegroundColor White
            Write-Host "2. Download Windows x64 ZIP package" -ForegroundColor White
            Write-Host "3. Extract to: $postgresDir" -ForegroundColor White
            exit 1
        }
        
        Write-Host "Extracting..." -ForegroundColor Yellow
        try {
            Expand-Archive -Path $zipFile -DestinationPath $postgresDir -Force
            Write-Host "Extraction completed" -ForegroundColor Green
            Remove-Item $zipFile -Force
        } catch {
            Write-Host "Extraction failed: $_" -ForegroundColor Red
            exit 1
        }
        
        $pgBin = Join-Path $extractPath "bin\postgres.exe"
        if (-Not (Test-Path $pgBin)) {
            Write-Host "Downloaded file is incomplete" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "PostgreSQL downloaded successfully" -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL found at: $extractPath" -ForegroundColor Green
    }
    Write-Host ""
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
    
    # Check for Alembic configuration
    $alembicIni = Join-Path (Join-Path $ProjectRoot "backend") "alembic.ini"
    $alembicDir = Join-Path (Join-Path $ProjectRoot "backend") "alembic"
    if (-Not (Test-Path $alembicIni)) {
        Write-Host "Warning: alembic.ini not found" -ForegroundColor Yellow
    }
    if (-Not (Test-Path $alembicDir)) {
        Write-Host "Warning: alembic directory not found" -ForegroundColor Yellow
    }
    
    $postgresDir = Join-Path $ProjectRoot "backend\resources\postgres"
    $pyinstallerCmd = "pyinstaller --onefile --name backend --hidden-import uvicorn.logging --hidden-import uvicorn.loops --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols --hidden-import uvicorn.protocols.http --hidden-import uvicorn.protocols.http.auto --hidden-import uvicorn.protocols.websockets --hidden-import uvicorn.protocols.websockets.auto --hidden-import uvicorn.lifespan --hidden-import uvicorn.lifespan.on --hidden-import sqlalchemy.ext.declarative --add-data `"alembic.ini;.`" --add-data `"alembic;alembic`""
    
    if (Test-Path $postgresDir) {
        Write-Host "Adding PostgreSQL to package..." -ForegroundColor Yellow
        $pyinstallerCmd += " --add-data `"$postgresDir;resources/postgres`""
    }
    
    $pyinstallerCmd += " run_tauri.py"
    
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