$ErrorActionPreference = 'Stop'
$pptx = 'C:\Users\IMP102595\Projects\KittyHP\docs\KittyHP-Manual-de-Usuario.pptx'
$preview = 'C:\Users\IMP102595\Projects\KittyHP\tools\manual\preview'
New-Item -ItemType Directory -Force -Path $preview | Out-Null
$app = New-Object -ComObject PowerPoint.Application
$app.Visible = -1
$deck = $app.Presentations.Open($pptx, 1, 0, 0)
foreach ($index in @(1,3,11,17,24)) {
  $deck.Slides.Item($index).Export((Join-Path $preview ("slide-{0:00}.png" -f $index)), 'PNG', 1600, 900)
}
$result = "Slides=$($deck.Slides.Count); Size=$((Get-Item $pptx).Length)"
$deck.Close()
$app.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($deck) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Write-Output $result
