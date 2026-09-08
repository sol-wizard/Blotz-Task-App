#!/usr/bin/env pwsh

$platforms = @("ios", "android")
$profiles  = @("development", "preview", "production")

$androidBuildTypes = @("App Bundle", "APK")
$bumpTypes = @("No change", "Major (+1.0.0)", "Minor (x.+1.0)", "Patch (x.x.+1)")
$easChanged = $false

function Show-Menu {
    param(
        [string]$Title,
        [string[]]$Options
    )

    Write-Host "`n$Title" -ForegroundColor Cyan

    for ($i = 0; $i -lt $Options.Count; $i++) {
        Write-Host "  [$($i + 1)] $($Options[$i])"
    }

    do {
        $input = Read-Host "Enter number (default 1)"
        if ([string]::IsNullOrWhiteSpace($input)) { $input = 1 }
    } while (-not ($input -as [int]) -or
             ([int]$input -lt 1) -or
             ([int]$input -gt $Options.Count))

    $selected = $Options[[int]$input - 1]
    Write-Host "Selected: $selected" -ForegroundColor Yellow
    return $selected
}

# ------------------------
# User input
# ------------------------
$platform = Show-Menu -Title "Select platform:" -Options $platforms
$profile  = Show-Menu -Title "Select profile:"  -Options $profiles

# ------------------------
# Load eas.json
# ------------------------
$easPath = "eas.json"
$originalEasJsonContent = Get-Content $easPath -Raw
$easJson = $originalEasJsonContent | ConvertFrom-Json

$easCommand = Get-Command "eas" -ErrorAction SilentlyContinue

if (-not $easCommand) {
    Write-Host "`nEAS CLI was not found." -ForegroundColor Red
    Write-Host "Install it with: npm install --global eas-cli" -ForegroundColor Yellow
    exit 1
}

$currentVersion = $easJson.build.$profile.$platform.env.APP_VERSION
Write-Host "`nCurrent $platform version ($profile): $currentVersion" -ForegroundColor Cyan

# ------------------------
# Version bump
# ------------------------
$bump = Show-Menu -Title "Select version bump:" -Options $bumpTypes

if ($bump -eq "No change") {
    Write-Host "Version unchanged: $currentVersion" -ForegroundColor Yellow
} else {
    $parts = $currentVersion.Split(".")
    [int]$major = $parts[0]
    [int]$minor = $parts[1]
    [int]$patch = $parts[2]

    switch -Wildcard ($bump) {
        "*Major*" { $major++; $minor = 0; $patch = 0 }
        "*Minor*" { $minor++; $patch = 0 }
        default   { $patch++ }
    }

    $newVersion = "$major.$minor.$patch"
    Write-Host "Version update: $currentVersion → $newVersion" -ForegroundColor Green
    $easJson.build.$profile.$platform.env.APP_VERSION = $newVersion
    $easChanged = $true
}

# ------------------------
# Android build type
# ------------------------
if ($platform -eq "android") {

    $buildTypeLabel = Show-Menu -Title "Select Android build type:" -Options $androidBuildTypes

    if ($buildTypeLabel -eq "APK") {
        $androidBuildType = "apk"
    } else {
        $androidBuildType = "app-bundle"
    }

    if (-not $easJson.build.$profile.android) {
        $easJson.build.$profile | Add-Member -MemberType NoteProperty -Name android -Value @{}
    }

    if ($easJson.build.$profile.android.buildType -ne $androidBuildType) {
        $easJson.build.$profile.android.buildType = $androidBuildType
        $easChanged = $true
    }
}

# ------------------------
# Save eas.json safely
# ------------------------
if ($easChanged) {
    $easJson | ConvertTo-Json -Depth 10 | Set-Content $easPath
}

# ------------------------
# Build command
# ------------------------
$buildArgs = @(
    "build"
    "--platform", $platform
    "--profile", $profile
    "--non-interactive"
)

# iOS: cloud build + auto-submit to App Store
# Android APK: local build (sideload)
# Android AAB: cloud build + auto-submit to Play Store
if ($platform -eq "ios") {
    $buildArgs += "--auto-submit"
} elseif ($platform -eq "android" -and $androidBuildType -eq "apk") {
    $buildArgs += "--local"
} elseif ($platform -eq "android" -and $androidBuildType -eq "app-bundle") {
    $buildArgs += "--auto-submit"
}

Write-Host "`nRunning: eas $($buildArgs -join ' ')" -ForegroundColor Green

$previousCapabilitySyncSetting = $env:EXPO_NO_CAPABILITY_SYNC

if ($platform -eq "ios") {
    Write-Host "Skipping EAS iOS capability sync. Apple Developer capabilities are managed manually." -ForegroundColor Yellow
    $env:EXPO_NO_CAPABILITY_SYNC = "1"
}

& eas @buildArgs
$buildExitCode = $LASTEXITCODE

if ($platform -eq "ios") {
    if ($null -eq $previousCapabilitySyncSetting) {
        Remove-Item Env:EXPO_NO_CAPABILITY_SYNC -ErrorAction SilentlyContinue
    } else {
        $env:EXPO_NO_CAPABILITY_SYNC = $previousCapabilitySyncSetting
    }
}

if ($buildExitCode -ne 0) {
    if ($easChanged) {
        Set-Content -Path $easPath -Value $originalEasJsonContent -NoNewline
        Write-Host "`nBuild failed. Restored eas.json to the previous version." -ForegroundColor Yellow
    }

    exit $buildExitCode
}

Write-Host "`nBuild succeeded. Kept eas.json changes." -ForegroundColor Green
