# Qwen3VL Service Runner
# 直接从虚拟环境运行服务，避免 PyInstaller 的复杂性

param(
    [int]$Port = 8003
)

$venvPath = Join-Path (Get-Location) ".venv"

if (-Not (Test-Path $venvPath)) {
    Write-Host "Virtual environment not found at: $venvPath" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Qwen3VL Service..." -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan
Write-Host ""

# Activate venv and run the service
& "$venvPath\Scripts\Activate.ps1"
python qwen3vl_service.py --port $Port
