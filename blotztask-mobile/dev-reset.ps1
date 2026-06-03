#!/usr/bin/env pwsh

# Clean build helper: wipes generated artifacts then regenerates a build-ready state.
# Run from the blotztask-mobile folder (or anywhere — it cd's to its own location).

$ErrorActionPreference = "Stop"

# Always operate from the script's directory so paths are predictable.
Set-Location $PSScriptRoot

$targets = @("node_modules", ".expo", "ios", "android")

# ------------------------
# Remove generated artifacts
# ------------------------
foreach ($target in $targets) {
    if (Test-Path $target) {
        Write-Host "Removing $target ..." -ForegroundColor Yellow
        Remove-Item -Path $target -Recurse -Force
    } else {
        Write-Host "Skipping $target (not found)" -ForegroundColor DarkGray
    }
}

# ------------------------
# Reinstall dependencies
# ------------------------
Write-Host "`nInstalling dependencies (npm install) ..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

# ------------------------
# Regenerate native projects
# ------------------------
Write-Host "`nRegenerating native projects (expo prebuild) ..." -ForegroundColor Cyan
npx expo prebuild
if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }

Write-Host "`nClean build complete — ready to run." -ForegroundColor Green
