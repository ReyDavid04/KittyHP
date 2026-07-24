param([string]$ProjectRoot = "C:/Users/IMP102595/Projects/KittyHP", [string]$OutputDir = "C:/Users/IMP102595/Projects/KittyHP/offline-bundles")
$ErrorActionPreference='Stop'; Set-StrictMode -Version Latest
function Invoke-Npm([string[]]$NpmArguments) { & npm @NpmArguments; if($LASTEXITCODE -ne 0){throw "npm $($NpmArguments -join ' ') fallo ($LASTEXITCODE)."} }
$src=Join-Path $ProjectRoot 'frontend'; $dist=Join-Path $src 'dist/kittyhp-frontend'; $stage=Join-Path ([IO.Path]::GetTempPath()) 'kittyhp-frontend-offline'; $pkg=Join-Path $OutputDir 'kittyhp-frontend-offline.zip'
if(!(Test-Path (Join-Path $src 'package-lock.json'))){throw "No se encontro frontend/package-lock.json."}; New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if(Test-Path $stage){Remove-Item -Recurse -Force $stage}; New-Item -ItemType Directory -Force -Path $stage | Out-Null
try { Push-Location $src; try { Invoke-Npm @('ci','--prefer-offline','--no-audit','--no-fund'); Invoke-Npm @('run','build') } finally { Pop-Location }
  $build=Join-Path $dist 'browser'; if(!(Test-Path (Join-Path $build 'index.html'))){$build=$dist}; if(!(Test-Path (Join-Path $build 'index.html'))){throw "No se encontro index.html en $dist."}
  Copy-Item -Recurse -Force (Join-Path $build '*') $stage
  @'
<?xml version="1.0" encoding="utf-8"?>
<configuration><system.webServer><rewrite><rules><rule name="Angular Routes" stopProcessing="true"><match url=".*" /><conditions logicalGrouping="MatchAll"><add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /><add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /></conditions><action type="Rewrite" url="/index.html" /></rule></rules></rewrite></system.webServer></configuration>
'@ | Set-Content (Join-Path $stage 'web.config') -Encoding UTF8
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $pkg -Force; if(!(Test-Path $pkg)){throw 'No se genero el paquete frontend.'}; Write-Host "Frontend listo: $pkg" -ForegroundColor Green
} finally { Pop-Location -ErrorAction SilentlyContinue; if(Test-Path $stage){Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue} }
