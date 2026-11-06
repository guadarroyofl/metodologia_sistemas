# Ejecuta la suite de pruebas del backend.
[CmdletBinding()]
param(
    [string]$Filter = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $py)) {
    throw "No existe .venv. Ejecutá primero .\scripts\setup.ps1"
}

Set-Location (Join-Path $root "backend")
$pytestArgs = @("-m", "pytest", "tests", "-q")
if ($Filter) { $pytestArgs += @("-k", $Filter) }

& $py @pytestArgs
