# Prepara el entorno local de CAOS Vintage (backend + frontend + datos demo).
[CmdletBinding()]
param(
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Cyan
    & $Python -m venv .venv
}

$py = Join-Path $root ".venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install -r backend\requirements.txt

Write-Host "Instalando dependencias del frontend..." -ForegroundColor Cyan
Push-Location frontend
try {
    npm install
} finally {
    Pop-Location
}

Write-Host "Cargando datos demo..." -ForegroundColor Cyan
Push-Location backend
try {
    & $py -m app.db.seed
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Listo. Ejecutá en terminales separadas:" -ForegroundColor Green
Write-Host "  .\scripts\run-backend.ps1"
Write-Host "  .\scripts\run-frontend.ps1"
Write-Host ""
Write-Host "Frontend: http://localhost:5173  ·  API: http://127.0.0.1:8010/api/docs"
