# Levanta la API con recarga automática y sirve la SPA compilada si existe.
[CmdletBinding()]
param(
    [int]$Port = 8010,
    [switch]$Reload
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $py)) {
    throw "No existe .venv. Ejecutá primero .\scripts\setup.ps1"
}

Set-Location (Join-Path $root "backend")
$uvicornArgs = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$Port")
if ($Reload) { $uvicornArgs += "--reload" }

Write-Host "API CAOS Vintage en http://127.0.0.1:$Port/api/docs" -ForegroundColor Green
& $py @uvicornArgs
