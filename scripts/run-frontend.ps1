# Levanta el frontend en modo desarrollo (Vite, puerto 5173).
[CmdletBinding()]
param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "frontend")

Write-Host "Frontend CAOS Vintage en http://localhost:$Port" -ForegroundColor Green
npm run dev -- --port $Port
