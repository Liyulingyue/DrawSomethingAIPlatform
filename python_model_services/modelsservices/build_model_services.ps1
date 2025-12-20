# Model Services Build Script
param(
    [switch]$Qwen3VL,
    [switch]$ZImage,
    [switch]$All,
    [switch]$SkipDeps
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Model Services Build Tool" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

# Function to build a service
function Build-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$SpecFile,
        [switch]$SkipDeps
    )

    Write-Host "===================================" -ForegroundColor Green
    Write-Host "Building $ServiceName Service" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""

    $serviceDir = Join-Path $ProjectRoot $ServicePath

    # Check if directory exists
    if (-Not (Test-Path $serviceDir)) {
        Write-Host "Service directory not found: $serviceDir" -ForegroundColor Red
        return
    }

    # Check if spec file exists
    $specPath = Join-Path $serviceDir $SpecFile
    if (-Not (Test-Path $specPath)) {
        Write-Host "Spec file not found: $specPath" -ForegroundColor Red
        return
    }

    # Check if virtual environment exists
    $venvPath = Join-Path $serviceDir ".venv"
    if (-Not (Test-Path $venvPath)) {
        Write-Host "Virtual environment not found. Creating..." -ForegroundColor Yellow
        Push-Location $serviceDir
        try {
            python -m venv .venv
            Write-Host "Virtual environment created" -ForegroundColor Green
        } catch {
            Write-Host "Failed to create virtual environment: $_" -ForegroundColor Red
            Pop-Location
            return
        }
        Pop-Location
    }

    # Activate virtual environment and install dependencies
    if (-Not $SkipDeps) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        Push-Location $serviceDir
        try {
            & "$venvPath\Scripts\Activate.ps1"
            if (Test-Path "run_requirements.txt") {
                pip install --prefer-binary -r run_requirements.txt
            } else {
                pip install --prefer-binary -r requirements.txt
            }
            pip install pyinstaller
            Write-Host "Dependencies installed" -ForegroundColor Green
        } catch {
            Write-Host "Failed to install dependencies: $_" -ForegroundColor Red
            Pop-Location
            return
        }
    } else {
        Write-Host "Skipping dependency installation..." -ForegroundColor Yellow
        Push-Location $serviceDir
        & "$venvPath\Scripts\Activate.ps1"
    }

    # Build with PyInstaller
    Write-Host "Building executable with PyInstaller..." -ForegroundColor Yellow
    try {
        pyinstaller --clean --noconfirm $SpecFile
        Write-Host "$ServiceName service built successfully!" -ForegroundColor Green

        # Check if exe was created
        $distDir = Join-Path $serviceDir "dist"
        $exeFiles = Get-ChildItem $distDir -Filter "*.exe" -ErrorAction SilentlyContinue
        if ($exeFiles) {
            Write-Host "Executable created: $($exeFiles[0].FullName)" -ForegroundColor Green
        }
    } catch {
        Write-Host "Failed to build executable: $_" -ForegroundColor Red
    }

    Pop-Location
}

# Determine which services to build
$buildQwen3VL = $Qwen3VL -or $All
$buildZImage = $ZImage -or $All

if (-Not $buildQwen3VL -and -Not $buildZImage) {
    Write-Host "Please specify which service to build:" -ForegroundColor Yellow
    Write-Host "  -Qwen3VL    Build Qwen3VL service" -ForegroundColor White
    Write-Host "  -ZImage     Build Z-Image service" -ForegroundColor White
    Write-Host "  -All        Build all services" -ForegroundColor White
    Write-Host "  -SkipDeps   Skip installing dependencies (if already installed)" -ForegroundColor White
    Write-Host ""
    Write-Host "Example: .\build_model_services.ps1 -All" -ForegroundColor Gray
    Write-Host "Example: .\build_model_services.ps1 -Qwen3VL -SkipDeps" -ForegroundColor Gray
    exit 1
}

# Build services
if ($buildQwen3VL) {
    Build-Service -ServiceName "Qwen3VL" -ServicePath "modelsservices\Qwen3vl" -SpecFile "qwen3vl_service.spec" -SkipDeps:$SkipDeps
}

if ($buildZImage) {
    Build-Service -ServiceName "Z-Image" -ServicePath "modelsservices\Z-Image" -SpecFile "z_image_service.spec" -SkipDeps:$SkipDeps
}

Write-Host ""
Write-Host "Build process completed!" -ForegroundColor Cyan