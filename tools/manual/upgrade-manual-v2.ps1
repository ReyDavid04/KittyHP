param(
  [string]$InputPath = "C:\Users\IMP102595\Projects\KittyHP\docs\KittyHP-Manual-de-Usuario - Copy.pptx",
  [string]$OutputPath = "C:\Users\IMP102595\Projects\KittyHP\docs\KittyHP-Manual-de-Usuario-v2.0.pptx"
)

$ErrorActionPreference = 'Stop'

function Color([string]$hex) {
  $hex = $hex.TrimStart('#')
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return $r + ($g * 256) + ($b * 65536)
}

$navy = Color '#0B2F5B'
$brand = Color '#1E5799'
$blue = Color '#2563A8'
$pale = Color '#E8F1FB'
$paper = Color '#F5F8FC'
$ink = Color '#172033'
$muted = Color '#5D6B82'
$line = Color '#CFDCEC'
$white = Color '#FFFFFF'
$amber = Color '#F3A712'
$amberPale = Color '#FFF4D6'
$green = Color '#16836B'
$greenPale = Color '#E8F7F2'
$red = Color '#C8243A'
$redPale = Color '#FDECEF'

if (-not (Test-Path -LiteralPath $InputPath)) {
  throw "No existe la presentación de origen: $InputPath"
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $null

function Add-Rect($slide, $x, $y, $w, $h, $fill, $stroke = $null, [bool]$rounded = $true) {
  $type = if ($rounded) { 5 } else { 1 }
  $shape = $slide.Shapes.AddShape($type, $x, $y, $w, $h)
  $shape.Fill.ForeColor.RGB = $fill
  $shape.Fill.Solid()
  if ($null -eq $stroke) {
    $shape.Line.Visible = 0
  } else {
    $shape.Line.Visible = -1
    $shape.Line.ForeColor.RGB = $stroke
    $shape.Line.Weight = 1
  }
  return $shape
}

function Add-Text($slide, [string]$text, $x, $y, $w, $h, $size = 18, $color = $ink, [bool]$bold = $false, $align = 1) {
  $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $shape.TextFrame.MarginLeft = 0
  $shape.TextFrame.MarginRight = 0
  $shape.TextFrame.MarginTop = 0
  $shape.TextFrame.MarginBottom = 0
  $shape.TextFrame.WordWrap = -1
  $shape.TextFrame.TextRange.Text = $text
  $shape.TextFrame.TextRange.Font.Name = 'Aptos'
  $shape.TextFrame.TextRange.Font.Size = [single]$size
  $shape.TextFrame.TextRange.Font.Color.RGB = $color
  $shape.TextFrame.TextRange.Font.Bold = [int]$bold
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $align
  return $shape
}

function Add-Chrome($slide, [string]$section) {
  Add-Rect $slide 0 0 960 8 $brand $null $false | Out-Null
  Add-Text $slide 'KittyHP' 34 20 140 25 15 $brand $true | Out-Null
  Add-Text $slide $section 690 22 235 18 10 $muted $false 3 | Out-Null
  Add-Rect $slide 30 510 900 1 $line $null $false | Out-Null
  $footer = Add-Text $slide '2026 · KittyHP · Ramos.Rey@inventec.com' 34 516 420 14 8 $muted
  $footer.ActionSettings(1).Hyperlink.Address = 'mailto:Ramos.Rey@inventec.com'
  Add-Text $slide '00' 880 516 45 14 8 $muted $true 3 | Out-Null
}

function Add-Title($slide, [string]$title, [string]$subtitle = '') {
  Add-Text $slide $title 34 52 880 42 28 $navy $true | Out-Null
  if ($subtitle) {
    Add-Text $slide $subtitle 35 94 875 28 12 $muted | Out-Null
  }
}

function Add-BulletList($slide, [string[]]$items, $x, $y, $w, $size = 14, $step = 48) {
  $cursor = $y
  foreach ($item in $items) {
    Add-Rect $slide $x ($cursor + 7) 8 8 $brand $null $true | Out-Null
    Add-Text $slide $item ($x + 20) $cursor $w ($step - 2) $size $ink | Out-Null
    $cursor += $step
  }
}

function Add-SectionSlide([int]$position, [string]$section, [string]$title, [string]$subtitle) {
  $slide = $presentation.Slides.Add($position, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.ForeColor.RGB = $white
  Add-Chrome $slide $section
  Add-Title $slide $title $subtitle
  return $slide
}

function Add-Cell($slide, [string]$text, $x, $y, $w, $h, $fill, $stroke, $size = 12, $color = $ink, [bool]$bold = $false, $align = 1) {
  Add-Rect $slide $x $y $w $h $fill $stroke $false | Out-Null
  $left = if ($align -eq 2) { $x } else { $x + 10 }
  $width = if ($align -eq 2) { $w } else { $w - 20 }
  Add-Text $slide $text $left ($y + (($h - ($size + 5)) / 2)) $width ($size + 8) $size $color $bold $align | Out-Null
}

function Get-ShapeText($shape) {
  try {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
      return [string]$shape.TextFrame.TextRange.Text
    }
  } catch {}
  return ''
}

function Find-Slide([string]$fragment) {
  foreach ($slide in $presentation.Slides) {
    foreach ($shape in $slide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like "*$fragment*") {
        return $slide
      }
    }
  }
  return $null
}

function Replace-AllText([string]$old, [string]$new) {
  foreach ($slide in $presentation.Slides) {
    foreach ($shape in $slide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -and $text.Contains($old)) {
        $shape.TextFrame.TextRange.Text = $text.Replace($old, $new)
      }
    }
  }
}

function Set-SlideLink($shape, [string]$titleFragment) {
  $target = Find-Slide $titleFragment
  if ($null -ne $target) {
    try {
      $shape.ActionSettings(1).Action = 7
      $shape.ActionSettings(1).Hyperlink.SubAddress = "$($target.SlideID),$($target.SlideIndex),$($target.Name)"
    } catch {}
  }
}

try {
  $presentation = $powerPoint.Presentations.Open($InputPath, 1, 0, 0)
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  # Insert in descending positions so the source deck order remains stable.

  # New slide before the original closing slide.
  $s = Add-SectionSlide 25 'AYUDA' 'Diagnóstico, soporte y versión' 'Qué revisar antes de solicitar ayuda y qué información enviar.'
  $rows = @(
    @('Archivo rechazado', 'Confirma .xlsx, nombre Reporte MM DD Est.50.xlsx y hojas exactas.'),
    @('Datos incompletos', 'Revisa encabezados, exclusiones y los valores editables de la vista previa.'),
    @('API o sesión', 'Recarga; si continúa, registra hora, pantalla y mensaje del toast.'),
    @('Imagen no visible', 'Verifica que la API sea accesible y conserva la URL que no carga.')
  )
  Add-Cell $s 'Situación' 40 145 225 38 $navy $navy 12 $white $true
  Add-Cell $s 'Acción recomendada' 265 145 655 38 $navy $navy 12 $white $true
  $y = 183
  foreach ($row in $rows) {
    Add-Cell $s $row[0] 40 $y 225 48 $white $line 12 $navy $true
    Add-Cell $s $row[1] 265 $y 655 48 $white $line 12 $ink $false
    $y += 48
  }
  Add-Rect $s 40 395 880 83 $pale $line $true | Out-Null
  Add-Text $s 'Al contactar soporte' 60 411 180 20 13 $brand $true | Out-Null
  $support = Add-Text $s 'Envía: usuario, fecha/hora, pantalla, pasos, mensaje y captura.  Ramos.Rey@inventec.com' 60 440 790 24 13 $ink
  $support.ActionSettings(1).Hyperlink.Address = 'mailto:Ramos.Rey@inventec.com'
  Add-Text $s 'Manual v2.0 · Validado para KittyHP · Julio 2026' 650 477 270 18 9 $muted $false 3 | Out-Null

  # Reimport workflow, after original Pareto.
  $s = Add-SectionSlide 15 'IMPORTACIÓN' 'Importar nuevamente el mismo archivo' 'La coincidencia actualiza el grupo existente y evita duplicados.'
  $steps = @(
    @{x=42; n='1'; t='Buscar coincidencia'; d='Fecha + Family normalizada + Top Issue + Category.'},
    @{x=338; n='2'; t='Decidir'; d='Si existe, actualiza. Si no existe, crea un grupo nuevo.'},
    @{x=634; n='3'; t='Confirmar'; d='Procesa todos los registros restantes, aunque un filtro los oculte.'}
  )
  foreach ($step in $steps) {
    Add-Rect $s $step.x 155 270 160 $white $line $true | Out-Null
    $circle = Add-Rect $s ($step.x + 20) 177 38 38 $brand $null $true
    $circle.AutoShapeType = 9
    Add-Text $s $step.n ($step.x + 20) 186 38 22 15 $white $true 2 | Out-Null
    Add-Text $s $step.t ($step.x + 72) 180 175 22 14 $navy $true | Out-Null
    Add-Text $s $step.d ($step.x + 20) 232 230 58 12 $ink | Out-Null
  }
  Add-Rect $s 42 345 862 112 $amberPale (Color '#E7C55B') $true | Out-Null
  Add-Text $s 'Qué se conserva' 62 365 180 20 13 (Color '#8A5B00') $true | Out-Null
  Add-Text $s 'Las imágenes, Repair Result, Actions y el estado de revisión deben mantenerse al actualizar. Return se deja sin autollenado durante la importación; revísalo antes de guardar cambios manuales.' 62 397 810 48 13 $ink | Out-Null

  # Excel field mapping, directly after the original import-flow slide.
  $s = Add-SectionSlide 12 'IMPORTACIÓN' 'De dónde sale cada dato' 'Mapeo usado por KittyHP al preparar la vista previa.'
  Add-Cell $s 'Excel / origen' 40 140 310 36 $navy $navy 12 $white $true
  Add-Cell $s 'KittyHP' 350 140 250 36 $navy $navy 12 $white $true
  Add-Cell $s 'Regla' 600 140 320 36 $navy $navy 12 $white $true
  $mapping = @(
    @('Family', 'Family', 'Normaliza el nombre del segmento.'),
    @('FailureDescription', 'Top Issue', 'Agrupa descripciones iguales.'),
    @('Cause', 'Category', 'Convierte códigos BM/MB, DB, BP, WW/NN…'),
    @('MajorPart', 'Major Part', 'Conserva el código de la pieza.'),
    @('CUSTSN / Remark', 'SN / Remark', 'Se guarda como detalle de origen.'),
    @('Station-50_Fail', 'Failure Qty', 'Cuenta las fallas del grupo.'),
    @('Station-50_Input', 'Build Qty', 'Obtiene el total de entrada.')
  )
  $y = 176
  foreach ($row in $mapping) {
    Add-Cell $s $row[0] 40 $y 310 37 $white $line 11 $ink $true
    Add-Cell $s $row[1] 350 $y 250 37 $white $line 11 $brand $true
    Add-Cell $s $row[2] 600 $y 320 37 $white $line 10.5 $ink $false
    $y += 37
  }
  Add-Rect $s 40 449 880 37 $pale $line $true | Out-Null
  Add-Text $s 'F/R = Failure Qty ÷ Build Qty × 100. La fecha se obtiene del nombre y puede ajustarse globalmente en la vista previa.' 56 460 846 18 11 $navy $true | Out-Null

  # Checklist before the original import slide.
  $s = Add-SectionSlide 11 'IMPORTACIÓN' 'Antes de importar Excel' 'Una verificación de 30 segundos evita la mayoría de los rechazos.'
  Add-BulletList $s @(
    'Usa un archivo .xlsx con el patrón: Reporte MM DD Est.50.xlsx.',
    'Incluye exactamente las hojas Station-50_Fail y Station-50_Input.',
    'No renombres encabezados como Family, FailureDescription, Cause o MajorPart.',
    'Cierra el archivo si Excel lo mantiene bloqueado y confirma que no esté dañado.',
    'Durante el spinner, espera o cancela; no navegues a otra interfaz.'
  ) 55 145 510 14 52
  Add-Rect $s 610 150 295 110 $greenPale (Color '#9FD4C5') $true | Out-Null
  Add-Text $s 'Ejemplo correcto' 632 169 230 20 13 $green $true | Out-Null
  Add-Text $s 'Reporte 07 23 Est.50.xlsx' 632 207 235 24 15 $navy $true | Out-Null
  Add-Rect $s 610 285 295 110 $redPale (Color '#F3A8B4') $true | Out-Null
  Add-Text $s 'Ejemplo incorrecto' 632 304 230 20 13 $red $true | Out-Null
  Add-Text $s 'Reporte final.xlsx' 632 342 235 24 15 $ink $true | Out-Null
  Add-Rect $s 610 420 295 60 $pale $line $true | Out-Null
  Add-Text $s 'La fecha queda editable antes de confirmar.' 630 440 255 22 11 $navy $true 2 | Out-Null

  # Multiuser behavior, after report consultation.
  $s = Add-SectionSlide 7 'REPORTES' 'Actualización entre equipos' 'Los cambios guardados aparecen automáticamente, pero no existe edición colaborativa del mismo formulario.'
  Add-Rect $s 45 150 260 210 $white $line $true | Out-Null
  Add-Text $s '1' 65 170 35 35 22 $brand $true | Out-Null
  Add-Text $s 'Guardar' 110 174 160 24 16 $navy $true | Out-Null
  Add-Text $s 'El cambio llega al servidor únicamente al seleccionar Guardar.' 65 220 210 70 13 $ink | Out-Null
  Add-Rect $s 350 150 260 210 $white $line $true | Out-Null
  Add-Text $s '2' 370 170 35 35 22 $brand $true | Out-Null
  Add-Text $s 'Refrescar' 415 174 160 24 16 $navy $true | Out-Null
  Add-Text $s 'El listado consulta silenciosamente nuevos datos aproximadamente cada 15 segundos.' 370 220 210 75 13 $ink | Out-Null
  Add-Rect $s 655 150 260 210 $white $line $true | Out-Null
  Add-Text $s '3' 675 170 35 35 22 $brand $true | Out-Null
  Add-Text $s 'Evitar conflictos' 720 174 170 24 16 $navy $true | Out-Null
  Add-Text $s 'Dos formularios abiertos no se fusionan. Actualiza antes de editar el mismo registro.' 675 220 210 75 13 $ink | Out-Null
  Add-Rect $s 45 390 870 70 $amberPale (Color '#E7C55B') $true | Out-Null
  Add-Text $s 'Recomendación: si otra persona trabaja en el mismo reporte, coordinen quién lo edita y vuelve a guardar.' 70 414 820 25 13 $ink $true 2 | Out-Null

  # Permissions matrix after the original scope slide.
  $s = Add-SectionSlide 3 'INTRODUCCIÓN' 'Permisos por rol' 'Usa esta matriz para saber qué acciones están disponibles para cada cuenta.'
  $x0 = 40; $y0 = 142
  Add-Cell $s 'Acción' $x0 $y0 370 38 $navy $navy 12 $white $true
  Add-Cell $s 'Admin' 410 $y0 170 38 $navy $navy 12 $white $true 2
  Add-Cell $s 'User' 580 $y0 170 38 $navy $navy 12 $white $true 2
  Add-Cell $s 'Viewer' 750 $y0 170 38 $navy $navy 12 $white $true 2
  $permissions = @(
    @('Ver reportes y Overall', 'Sí', 'Sí', 'Sí'),
    @('Crear, editar y eliminar reportes', 'Sí', 'Sí', 'No'),
    @('Importar Excel', 'Sí', 'Sí', 'No'),
    @('Descargar Excel', 'Sí', 'Sí', 'No'),
    @('Editar y guardar Overall', 'Sí', 'Sí', 'No'),
    @('Administrar catálogos', 'Sí', 'Sí', 'No'),
    @('Administrar usuarios', 'Sí', 'No', 'No')
  )
  $y = 180
  foreach ($row in $permissions) {
    Add-Cell $s $row[0] $x0 $y 370 39 $white $line 11.5 $ink $false
    for ($i = 1; $i -le 3; $i++) {
      $value = $row[$i]
      $cellColor = if ($value -eq 'Sí') { $green } else { $muted }
      Add-Cell $s $value (410 + (($i - 1) * 170)) $y 170 39 $white $line 11.5 $cellColor $true 2
    }
    $y += 39
  }

  # Contents directly after the cover.
  $s = Add-SectionSlide 2 'CONTENIDO' 'Contenido del manual' 'Selecciona una sección durante la presentación para ir directamente a ella.'
  $cards = @(
    @{x=40; y=145; title='ACCESO'; desc='Roles, inicio de sesión y recuperación.'; target='Permisos por rol'; color=$brand},
    @{x=340; y=145; title='REPORTES'; desc='Consultar, crear, editar, imágenes y Return.'; target='Consultar y filtrar reportes'; color=$blue},
    @{x=640; y=145; title='IMPORTACIÓN'; desc='Excel, vista previa, exclusiones y Pareto.'; target='Antes de importar Excel'; color=$green},
    @{x=40; y=310; title='OVERALL'; desc='Cálculos, familias y vistas semanales.'; target='Consultar Overall'; color=$navy},
    @{x=340; y=310; title='CONFIGURACIÓN'; desc='Catálogos y administración de usuarios.'; target='Administrar catálogos'; color=$amber},
    @{x=640; y=310; title='AYUDA'; desc='Atajos, alertas, diagnóstico y soporte.'; target='Atajos de teclado'; color=$red}
  )
  foreach ($card in $cards) {
    $shape = Add-Rect $s $card.x $card.y 270 130 $white $line $true
    Add-Rect $s $card.x $card.y 270 8 $card.color $null $false | Out-Null
    Add-Text $s $card.title ($card.x + 20) ($card.y + 26) 225 22 14 $card.color $true | Out-Null
    Add-Text $s $card.desc ($card.x + 20) ($card.y + 60) 225 48 12 $ink | Out-Null
    Set-SlideLink $shape $card.target
  }

  # Global wording and terminology corrections.
  Replace-AllText 'By Rey David Ramos Murillo' 'Elaborado por Rey David Ramos Murillo'
  Replace-AllText 'Versión 1.0' 'Versión 2.0'
  Replace-AllText 'La barra superior permanece disponible en todas las interfaces.' 'La barra superior permanece disponible en todas las interfaces autenticadas.'
  Replace-AllText 'Filas por página:' 'Número de filas por página:'
  Replace-AllText 'Navegar páginas:' 'Navegar entre páginas:'
  Replace-AllText 'Total de registros:' 'Número total de registros:'
  Replace-AllText 'Top issue' 'Top Issue'
  Replace-AllText 'Major part' 'Major Part'

  # Improve high-value existing slides without changing their overall composition.
  $authSlide = Find-Slide 'Registro y recuperación'
  if ($null -ne $authSlide) {
    foreach ($shape in $authSlide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like 'Completa correo*') {
        $shape.TextFrame.TextRange.Text = 'Completa el correo y una contraseña de 8–128 caracteres. El código tiene 6 dígitos, dura 10 minutos y admite 5 intentos.'
        $shape.TextFrame.TextRange.Font.Size = 10.5
      }
      if ($text -like 'Solicita el código*') {
        $shape.TextFrame.TextRange.Text = 'Solicita el código, valida tu identidad dentro de 10 minutos y define una nueva contraseña.'
        $shape.TextFrame.TextRange.Font.Size = 10.5
      }
    }
  }

  $detailsSlide = Find-Slide 'Detalles e imágenes'
  if ($null -ne $detailsSlide) {
    foreach ($shape in $detailsSlide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like 'Fail picture y Evidence*') {
        $shape.TextFrame.TextRange.Text = 'Hasta 10 Fail Pictures y 10 Evidence por reporte.'
      }
    }
  }

  $returnSlide = Find-Slide 'Return Yes y Return No'
  if ($null -ne $returnSlide) {
    foreach ($shape in $returnSlide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like '*Return No = Failure Qty*') {
        $shape.TextFrame.TextRange.Text = 'Return No = Failure Qty − Return Yes'
      }
      if ($text -like '*Al abrir un formulario*') {
        $shape.TextFrame.TextRange.Text = 'Al abrir o importar, Return No permanece vacío hasta que el usuario lo capture o active el modo automático. Vacío no significa cero.'
      }
    }
  }

  $paretoSlide = Find-Slide 'Lógica del 60%'
  if ($null -ne $paretoSlide) {
    # Rebuild the slide instead of replacing text by wildcard. A title beginning
    # with a number can otherwise be mistaken for one of the numbered steps.
    for ($shapeIndex = $paretoSlide.Shapes.Count; $shapeIndex -ge 1; $shapeIndex--) {
      $paretoSlide.Shapes.Item($shapeIndex).Delete()
    }
    $paretoSlide.FollowMasterBackground = 0
    $paretoSlide.Background.Fill.ForeColor.RGB = $white
    Add-Chrome $paretoSlide 'IMPORTACIÓN'
    Add-Title $paretoSlide 'Cómo funciona el Pareto 60 %' 'Prioriza los grupos que, acumulados, explican al menos el 60 % de los defectos del segmento.'

    $steps = @(
      @{x=45; n='1'; t='Agrupar'; d='Fecha + Family + Top Issue + Category.'},
      @{x=270; n='2'; t='Ordenar'; d='Failure Qty de mayor a menor.'},
      @{x=495; n='3'; t='Acumular'; d='Suma progresiva de los defectos priorizados.'},
      @{x=720; n='4'; t='Detener'; d='Cuando el acumulado alcanza o supera el 60 %.'}
    )
    foreach ($step in $steps) {
      Add-Rect $paretoSlide $step.x 155 195 205 $white $line $true | Out-Null
      $circle = Add-Rect $paretoSlide ($step.x + 18) 176 36 36 $brand $null $true
      $circle.AutoShapeType = 9
      Add-Text $paretoSlide $step.n ($step.x + 18) 184 36 22 14 $white $true 2 | Out-Null
      Add-Text $paretoSlide $step.t ($step.x + 66) 180 108 24 15 $navy $true | Out-Null
      Add-Text $paretoSlide $step.d ($step.x + 18) 232 159 76 12.5 $ink $false 2 | Out-Null
    }

    Add-Rect $paretoSlide 45 392 870 76 $pale $line $true | Out-Null
    Add-Text $paretoSlide 'F/R = Failure Qty ÷ Build Qty × 100' 68 414 355 28 17 $brand $true | Out-Null
    Add-Text $paretoSlide 'La sumatoria Pareto aparece al final de la vista previa.' 455 418 420 22 12.5 $ink $false 2 | Out-Null
  }

  $overallSlide = Find-Slide 'Consultar Overall'
  if ($null -ne $overallSlide) {
    Add-Rect $overallSlide 310 418 580 58 $pale $line $true | Out-Null
    Add-Text $overallSlide 'Input Quantity = filas de entrada  ·  Defect Quantity = filas de falla  ·  Defect Rate = Defect ÷ Input × 100' 330 436 540 24 11 $navy $true 2 | Out-Null
  }

  $catalogSlide = Find-Slide 'Administrar catálogos'
  if ($null -ne $catalogSlide) {
    foreach ($shape in $catalogSlide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like '*Family, Top Issue*') {
        $shape.TextFrame.TextRange.Text = 'Family, Top Issue, Category, Major Part y Failure Factor. Al confirmar una importación, los valores nuevos se crean o reactivan.'
      }
    }
  }

  $exportSlide = Find-Slide 'Descargar Excel'
  if ($null -ne $exportSlide) {
    foreach ($shape in $exportSlide.Shapes) {
      $text = Get-ShapeText $shape
      if ($text -like '*imágenes*' -or $text -like '*Fail picture*') {
        if ($text.Length -lt 250) {
          $shape.TextFrame.TextRange.Text = 'Las imágenes se exportan en columnas numeradas: Fail Picture 1…N y Evidence 1…N. Viewer no puede descargar.'
        }
      }
    }
  }

  # Final editorial polish: remove transient error states captured while the
  # local API was unavailable and keep all examples in a clean, normal state.
  $actionsSlide = Find-Slide 'Acciones del listado'
  if ($null -ne $actionsSlide) {
    # Replace the broken thumbnail from the source capture with a neutral
    # carousel example that still documents arrows and the position counter.
    Add-Rect $actionsSlide 678 164 76 50 $white $line $true | Out-Null
    Add-Rect $actionsSlide 697 169 38 37 $pale $line $true | Out-Null
    Add-Text $actionsSlide '‹' 683 179 12 16 12 $brand $true 2 | Out-Null
    Add-Text $actionsSlide '›' 739 179 12 16 12 $brand $true 2 | Out-Null
    Add-Rect $actionsSlide 716 194 23 15 $ink $null $true | Out-Null
    Add-Text $actionsSlide '1/3' 718 197 19 9 7 $white $true 2 | Out-Null
  }

  $paginationSlide = Find-Slide 'Paginación del listado'
  if ($null -ne $paginationSlide) {
    foreach ($shape in $paginationSlide.Shapes) {
      $text = Get-ShapeText $shape
      switch ($text) {
        'Numero de filas por pagina' { $shape.TextFrame.TextRange.Text = 'Número de filas por página' }
        'Poder navegar entre las pestañas' { $shape.TextFrame.TextRange.Text = 'Navegar entre páginas' }
        'Numero de registros totales' { $shape.TextFrame.TextRange.Text = 'Número total de registros' }
        'Esta serie de botones se ajusta dinámicamente de acuerdo al numero de registros guardados.' {
          $shape.TextFrame.TextRange.Text = 'Los controles se ajustan dinámicamente según el número de registros guardados.'
        }
        'Acomodar numero de filas por pagina de acuerdo al tamaño de tu pantalla.' {
          $shape.TextFrame.TextRange.Text = 'Ajusta el número de filas por página de acuerdo con el tamaño de tu pantalla.'
        }
      }
    }
  }

  $createSlide = Find-Slide 'Crear un reporte'
  if ($null -ne $createSlide) {
    Add-Rect $createSlide 275 181 650 18 $white $null $false | Out-Null
  }

  $detailsImagesSlide = Find-Slide 'Detalles e imágenes'
  if ($null -ne $detailsImagesSlide) {
    Add-Rect $detailsImagesSlide 260 181 665 10 $white $null $false | Out-Null
  }

  $viewEditSlide = Find-Slide 'Visualizar y editar un reporte'
  if ($null -ne $viewEditSlide) {
    Add-Rect $viewEditSlide 286 181 642 18 $white $null $false | Out-Null
    # The source slide also contains a second numbered callout over the same
    # transient banner. Remove that callout completely so the white cleanup
    # rectangle does not leave an isolated orange semicircle behind.
    for ($shapeIndex = $viewEditSlide.Shapes.Count; $shapeIndex -ge 1; $shapeIndex--) {
      $shape = $viewEditSlide.Shapes.Item($shapeIndex)
      $shapeText = Get-ShapeText $shape
      if (($shape.Left -gt 840 -and $shape.Top -ge 180 -and $shape.Top -lt 215) -or
          ($shapeText -eq 'Guardar' -and $shape.Left -gt 840)) {
        $shape.Delete()
      }
    }
  }

  if ($null -ne $overallSlide) {
    Add-Rect $overallSlide 268 218 648 18 $white $null $false | Out-Null
  }

  # These titles also appear in the contents/permissions slides, so use their
  # final fixed positions instead of the first partial-text match.
  $catalogSlide = $presentation.Slides.Item(26)
  Add-Rect $catalogSlide 282 248 638 22 $white $null $false | Out-Null

  $usersSlide = $presentation.Slides.Item(27)
  Add-Rect $usersSlide 266 216 652 22 $white $null $false | Out-Null

  if ($null -ne $returnSlide) {
    # Give the automatic-mode explanation enough vertical room so no text is
    # clipped at the bottom of the card.
    Add-Rect $returnSlide 525 168 285 165 $pale $null $true | Out-Null
    Add-Text $returnSlide 'Modo manual' 555 201 220 24 15 $brand $true | Out-Null
    Add-Text $returnSlide 'Captura ambos valores y guarda.' 555 238 220 20 12 $ink | Out-Null
    Add-Text $returnSlide 'Modo automático' 555 274 220 24 15 $green $true | Out-Null
    Add-Text $returnSlide 'El sistema calcula Return No.' 555 306 220 18 11.5 $ink | Out-Null
  }

  # Normalize metadata and accessibility.
  try { $presentation.BuiltInDocumentProperties.Item('Title').Value = 'KittyHP — Manual de usuario' } catch {}
  try { $presentation.BuiltInDocumentProperties.Item('Subject').Value = 'Manual operativo de KittyHP: Reportes, importación Excel, Overall FPF Trend y configuración.' } catch {}
  try { $presentation.BuiltInDocumentProperties.Item('Author').Value = 'Rey David Ramos Murillo' } catch {}
  try { $presentation.BuiltInDocumentProperties.Item('Keywords').Value = 'KittyHP; manual; reparación; Overall FPF Trend; importación Excel' } catch {}
  try { $presentation.BuiltInDocumentProperties.Item('Comments').Value = 'Versión 2.0 · Julio 2026' } catch {}

  # Renumber, refresh footer links and attach alternative text to images.
  for ($index = 1; $index -le $presentation.Slides.Count; $index++) {
    $slide = $presentation.Slides.Item($index)
    foreach ($shape in $slide.Shapes) {
      $text = Get-ShapeText $shape
      if ($shape.Top -gt 505 -and $text -match '^\d{2}$') {
        $shape.TextFrame.TextRange.Text = ('{0:00}' -f $index)
      }
      if ($text -like '*Ramos.Rey@inventec.com*') {
        try { $shape.ActionSettings(1).Hyperlink.Address = 'mailto:Ramos.Rey@inventec.com' } catch {}
      }
      try {
        if ($shape.Type -eq 13 -or $shape.Type -eq 11) {
          $shape.AlternativeText = "Captura de KittyHP en la diapositiva $index."
        }
      } catch {}
    }
  }

  if ($presentation.Slides.Count -ne 32) {
    throw "Se esperaban 32 diapositivas, pero se generaron $($presentation.Slides.Count)."
  }

  if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
  }
  $presentation.SaveAs($OutputPath, 24)
  $presentation.Close()
  $presentation = $null

  # PowerPoint COM does not reliably persist BuiltInDocumentProperties on
  # every Office installation. Normalize the package metadata directly so the
  # document is searchable and identifies its owner outside PowerPoint too.
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::Open(
    $OutputPath,
    [System.IO.Compression.ZipArchiveMode]::Update
  )
  try {
    $coreEntry = $archive.GetEntry('docProps/core.xml')
    if ($null -ne $coreEntry) {
      $reader = [System.IO.StreamReader]::new($coreEntry.Open())
      try { $coreText = $reader.ReadToEnd() } finally { $reader.Dispose() }
      $coreText = [regex]::Replace(
        $coreText,
        '<dc:title>.*?</dc:title>',
        '<dc:title>KittyHP — Manual de usuario</dc:title>'
      )
      $coreText = [regex]::Replace(
        $coreText,
        '<dc:creator>.*?</dc:creator>',
        '<dc:creator>Rey David Ramos Murillo</dc:creator>'
      )
      $coreStream = $coreEntry.Open()
      $coreStream.SetLength(0)
      $writer = [System.IO.StreamWriter]::new(
        $coreStream,
        [System.Text.UTF8Encoding]::new($false)
      )
      try { $writer.Write($coreText) } finally { $writer.Dispose() }
    }
  } finally {
    $archive.Dispose()
  }

  Write-Output "Presentación creada: $OutputPath"
  Write-Output 'Diapositivas: 32'
} finally {
  if ($null -ne $presentation) {
    try { $presentation.Close() } catch {}
  }
  try { $powerPoint.Quit() } catch {}
  try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null } catch {}
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
