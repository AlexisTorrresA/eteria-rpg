$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "[1/4] Instalando dependencias web..." -ForegroundColor Cyan
Push-Location "$Root/frontend"
npm install

Write-Host "[2/4] Compilando Eteria..." -ForegroundColor Cyan
npm run build
Pop-Location

Write-Host "[3/4] Preparando Python..." -ForegroundColor Cyan
Push-Location $Root
if (-not (Test-Path ".venv")) {
    py -3 -m venv .venv
}
& ".venv/Scripts/python.exe" -m pip install -r backend/requirements.txt

Write-Host "[4/4] Iniciando en http://localhost:10000" -ForegroundColor Green
& ".venv/Scripts/python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 10000
Pop-Location
