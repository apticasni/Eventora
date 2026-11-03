# Eventora Local Launch Script
$ErrorActionPreference = "Stop"

$nodePath = "C:\Users\aptic\.gemini\antigravity\scratch\nodejs"
if (Test-Path $nodePath) {
    $env:PATH = "$nodePath;$env:PATH"
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   Eventora — Discover. Connect. Experience." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Eventora Full-Stack Services..." -ForegroundColor Cyan

# 1. Start API Backend in background job
$apiDir = Join-Path $PSScriptRoot "apps\api"
Write-Host "-> Launching Express API on http://localhost:4000..." -ForegroundColor Yellow
$apiProcess = Start-Process -FilePath "node" -ArgumentList "-e", "require('tsx/cli');" -WorkingDirectory $apiDir -PassThru -NoNewWindow

# 2. Start Next.js Frontend
$webDir = Join-Path $PSScriptRoot "apps\web"
Write-Host "-> Launching Next.js Web Application on http://localhost:3000..." -ForegroundColor Yellow
Set-Location $webDir
npm run dev
