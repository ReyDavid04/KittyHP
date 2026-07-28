param(
  [string]$OutputPath = "C:\Users\IMP102595\Projects\KittyHP\docs\KittyHP-Manual-de-Usuario.pptx"
)

$ErrorActionPreference = 'Stop'
$scriptHome = if ($PSScriptRoot) { $PSScriptRoot } else { 'C:\Users\IMP102595\Projects\KittyHP\tools\manual' }
$captureDir = Join-Path $scriptHome 'captures'
$outputDir = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function C([string]$hex) {
  $hex = $hex.TrimStart('#')
  $r = [Convert]::ToInt32($hex.Substring(0,2),16)
  $g = [Convert]::ToInt32($hex.Substring(2,2),16)
  $b = [Convert]::ToInt32($hex.Substring(4,2),16)
  return $r + ($g * 256) + ($b * 65536)
}

$navy = C '#0B2F5B'
$brand = C '#1E5799'
$blue = C '#2563A8'
$pale = C '#E8F1FB'
$paper = C '#F5F8FC'
$ink = C '#172033'
$muted = C '#5D6B82'
$line = C '#CFDCEC'
$white = C '#FFFFFF'
$amber = C '#F3A712'
$green = C '#16836B'
$red = C '#C8243A'

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540

function Add-Rect($slide, $x, $y, $w, $h, $fill, $stroke = $null, $radius = $true) {
  $type = if ($radius) { 5 } else { 1 }
  $shape = $slide.Shapes.AddShape($type, $x, $y, $w, $h)
  $shape.Fill.ForeColor.RGB = $fill
  $shape.Fill.Solid()
  if ($null -eq $stroke) { $shape.Line.Visible = 0 } else { $shape.Line.ForeColor.RGB = $stroke; $shape.Line.Weight = 1 }
  return $shape
}

function Add-Text($slide, [string]$text, $x, $y, $w, $h, $size = 18, $color = $ink, $bold = $false, $align = 1) {
  $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $shape.TextFrame.MarginLeft = 0
  $shape.TextFrame.MarginRight = 0
  $shape.TextFrame.MarginTop = 0
  $shape.TextFrame.MarginBottom = 0
  $shape.TextFrame.TextRange.Text = $text
  $shape.TextFrame.TextRange.Font.Name = 'Aptos'
  $shape.TextFrame.TextRange.Font.Size = $size
  $shape.TextFrame.TextRange.Font.Color.RGB = $color
  $shape.TextFrame.TextRange.Font.Bold = [int]$bold
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $align
  return $shape
}

function Add-Chrome($slide, [string]$section, [int]$number) {
  Add-Rect $slide 0 0 960 8 $brand $null $false | Out-Null
  Add-Text $slide 'KittyHP' 34 20 140 25 15 $brand $true | Out-Null
  Add-Text $slide $section 720 22 205 18 10 $muted $false 3 | Out-Null
  Add-Rect $slide 30 510 900 1 $line $null $false | Out-Null
  $footer = Add-Text $slide "2026 · KittyHP · Ramos.Rey@inventec.com" 34 516 420 14 8 $muted
  $footer.ActionSettings(1).Hyperlink.Address = 'mailto:Ramos.Rey@inventec.com'
  Add-Text $slide ("{0:00}" -f $number) 880 516 45 14 8 $muted $true 3 | Out-Null
}

function Add-Title($slide, [string]$title, [string]$subtitle = '') {
  Add-Text $slide $title 34 52 870 42 28 $navy $true | Out-Null
  if ($subtitle) { Add-Text $slide $subtitle 35 94 870 26 12 $muted | Out-Null }
}

function Add-Screenshot($slide, [string]$name, $x = 275, $y = 132, $w = 650, $h = 366) {
  $path = Join-Path $captureDir $name
  Add-Rect $slide ($x-5) ($y-5) ($w+10) ($h+10) $white $line | Out-Null
  $slide.Shapes.AddPicture($path, 0, -1, $x, $y, $w, $h) | Out-Null
}

function Add-Number($slide, [int]$number, $x, $y, [string]$label = '', $labelX = 0, $labelY = 0, $labelW = 180) {
  $circle = Add-Rect $slide $x $y 26 26 $amber $white
  $circle.AutoShapeType = 9
  Add-Text $slide ([string]$number) ($x+1) ($y+4) 24 17 11 $navy $true 2 | Out-Null
  if ($label) {
    $lx = if ($labelX) { $labelX } else { $x + 34 }
    $ly = if ($labelY) { $labelY } else { $y - 1 }
    Add-Text $slide $label $lx $ly $labelW 32 10 $ink $true | Out-Null
  }
}

function Add-Arrow($slide, $x1, $y1, $x2, $y2, $color = $amber) {
  $lineShape = $slide.Shapes.AddLine($x1, $y1, $x2, $y2)
  $lineShape.Line.ForeColor.RGB = $color
  $lineShape.Line.Weight = 2.5
  $lineShape.Line.EndArrowheadStyle = 3
}

function Add-Bullets($slide, [string[]]$items, $x = 42, $y = 145, $w = 210, $size = 12) {
  $cursor = $y
  foreach ($item in $items) {
    Add-Rect $slide $x ($cursor+4) 8 8 $brand $null | Out-Null
    Add-Text $slide $item ($x+18) $cursor $w 46 $size $ink | Out-Null
    $cursor += 55
  }
}

function New-Slide([string]$section) {
  $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.ForeColor.RGB = $white
  Add-Chrome $slide $section $presentation.Slides.Count
  return $slide
}

# 1 · Portada
$s = New-Slide 'MANUAL DE USUARIO'
Add-Rect $s 0 8 960 502 $paper $null $false | Out-Null
Add-Rect $s 0 8 330 502 $navy $null $false | Out-Null
Add-Text $s 'KittyHP' 54 76 230 44 32 $white $true | Out-Null
Add-Text $s 'Manual de usuario' 54 155 245 94 31 $white $true | Out-Null
Add-Text $s 'Reportes de reparación y Overall FPF Trend' 55 260 230 60 15 (C '#C8DBF2') | Out-Null
Add-Text $s 'Versión 1.0 · Julio 2026' 55 432 230 25 11 (C '#C8DBF2') | Out-Null
Add-Screenshot $s '04-reports.png' 370 80 535 301
Add-Rect $s 385 402 505 62 $white $line | Out-Null
Add-Text $s 'Guía rápida, operativa y visual' 410 418 455 24 18 $brand $true | Out-Null

# 2 · Alcance y roles
$s = New-Slide 'INTRODUCCIÓN'
Add-Title $s '¿Qué cubre este manual?' 'Un recorrido completo por el uso diario del sistema.'
$cards = @(
  @{x=40; t='ADMIN'; c=$brand; d="Acceso completo.`nUsuarios, catálogos, reportes y Overall."},
  @{x=340; t='USER'; c=$green; d="Opera reportes y Overall.`nNo administra usuarios."},
  @{x=640; t='VIEWER'; c=$muted; d="Consulta información.`nSin edición ni descarga de Excel."}
)
foreach ($card in $cards) {
  Add-Rect $s $card.x 155 270 185 $white $line | Out-Null
  Add-Rect $s $card.x 155 270 8 $card.c $null $false | Out-Null
  Add-Text $s $card.t ($card.x+22) 185 225 24 15 $card.c $true | Out-Null
  Add-Text $s $card.d ($card.x+22) 230 225 75 14 $ink | Out-Null
}
Add-Rect $s 40 370 870 95 $pale $null | Out-Null
Add-Text $s 'Flujo recomendado' 60 388 180 22 13 $brand $true | Out-Null
Add-Text $s 'Ingresar  →  revisar Reportes  →  importar o crear  →  validar Overall  →  completar evidencia' 60 420 820 28 16 $navy $true | Out-Null

# 3 · Login
$s = New-Slide 'ACCESO'
Add-Title $s '1. Iniciar sesión' 'Usa tu cuenta corporativa de Inventec.'
Add-Bullets $s @('Escribe únicamente Apellido.Nombre.', 'Ingresa la contraseña y selecciona Ingresar.', 'Usa “¿La olvidaste?” para recuperar acceso.')
Add-Screenshot $s '01-login.png'
Add-Number $s 1 526 286 'Correo corporativo' 550 285 130
Add-Arrow $s 540 300 625 307
Add-Number $s 2 526 329 'Contraseña' 550 328 100
Add-Arrow $s 540 343 625 349
Add-Number $s 3 688 382 'Ingresar' 717 383 90
Add-Arrow $s 704 395 744 382

# 4 · Registro y recuperación
$s = New-Slide 'ACCESO'
Add-Title $s '2. Registro y recuperación' 'Las dos rutas están disponibles desde la pantalla de acceso.'
Add-Screenshot $s '02-register.png' 40 145 420 236
Add-Screenshot $s '03-recovery.png' 500 145 420 236
Add-Text $s 'Registro' 40 395 200 22 15 $brand $true | Out-Null
Add-Text $s 'Completa correo, contraseña y el código de verificación enviado.' 40 423 420 40 12 $ink | Out-Null
Add-Text $s 'Recuperar contraseña' 500 395 260 22 15 $brand $true | Out-Null
Add-Text $s 'Solicita el código, valida tu identidad y define una nueva contraseña.' 500 423 420 40 12 $ink | Out-Null

# 5 · Navigation
$s = New-Slide 'NAVEGACIÓN'
Add-Title $s '3. Navegación principal' 'La barra superior permanece disponible en todas las interfaces.'
Add-Bullets $s @('Reportes: operación diaria.', 'Overall FPF Trend: métricas semanales.', 'Configuración: usuarios y catálogos.', 'Cuenta y Salir: sesión activa.')
Add-Screenshot $s '05-navigation-menu.png'
Add-Number $s 1 350 133 'Reportes' 380 133 90
Add-Number $s 2 445 133 'Overall' 475 133 90
Add-Number $s 3 555 133 'Configuración' 585 133 120
Add-Number $s 4 845 133 'Sesión' 875 133 60

# 6 · Reports workspace
$s = New-Slide 'REPORTES'
Add-Title $s '4. Consultar y filtrar reportes' 'Los filtros se conservan al refrescar la página.'
Add-Bullets $s @('Busca por issue, family, categoría o parte.', 'Combina fechas y filtros de columna.', 'Limpia filtros para volver al listado completo.', 'El contador refleja el resultado visible.')
Add-Screenshot $s '04-reports.png'
Add-Number $s 1 286 153 'Búsqueda' 318 153 85
Add-Number $s 2 430 153 'Rango de fechas' 462 153 125
Add-Arrow $s 300 178 330 165
Add-Arrow $s 444 178 488 165

# 7 · Report actions
$s = New-Slide 'REPORTES'
Add-Title $s '5. Acciones del listado' 'Cada fila concentra consulta, edición, imágenes y revisión.'
Add-Rect $s 42 145 875 88 $pale $line | Out-Null
$actions = @('Ver', 'Editar', 'Eliminar', 'Doble clic: marcar revisión', 'Carrusel: navegar imágenes')
for ($i=0; $i -lt $actions.Count; $i++) {
  Add-Number $s ($i+1) (64 + ($i*165)) 174 $actions[$i] (96 + ($i*165)) 170 135
}
Add-Text $s 'La fila amarilla indica que el registro quedó marcado para revisión. El estado se guarda en la base de datos y no se pierde al refrescar.' 60 270 835 55 15 $ink | Out-Null
Add-Rect $s 60 345 835 70 (C '#FFF6D8') (C '#E7C55B') | Out-Null
Add-Text $s 'Consejo' 82 364 90 18 12 (C '#8A5B00') $true | Out-Null
Add-Text $s 'Antes de eliminar, el sistema muestra una confirmación bloqueante. ESC cancela; confirma solo cuando estés seguro.' 170 360 690 32 12 $ink | Out-Null

# 8 · Create
$s = New-Slide 'REPORTES'
Add-Title $s '6. Crear un reporte' 'Los campos pueden completarse según la información disponible.'
Add-Bullets $s @('Selecciona Family, Top issue, Category y Major part.', 'Captura cantidades; F/R se calcula con Failure ÷ Build.', 'Return puede operarse en modo manual o automático.', 'Guarda desde el encabezado fijo.')
Add-Screenshot $s '06-create-report.png'
Add-Number $s 1 773 143 'Guardar reporte' 800 143 110
Add-Arrow $s 786 168 850 158
Add-Number $s 2 715 254 'Imágenes' 748 254 90
Add-Arrow $s 730 279 815 255

# 9 · Details and images
$s = New-Slide 'REPORTES'
Add-Title $s '7. Detalles e imágenes' 'La información de origen permite rastrear las unidades agrupadas.'
Add-Screenshot $s '07-create-details.png' 260 132 665 374
Add-Bullets $s @('Detalles: Family completa, SN y Remark.', 'En edición, Category permite reasignar una unidad.', 'Fail picture y Evidence aceptan varias imágenes.', 'Usa flechas, contador y eliminar en el carrusel.') 38 145 205 11
Add-Number $s 1 360 365 'Tabla Detalles' 392 365 120
Add-Arrow $s 374 390 505 418

# 10 · Import flow
$s = New-Slide 'IMPORTACIÓN'
Add-Title $s '8. Importar un archivo Excel' 'La importación siempre pasa por una vista previa antes de guardar.'
$steps = @(
  @{x=42; n='1'; t='Seleccionar'; d='Importar Excel y elegir el archivo.'},
  @{x=230; n='2'; t='Validar'; d='Pestañas exactas: Station-50_Fail y Station-50_Input.'},
  @{x=418; n='3'; t='Revisar'; d='Editar filas, fecha, categorías y partes.'},
  @{x=606; n='4'; t='Excluir'; d='Aplicar exclusiones o eliminar filas.'},
  @{x=794; n='5'; t='Confirmar'; d='Crear o actualizar los registros.'}
)
foreach ($st in $steps) {
  Add-Rect $s $st.x 165 155 180 $white $line | Out-Null
  Add-Rect $s ($st.x+16) 184 38 38 $brand $null | Out-Null
  Add-Text $s $st.n ($st.x+17) 192 36 22 15 $white $true 2 | Out-Null
  Add-Text $s $st.t ($st.x+16) 237 125 22 14 $navy $true | Out-Null
  Add-Text $s $st.d ($st.x+16) 269 123 55 11 $ink | Out-Null
}
Add-Rect $s 42 370 907 86 $pale $null | Out-Null
Add-Text $s 'Nombre esperado' 62 388 150 18 12 $brand $true | Out-Null
Add-Text $s 'Reporte MM DD Est.50.xlsx' 205 386 230 22 16 $navy $true | Out-Null
Add-Text $s 'La fecha detectada se propone en la vista previa y alimenta Reportes y Overall.' 62 420 835 22 12 $ink | Out-Null

# 11 · Preview
$s = New-Slide 'IMPORTACIÓN'
Add-Title $s '9. Vista previa de importación' 'Nada se guarda hasta seleccionar “Confirmar importación”.'
Add-Rect $s 35 140 890 318 $white $line | Out-Null
Add-Rect $s 35 140 890 58 $paper $null $false | Out-Null
Add-Text $s 'Vista previa de importación' 55 157 260 25 18 $ink $true | Out-Null
Add-Text $s 'Family' 330 160 55 18 10 $muted $true | Out-Null
Add-Rect $s 385 151 120 34 $white $line | Out-Null
Add-Text $s 'Todas   ▾' 400 160 90 18 11 $ink | Out-Null
Add-Text $s 'Fecha' 520 160 45 18 10 $muted $true | Out-Null
Add-Rect $s 565 151 115 34 $white $line | Out-Null
Add-Text $s '07/23/2026' 578 160 90 18 11 $ink | Out-Null
Add-Rect $s 700 151 92 34 (C '#FFF8E7') (C '#E7A825') | Out-Null
Add-Text $s 'Exclusiones' 714 160 66 18 10 (C '#9A5B00') $true | Out-Null
Add-Rect $s 801 151 105 34 $white $line | Out-Null
Add-Text $s 'Restablecer todo' 812 160 83 18 9 $ink $true | Out-Null
$headers = @('Family','Top Issue','Failure Qty','Build Qty','F/R','Category','Major Part')
$xs = @(55,165,430,530,625,690,805)
$ws = @(100,250,90,90,55,105,100)
for ($i=0;$i -lt $headers.Count;$i++){Add-Text $s $headers[$i] $xs[$i] 217 $ws[$i] 18 10 $brand $true | Out-Null}
for($r=0;$r -lt 3;$r++){
  $yy=246+($r*53); Add-Rect $s 48 $yy 858 42 $white $line | Out-Null
  Add-Text $s 'G12 800' 60 ($yy+12) 90 16 10 $ink | Out-Null
  Add-Text $s @('Type-c test fail','FAN Stop','Power on defect')[$r] 175 ($yy+12) 230 16 10 $ink | Out-Null
  Add-Text $s @(21,5,4)[$r] 445 ($yy+12) 55 16 10 $ink | Out-Null
  Add-Text $s '3991' 545 ($yy+12) 55 16 10 $ink | Out-Null
  Add-Text $s @('0.53%','0.13%','0.10%')[$r] 625 ($yy+12) 55 16 10 $ink | Out-Null
  Add-Text $s 'Motherboard' 690 ($yy+12) 100 16 10 $ink | Out-Null
  Add-Text $s 'MB' 820 ($yy+12) 50 16 10 $ink | Out-Null
}
Add-Text $s 'Filtros solo cambian lo visible; la confirmación incluye todas las filas no eliminadas y no excluidas.' 50 421 850 22 11 $muted $true 2 | Out-Null

# 12 · exclusions
$s = New-Slide 'IMPORTACIÓN'
Add-Title $s '10. Exclusiones y reglas del análisis' 'Las exclusiones afectan el cálculo antes de confirmar.'
$ex = @(
  @{x=45;t='Cause (H)';v='BM · BP · DB · WW'},
  @{x=270;t='MajorPart (M)';v='BAP · CAM · HDD · MB'},
  @{x=495;t='Shift Fail (Z)';v='A · B · C · D'},
  @{x=720;t='Repeat (AA)';v='1 · 2'}
)
foreach($e in $ex){Add-Rect $s $e.x 160 195 165 $white $line | Out-Null;Add-Text $s $e.t ($e.x+16) 180 160 20 13 $brand $true | Out-Null;Add-Text $s $e.v ($e.x+16) 225 160 55 12 $ink | Out-Null}
Add-Rect $s 45 360 870 90 (C '#FFF8E7') (C '#E7A825') | Out-Null
Add-Text $s 'Cuando hay exclusiones activas, el botón cambia de color.' 65 378 820 20 14 (C '#8A5B00') $true | Out-Null
Add-Text $s 'Al aplicar o quitar una exclusión se conservan el filtro de Family y la fecha elegida.' 65 412 820 20 12 $ink | Out-Null

# 13 · 60 percent logic
$s = New-Slide 'IMPORTACIÓN'
Add-Title $s '11. Lógica del 60% (Pareto)' 'La vista previa reproduce el análisis técnico antes de guardar.'
Add-Rect $s 45 150 870 54 $navy $null $false | Out-Null
Add-Text $s '1  Agrupa' 65 168 150 20 13 $white $true | Out-Null
Add-Text $s '2  Ordena' 285 168 150 20 13 $white $true | Out-Null
Add-Text $s '3  Acumula' 505 168 150 20 13 $white $true | Out-Null
Add-Text $s '4  Selecciona' 725 168 160 20 13 $white $true | Out-Null
$logic = @(
  'Fecha + Family + Top Issue + Category',
  'Failure Qty de mayor a menor',
  'Suma de defectos priorizados',
  'Registros que cubren el objetivo del 60%'
)
for($i=0;$i -lt 4;$i++){Add-Rect $s (45+$i*220) 220 190 130 $white $line | Out-Null;Add-Text $s $logic[$i] (62+$i*220) 245 155 70 13 $ink $true 2 | Out-Null}
Add-Rect $s 45 380 870 68 $pale $null | Out-Null
Add-Text $s 'F/R = Failure Qty ÷ Build Qty × 100' 70 400 400 24 18 $brand $true | Out-Null
Add-Text $s 'El total del Pareto aparece al final de la vista previa.' 510 404 360 20 12 $ink | Out-Null

# 14 · edit and view
$s = New-Slide 'REPORTES'
Add-Title $s '12. Visualizar y editar un reporte' 'El encabezado fijo mantiene las acciones disponibles durante el scroll.'
Add-Screenshot $s '06-create-report.png' 285 132 640 360
Add-Bullets $s @('Visualizar: datos, Detalles e imágenes.', 'Editar: cambia campos y guarda.', 'Ocultar detalles: reduce el contenido visible.', 'ESC: regresa sin guardar.') 38 145 220 12
Add-Number $s 1 750 145 'Ocultar detalles' 782 145 120
Add-Number $s 2 853 185 'Guardar' 882 185 70

# 15 · category reassignment
$s = New-Slide 'REPORTES'
Add-Title $s '13. Reasignar la categoría de una unidad' 'Disponible en la tabla Detalles al editar.'
Add-Rect $s 40 150 880 195 $white $line | Out-Null
Add-Rect $s 40 150 880 44 $pale $null $false | Out-Null
$h=@('Family','SN','Remark','Category');$hx=@(60,270,475,700);for($i=0;$i -lt 4;$i++){Add-Text $s $h[$i] $hx[$i] 165 180 18 11 $brand $true | Out-Null}
Add-Text $s 'MACHU14W 1.0' 60 226 175 20 12 $ink | Out-Null
Add-Text $s '2MQ6290L1Y' 270 226 165 20 12 $ink | Out-Null
Add-Text $s 'CAMBIO W WAN FALLA TEST' 475 226 200 35 11 $ink | Out-Null
Add-Rect $s 700 210 190 48 $white $line | Out-Null
Add-Text $s 'Motherboard          ▾' 716 226 158 20 12 $ink | Out-Null
Add-Text $s '1' 52 380 20 22 17 $brand $true | Out-Null
Add-Text $s 'Selecciona la nueva Category en la unidad.' 82 382 345 22 13 $ink | Out-Null
Add-Text $s '2' 452 380 20 22 17 $brand $true | Out-Null
Add-Text $s 'Guarda cambios para ejecutar la reasignación.' 482 382 405 22 13 $ink | Out-Null
Add-Text $s 'Si existe un grupo con Fecha + Family + Top Issue + Category, la unidad se mueve ahí; si no, el sistema crea un grupo nuevo.' 82 425 805 42 12 $muted | Out-Null

# 16 · return fields
$s = New-Slide 'REPORTES'
Add-Title $s '14. Return Yes y Return No' 'La importación deja Return vacío; el usuario decide cuándo capturarlo.'
Add-Rect $s 150 170 285 145 $white $line | Out-Null
Add-Text $s 'Return Yes' 180 200 110 22 13 $ink $true | Out-Null
Add-Rect $s 180 235 100 52 $white $line | Out-Null
Add-Text $s '0' 198 250 65 22 15 $ink | Out-Null
Add-Text $s 'Return No' 305 200 110 22 13 $ink $true | Out-Null
Add-Rect $s 305 235 100 52 $white $line | Out-Null
Add-Text $s '—' 325 250 65 22 15 $muted | Out-Null
Add-Rect $s 525 170 285 145 $pale $null | Out-Null
Add-Text $s 'Modo manual' 555 198 220 22 15 $brand $true | Out-Null
Add-Text $s 'Captura ambos valores y guarda.' 555 235 220 22 12 $ink | Out-Null
Add-Text $s 'Modo automático' 555 270 220 22 15 $green $true | Out-Null
Add-Text $s 'El sistema calcula Return No.' 555 302 220 22 12 $ink | Out-Null
Add-Text $s 'Importante: un valor vacío se conserva vacío al guardar; 0 es un valor explícito.' 150 365 660 42 14 $navy $true 2 | Out-Null

# 17 · Overall
$s = New-Slide 'OVERALL FPF TREND'
Add-Title $s '15. Consultar Overall FPF Trend' 'La fecha seleccionada al importar determina el día que recibe los datos.'
Add-Bullets $s @('Semana individual: captura por día.', 'Últimas semanas: consulta histórica.', 'Comparar semanas: análisis lateral.', 'Guardar semana y exportar: Admin/User.') 38 150 205 11
Add-Screenshot $s '12-overall-trend.png' 260 132 665 374
Add-Number $s 1 272 184 'Vistas' 304 184 80
Add-Number $s 2 634 145 'Semana' 666 145 80
Add-Arrow $s 648 171 690 165

# 18 · Overall families
$s = New-Slide 'OVERALL FPF TREND'
Add-Title $s '16. Familias visibles en Overall' 'El tablero usa una lista controlada para mantener series comparables.'
$families=@('G12 800','CHIRON','GEMTREE 16','GEMTREE 18','MERINO','LAMPAS','CASHMERE')
for($i=0;$i -lt $families.Count;$i++){
  $col=$i%4;$row=[math]::Floor($i/4);$x=55+$col*220;$y=165+$row*105
  Add-Rect $s $x $y 190 72 $(if($i -eq 0){C '#FFF4CD'}else{C '#EEF4FA'}) $line | Out-Null
  Add-Text $s $families[$i] ($x+12) ($y+24) 166 24 14 $navy $true 2 | Out-Null
}
Add-Text $s 'IDS Overall' 55 393 190 22 14 $brand $true | Out-Null
Add-Text $s 'Resume el total del conjunto mostrado.' 55 425 810 26 12 $ink | Out-Null

# 19 · Catalogs
$s = New-Slide 'CONFIGURACIÓN'
Add-Title $s '17. Administrar catálogos' 'Los selectores de los reportes se alimentan de estos valores.'
Add-Screenshot $s '13-catalog-family.png' 275 132 650 366
Add-Bullets $s @('Family', 'Top Issue', 'Category', 'Major Part', 'Failure Factor') 38 145 190 12
Add-Text $s 'Acciones disponibles' 42 425 180 20 12 $brand $true | Out-Null
Add-Text $s 'Agregar · Buscar · Editar · Desactivar · Eliminar' 42 451 210 40 11 $ink | Out-Null
Add-Number $s 1 445 184 'Nuevo valor' 477 184 100
Add-Number $s 2 302 216 'Buscar' 334 216 80

# 20 · Users
$s = New-Slide 'CONFIGURACIÓN'
Add-Title $s '18. Administrar usuarios' 'Disponible únicamente para el rol Admin.'
Add-Bullets $s @('Agregar usuarios autorizados.', 'Asignar Admin, User o Viewer.', 'Activar, editar o eliminar cuentas.', 'La cuenta propia no puede desactivarse por accidente.') 38 145 210 11
Add-Screenshot $s '14-users.png' 260 132 665 374
Add-Number $s 1 786 148 'Agregar usuario' 818 148 105
Add-Number $s 2 284 208 'Buscar correo' 316 208 100

# 21 · Export and images
$s = New-Slide 'ARCHIVOS'
Add-Title $s '19. Descargar Excel e imágenes' 'La exportación respeta el conjunto filtrado de reportes.'
Add-Rect $s 50 155 390 230 $white $line | Out-Null
Add-Text $s 'Descargar Excel' 75 180 300 28 19 $brand $true | Out-Null
Add-Text $s "• Incluye los datos visibles.`n• Fail picture y Evidence pueden contener varias imágenes.`n• Todas las imágenes del arreglo se insertan en la exportación." 75 230 320 105 13 $ink | Out-Null
Add-Rect $s 520 155 390 230 $white $line | Out-Null
Add-Text $s 'Carrusel de imágenes' 545 180 300 28 19 $brand $true | Out-Null
Add-Text $s "• Flechas izquierda y derecha.`n• Contador de posición: 1/10, 2/10…`n• Opción de eliminar en edición." 545 230 320 105 13 $ink | Out-Null
Add-Text $s 'La descarga está deshabilitada para Viewer.' 50 420 860 25 13 $red $true 2 | Out-Null

# 22 · Shortcuts
$s = New-Slide 'PRODUCTIVIDAD'
Add-Title $s '20. Atajos de teclado' 'Funcionan sin mostrar etiquetas visuales en la interfaz.'
$shortcuts=@(
  @{k='Ctrl + K';d='Enfocar la búsqueda de Reportes.'},
  @{k='Ctrl + S';d='Guardar el formulario o la semana activa.'},
  @{k='Ctrl + D';d='Mostrar u ocultar Detalles.'},
  @{k='ESC';d='Cerrar menús/modales o regresar.'},
  @{k='←  →';d='Moverse por el carrusel de imágenes.'},
  @{k='Ctrl + Enter';d='Confirmar una alerta bloqueante.'}
)
for($i=0;$i -lt $shortcuts.Count;$i++){
  $col=$i%2;$row=[math]::Floor($i/2);$x=55+$col*455;$y=150+$row*105
  Add-Rect $s $x $y 420 78 $white $line | Out-Null
  Add-Rect $s ($x+18) ($y+17) 110 42 $navy $null | Out-Null
  Add-Text $s $shortcuts[$i].k ($x+20) ($y+28) 106 20 12 $white $true 2 | Out-Null
  Add-Text $s $shortcuts[$i].d ($x+148) ($y+21) 245 40 12 $ink | Out-Null
}

# 23 · Feedback/errors
$s = New-Slide 'AYUDA'
Add-Title $s '21. Alertas, confirmaciones y errores' 'El feedback se muestra centrado en la parte superior.'
$states=@(
  @{x=50;c=$green;t='Éxito';d='La operación se completó.'},
  @{x=350;c=$amber;t='Advertencia';d='Revisa datos o exclusiones.'},
  @{x=650;c=$red;t='Error';d='La operación no se guardó.'}
)
foreach($st in $states){Add-Rect $s $st.x 160 260 110 $white $line | Out-Null;Add-Rect $s $st.x 160 8 110 $st.c $null $false | Out-Null;Add-Text $s $st.t ($st.x+28) 180 190 22 15 $st.c $true | Out-Null;Add-Text $s $st.d ($st.x+28) 218 205 30 11 $ink | Out-Null}
Add-Rect $s 50 305 860 120 $paper $null | Out-Null
Add-Text $s 'Confirmaciones críticas' 72 328 220 24 15 $navy $true | Out-Null
Add-Text $s 'Bloquean temporalmente navegación y clics. Usa Cancelar o ESC para cerrar; confirma únicamente después de revisar el registro afectado.' 72 365 790 52 13 $ink | Out-Null
Add-Text $s 'Si un error persiste: captura el mensaje y contacta Ramos.Rey@inventec.com.' 50 456 860 22 12 $brand $true 2 | Out-Null

# 24 · Closing quick guide
$s = New-Slide 'CIERRE'
Add-Title $s 'Guía rápida de operación diaria' 'Cinco pasos para trabajar con seguridad.'
$daily=@('1  Verifica fecha y filtros','2  Importa y revisa la vista previa','3  Ajusta exclusiones y categorías','4  Confirma y valida Overall','5  Completa resultados, acciones e imágenes')
for($i=0;$i -lt $daily.Count;$i++){
  Add-Rect $s 80 (145+$i*62) 800 46 $(if($i%2 -eq 0){$pale}else{$white}) $(if($i%2 -eq 0){$null}else{$line}) | Out-Null
  Add-Text $s $daily[$i] 105 (158+$i*62) 750 22 14 $navy $true | Out-Null
}
Add-Text $s 'Soporte: Ramos.Rey@inventec.com' 80 468 800 24 13 $brand $true 2 | Out-Null

$presentation.SaveAs($OutputPath, 24)
$slideCount = $presentation.Slides.Count
$presentation.Close()
$ppt.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Write-Output "PPTX=$OutputPath"
Write-Output "Slides=$slideCount"
