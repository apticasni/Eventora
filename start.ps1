# Eventora Local Launch Script
$ErrorActionPreference = "Stop"

$nodePath = "C:\Users\aptic\.gemini\antigravity\scratch\nodejs"
if (Test-Path (Join-Path $nodePath "node.exe")) {
    $env:PATH = "$nodePath;$env:PATH"
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   Eventora — Discover. Connect. Experience." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Eventora Full-Stack Services..." -ForegroundColor Cyan

function Test-LocalPort([int]$port) {
    return Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
}

# 1. Start API Backend in the background
$apiDir = Join-Path $PSScriptRoot "apps\api"
$apiOutLog = Join-Path $apiDir "api-dev.log"
$apiErrorLog = Join-Path $apiDir "api-dev-error.log"
if (Test-LocalPort 4000) {
    Write-Host "-> API is already listening on http://localhost:4000." -ForegroundColor Green
} else {
    Write-Host "-> Launching Express API on http://localhost:4000..." -ForegroundColor Yellow
    $apiStartOptions = @{
        FilePath = "npm.cmd"
        ArgumentList = @("run", "dev")
        WorkingDirectory = $apiDir
        RedirectStandardOutput = $apiOutLog
        RedirectStandardError = $apiErrorLog
        PassThru = $true
        WindowStyle = "Hidden"
    }
    $apiProcess = Start-Process @apiStartOptions

    $apiStarted = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-LocalPort 4000) {
            $apiStarted = $true
            break
        }
        if ($apiProcess.HasExited) { break }
    }

    if (-not $apiStarted) {
        Get-Content $apiOutLog, $apiErrorLog -Tail 30 -ErrorAction SilentlyContinue
        throw "The API failed to start. See $apiOutLog and $apiErrorLog for details."
    }
}

# 2. Start Next.js Frontend
$webDir = Join-Path $PSScriptRoot "apps\web"
if (Test-LocalPort 3000) {
    Write-Host "-> Web application is already listening on http://localhost:3000." -ForegroundColor Green
} else {
    Write-Host "-> Launching Next.js Web Application on http://localhost:3000..." -ForegroundColor Yellow
    Set-Location $webDir
    npm.cmd run dev
}
