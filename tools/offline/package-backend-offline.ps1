param([string]$ProjectRoot = "C:/Users/IMP102595/Projects/KittyHP", [string]$OutputDir = "C:/Users/IMP102595/Projects/KittyHP/offline-bundles")
$ErrorActionPreference='Stop'; Set-StrictMode -Version Latest
function Invoke-Npm([string[]]$NpmArguments) { & npm @NpmArguments; if($LASTEXITCODE -ne 0){throw "npm $($NpmArguments -join ' ') fallo ($LASTEXITCODE)."} }
function Compress-RuntimePackage([string]$SourceDirectory, [string]$DestinationPath) {
  $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
  if (!$tar) { throw 'No se encontró tar.exe para crear el ZIP de backend.' }
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    if (Test-Path $DestinationPath) { Remove-Item -Force $DestinationPath }
    & $tar.Source -a -c -f $DestinationPath -C $SourceDirectory .
    if ($LASTEXITCODE -eq 0 -and (Test-Path $DestinationPath) -and (Get-Item $DestinationPath).Length -gt 0) {
      & $tar.Source -t -f $DestinationPath | Out-Null
      if ($LASTEXITCODE -eq 0) { return }
    }
    if ($attempt -eq 5) { throw 'No se pudo crear un ZIP válido del backend.' }
    Start-Sleep -Seconds 2
  }
}
$src=Join-Path $ProjectRoot 'backend'; $stage=Join-Path ([IO.Path]::GetTempPath()) 'kittyhp-backend-offline'; $pkg=Join-Path $OutputDir 'kittyhp-backend-offline.zip'
if(!(Test-Path (Join-Path $src 'package-lock.json'))){throw "No se encontro backend/package-lock.json."}; New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if(Test-Path $stage){Remove-Item -Recurse -Force $stage}; New-Item -ItemType Directory -Force -Path (Join-Path $stage 'package') | Out-Null
try { Push-Location $src; try { Invoke-Npm @('ci','--prefer-offline','--no-audit','--no-fund'); Invoke-Npm @('run','build') } finally { Pop-Location }
  $dist=Join-Path $src 'dist'; if(!(Test-Path (Join-Path $dist 'main.js'))){throw 'El build no genero backend/dist/main.js.'}
  $out=Join-Path $stage 'package'; Copy-Item -Recurse -Force $dist (Join-Path $out 'dist'); Copy-Item -Force (Join-Path $src 'package.json') $out; Copy-Item -Force (Join-Path $src 'package-lock.json') $out
  if(Test-Path (Join-Path $src '.env.example')){Copy-Item -Force (Join-Path $src '.env.example') $out}; New-Item -ItemType Directory -Force -Path (Join-Path $out 'logs') | Out-Null
  Push-Location $out; try { Invoke-Npm @('ci','--omit=dev','--prefer-offline','--no-audit','--no-fund') } finally { Pop-Location }
  Compress-RuntimePackage $out $pkg; Write-Host "Backend listo: $pkg" -ForegroundColor Green
} finally { Pop-Location -ErrorAction SilentlyContinue; if(Test-Path $stage){Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue} }
