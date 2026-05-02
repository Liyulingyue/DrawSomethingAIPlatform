# Tauri Build Script for SQLite with Shutdown
# Supports two output formats: installer and portable

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$DevMode,
    [switch]$Portable
)

$BuildMode = if ($Portable) { "Portable" } else { "Installer" }

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Tauri Desktop App Build Tool" -ForegroundColor Cyan
Write-Host "Database: SQLite | Mode: $BuildMode" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

function Ensure-FrontendDist {
    param(
        [string]$FrontendPath
    )

    $distIndexPath = Join-Path $FrontendPath "dist\index.html"
    if (Test-Path $distIndexPath) {
        Write-Host "Frontend dist check passed: $distIndexPath" -ForegroundColor Green
        return
    }

    Write-Host "Frontend dist missing, rebuilding frontend..." -ForegroundColor Yellow
    Push-Location $FrontendPath
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Frontend rebuild failed" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }

    if (-Not (Test-Path $distIndexPath)) {
        Write-Host "Build completed but dist/index.html still missing: $distIndexPath" -ForegroundColor Red
        exit 1
    }

    Write-Host "Frontend dist rebuilt successfully" -ForegroundColor Green
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

if (-Not $SkipFrontend) {
    $rustVersion = rustc --version 2>$null
    if (-Not $rustVersion) {
        Write-Host "Rust not installed" -ForegroundColor Red
        Write-Host "Visit: https://www.rust-lang.org/tools/install" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Rust: $rustVersion" -ForegroundColor Green
}

# Always verify dist before Tauri build to avoid runtime "cannot open webpage" issues
Ensure-FrontendDist -FrontendPath (Join-Path $ProjectRoot "frontend")
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

# Prepare files
$backendExe = Join-Path $ProjectRoot "backend\dist\DrawSomethingBackend.exe"
$llamaServerExe = Join-Path $ProjectRoot "cpp_model_services\llama-server.exe"
$modelsSourceDir = Join-Path $ProjectRoot "cpp_model_services\models\Qwen3VL-2B-Instruct"

if (-Not (Test-Path $backendExe)) {
    Write-Host "Backend exe not found: $backendExe" -ForegroundColor Red
    exit 1
}

# ========== 便携版构建 ==========
if ($Portable) {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Building Portable Version" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""

    $OutputDir = Join-Path $ProjectRoot "dist-portable"
    if (Test-Path $OutputDir) {
        Remove-Item -Recurse -Force $OutputDir
    }
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

    # Copy backend
    Copy-Item $backendExe $OutputDir -Force
    Write-Host "Copied: DrawSomethingBackend.exe" -ForegroundColor Green

    # Copy llama-server
    if (Test-Path $llamaServerExe) {
        Copy-Item $llamaServerExe $OutputDir -Force
        Write-Host "Copied: llama-server.exe" -ForegroundColor Green
    } else {
        Write-Host "Warning: llama-server.exe not found" -ForegroundColor Yellow
    }

    # Copy models
    if (Test-Path $modelsSourceDir) {
        $modelsTargetDir = Join-Path $OutputDir "models\Qwen3VL-2B-Instruct"
        New-Item -ItemType Directory -Path $modelsTargetDir -Force | Out-Null
        Copy-Item "$modelsSourceDir\*.gguf" $modelsTargetDir -Force
        Write-Host "Copied: model files" -ForegroundColor Green
    } else {
        Write-Host "Warning: Model files not found" -ForegroundColor Yellow
    }

    # Build Tauri exe
    Write-Host ""
    Write-Host "Building Tauri executable..." -ForegroundColor Yellow

    Push-Location (Join-Path $ProjectRoot "frontend")

    # Use SQLite shutdown config
    $configPath = "src-tauri/tauri.conf.json"
    $sqliteShutdownConfigPath = "src-tauri/tauri_sqlite_shutdown.conf.json"
    $backupPath = "src-tauri/tauri.conf.json.backup"

    if (Test-Path $configPath) {
        Copy-Item $configPath $backupPath -Force
    }
    Copy-Item $sqliteShutdownConfigPath $configPath -Force

    # Use shutdown main.rs
    $mainRsPath = "src-tauri\src\main.rs"
    $shutdownRsPath = "src-tauri\src\main_sqlite_shutdown.rs"
    $mainBackupPath = "src-tauri\src\main.rs.backup"

    if (Test-Path $mainRsPath) {
        Copy-Item $mainRsPath $mainBackupPath -Force
    }
    Copy-Item $shutdownRsPath $mainRsPath -Force

    # Copy sidecar binaries
    $sidecarDir = "src-tauri\binaries"
    if (-Not (Test-Path $sidecarDir)) {
        New-Item -ItemType Directory -Path $sidecarDir -Force | Out-Null
    }
    Copy-Item $backendExe $sidecarDir -Force
    Copy-Item $backendExe (Join-Path $sidecarDir "DrawSomethingBackend-x86_64-pc-windows-msvc.exe") -Force
    if (Test-Path $llamaServerExe) {
        Copy-Item $llamaServerExe $sidecarDir -Force
        Copy-Item $llamaServerExe (Join-Path $sidecarDir "llama-server-x86_64-pc-windows-msvc.exe") -Force
    }

    # Copy models to src-tauri
    $tauriModelsDir = "src-tauri\models\Qwen3VL-2B-Instruct"
    if (-Not (Test-Path $tauriModelsDir)) {
        New-Item -ItemType Directory -Path $tauriModelsDir -Force | Out-Null
    }
    if (Test-Path $modelsSourceDir) {
        Copy-Item "$modelsSourceDir\*.gguf" $tauriModelsDir -Force
    }

    try {
        # Ensure Tauri binary embeds latest frontend dist assets instead of cached build artifacts
        cargo clean --manifest-path src-tauri/Cargo.toml

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Cargo clean failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }

        # Build release exe with custom-protocol, otherwise app may fallback to devPath (localhost)
        cargo build --release --features custom-protocol --manifest-path src-tauri/Cargo.toml

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }

        # Copy the exe
        $tauriExe = "src-tauri\target\release\DrawSomething AI.exe"
        if (Test-Path $tauriExe) {
            Copy-Item $tauriExe $OutputDir -Force
        } else {
            $tauriExe2 = "src-tauri\target\release\app.exe"
            if (Test-Path $tauriExe2) {
                Copy-Item $tauriExe2 (Join-Path $OutputDir "DrawSomething AI.exe") -Force
            }
        }
        Write-Host "Copied: DrawSomething AI.exe" -ForegroundColor Green

    } finally {
        # Restore original files
        Write-Host "Restoring original configuration..." -ForegroundColor Yellow
        if (Test-Path $backupPath) {
            Move-Item $backupPath $configPath -Force
        }
        if (Test-Path $mainBackupPath) {
            Move-Item $mainBackupPath $mainRsPath -Force
        }
    }

    Pop-Location

    Write-Host ""
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "Portable Build Completed!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output: $OutputDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Contents:" -ForegroundColor Cyan
    Get-ChildItem $OutputDir -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  $($_.Name) ($size MB)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Usage: Copy 'dist-portable' folder and run 'DrawSomething AI.exe'" -ForegroundColor Yellow
}

# ========== 安装包构建 ==========
else {
    # Copy backend to Tauri
    Write-Host "Copying backend to Tauri..." -ForegroundColor Yellow
    $tauriSidecarDir = Join-Path $ProjectRoot "frontend\src-tauri\binaries"

    if (-Not (Test-Path $tauriSidecarDir)) {
        New-Item -ItemType Directory -Path $tauriSidecarDir -Force | Out-Null
    }

    Copy-Item $backendExe (Join-Path $tauriSidecarDir "DrawSomethingBackend.exe") -Force
    Copy-Item $backendExe (Join-Path $tauriSidecarDir "DrawSomethingBackend-x86_64-pc-windows-msvc.exe") -Force
    Write-Host "Backend copied to Tauri" -ForegroundColor Green

    # Copy llama-server to Tauri
    Write-Host "Copying llama-server to Tauri..." -ForegroundColor Yellow

    if (Test-Path $llamaServerExe) {
        Copy-Item $llamaServerExe (Join-Path $tauriSidecarDir "llama-server.exe") -Force
        Copy-Item $llamaServerExe (Join-Path $tauriSidecarDir "llama-server-x86_64-pc-windows-msvc.exe") -Force
        Write-Host "llama-server copied to Tauri" -ForegroundColor Green
    } else {
        Write-Host "Warning: llama-server.exe not found at: $llamaServerExe" -ForegroundColor Yellow
    }
    Write-Host ""

    # Copy model files to Tauri
    Write-Host "Copying model files to Tauri..." -ForegroundColor Yellow
    $modelsTargetDir = Join-Path $ProjectRoot "frontend\src-tauri\models\Qwen3VL-2B-Instruct"

    if (Test-Path $modelsSourceDir) {
        if (-Not (Test-Path $modelsTargetDir)) {
            New-Item -ItemType Directory -Path $modelsTargetDir -Force | Out-Null
        }
        
        $modelFiles = @(
            "Qwen3VL-2B-Instruct-Q8_0.gguf",
            "mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf"
        )
        
        foreach ($file in $modelFiles) {
            $sourceFile = Join-Path $modelsSourceDir $file
            if (Test-Path $sourceFile) {
                Copy-Item $sourceFile $modelsTargetDir -Force
                Write-Host "Copied: $file" -ForegroundColor Green
            } else {
                Write-Host "Warning: Model file not found: $file" -ForegroundColor Yellow
            }
        }
        
        Write-Host "Model files copied to Tauri" -ForegroundColor Green
    } else {
        Write-Host "Warning: Model directory not found: $modelsSourceDir" -ForegroundColor Yellow
    }
    Write-Host ""

    # Build Tauri with Shutdown functionality
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Building Tauri Installer" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""

    Push-Location (Join-Path $ProjectRoot "frontend")

    # Backup original config, use SQLite shutdown config, and restore after build
    $configPath = "src-tauri/tauri.conf.json"
    $sqliteShutdownConfigPath = "src-tauri/tauri_sqlite_shutdown.conf.json"
    $backupPath = "src-tauri/tauri.conf.json.backup"

    if (Test-Path $configPath) {
        Copy-Item $configPath $backupPath -Force
    }

    Write-Host "Using SQLite shutdown configuration..." -ForegroundColor Yellow
    Copy-Item $sqliteShutdownConfigPath $configPath -Force

    # Setup shutdown version
    $mainRsPath = "src-tauri\src\main.rs"
    $shutdownRsPath = "src-tauri\src\main_sqlite_shutdown.rs"
    $mainBackupPath = "src-tauri\src\main.rs.backup"

    if (Test-Path $mainRsPath) {
        Copy-Item $mainRsPath $mainBackupPath -Force
        Write-Host "Backed up original main.rs" -ForegroundColor Yellow
    }

    if (Test-Path $shutdownRsPath) {
        Copy-Item $shutdownRsPath $mainRsPath -Force
        Write-Host "Using shutdown-enabled main.rs" -ForegroundColor Yellow
    } else {
        Write-Host "Error: shutdown main.rs not found: $shutdownRsPath" -ForegroundColor Red
        Pop-Location
        exit 1
    }

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
            Write-Host "Build Completed!" -ForegroundColor Green
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

        # Restore original main.rs
        if (Test-Path $mainBackupPath) {
            Move-Item $mainBackupPath $mainRsPath -Force
            Write-Host "Original main.rs restored" -ForegroundColor Green
        }
    }

    Pop-Location
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

Add-Type -AssemblyName System.Windows.Forms
[Console]::Beep(800, 300)
[Console]::Beep(600, 300)
[Console]::Beep(800, 300)
