# Compila el frontend para que FastAPI lo sirva como single-service.
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "frontend")

npm run build
Write-Host ""
Write-Host "SPA compilada en frontend/dist. Reiniciá el backend si estaba corriendo." -ForegroundColor Green
