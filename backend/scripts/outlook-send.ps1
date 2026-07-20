param(
  [Parameter(Mandatory = $true)]
  [string]$PayloadPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $PayloadPath)) {
  throw "No se encontró el archivo de correo: $PayloadPath"
}

$payload = Get-Content -LiteralPath $PayloadPath -Raw -Encoding UTF8 | ConvertFrom-Json
$outlook = $null
$mail = $null

try {
  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $mail.To = [string]$payload.to

  if ($payload.cc) {
    $mail.CC = [string]$payload.cc
  }

  if ($payload.bcc) {
    $mail.BCC = [string]$payload.bcc
  }

  $mail.Subject = [string]$payload.subject

  if ($payload.htmlBody) {
    $mail.HTMLBody = [string]$payload.htmlBody
  }
  else {
    $mail.Body = [string]$payload.textBody
  }

  $mail.Send()
  Write-Output 'SENT'
}
finally {
  if ($mail -ne $null) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($mail)
  }

  if ($outlook -ne $null) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($outlook)
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
