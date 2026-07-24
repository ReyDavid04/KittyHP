param([string]$ProjectRoot = "C:/Users/IMP102595/Projects/KittyHP", [string]$OutputDir = "C:/Users/IMP102595/Projects/KittyHP/offline-bundles", [switch]$SkipBackend, [switch]$SkipFrontend)
$ErrorActionPreference = 'Stop'; Set-StrictMode -Version Latest
if ($SkipBackend -and $SkipFrontend) { throw 'No puedes omitir backend y frontend al mismo tiempo.' }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path; New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if (!$SkipBackend) { & (Join-Path $root 'package-backend-offline.ps1') -ProjectRoot $ProjectRoot -OutputDir $OutputDir }
if (!$SkipFrontend) { & (Join-Path $root 'package-frontend-offline.ps1') -ProjectRoot $ProjectRoot -OutputDir $OutputDir }
Get-ChildItem $OutputDir -Filter '*kittyhp*-offline.zip' | ForEach-Object { $hash=(Get-FileHash -Algorithm SHA256 $_.FullName).Hash; Write-Host "$($_.Name) | SHA256 $hash" -ForegroundColor Green }
