#!/usr/bin/env pwsh

$platforms = @("ios", "android")
$profiles  = @("development", "preview", "production")

$androidBuildTypes = @("App Bundle", "APK")
$bumpTypes = @("Major (+1.0.0)", "Minor (x.+1.0)", "Patch (x.x.+1)")

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
$easJson = Get-Content $easPath -Raw | ConvertFrom-Json

$currentVersion = $easJson.build.$profile.env.APP_VERSION
Write-Host "`nCurrent version ($profile): $currentVersion" -ForegroundColor Cyan

# ------------------------
# Version bump
# ------------------------
$bump = Show-Menu -Title "Select version bump:" -Options $bumpTypes

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

$easJson.build.$profile.env.APP_VERSION = $newVersion

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

    $easJson.build.$profile.android.buildType = $androidBuildType
}

# ------------------------
# Save eas.json safely
# ------------------------
$easJson | ConvertTo-Json -Depth 10 | Set-Content $easPath

# ------------------------
# Build command
# ------------------------
$args = @(
    "build"
    "--platform", $platform
    "--profile", $profile
    "--non-interactive"
    "--local"
)

Write-Host "`nRunning: eas $($args -join ' ')" -ForegroundColor Green

& eas @args