<#
    Regenerates the raster assets that cannot be SVG:
      assets/apple-touch-icon.png   180x180  (iOS home screen)
      assets/icon-192.png           192x192  (PWA manifest)
      assets/icon-512.png           512x512  (PWA manifest / splash)
      assets/og-cover.png          1200x630  (Open Graph / Twitter card)

    Everything else on the site is vector or CSS. Run from the repo root:
        powershell -ExecutionPolicy Bypass -File tools/generate-assets.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
if (-not (Test-Path $assets)) { New-Item -ItemType Directory -Path $assets | Out-Null }

# Non-ASCII via code points so the script survives any file encoding.
$EnDash = [char]0x2013
$MidDot = [char]0x00B7

# Brand palette (kept in sync with the --tokens in styles.css)
$Black    = [System.Drawing.Color]::FromArgb(255,   0,   0,   0)
$White    = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$Blue     = [System.Drawing.Color]::FromArgb(255,  30, 136, 255)
$BlueLift = [System.Drawing.Color]::FromArgb(255,  90, 169, 255)
$Steel    = [System.Drawing.Color]::FromArgb(255, 159, 179, 200)
$Ink2     = [System.Drawing.Color]::FromArgb(255, 174, 183, 196)

function Get-Family {
    param([string[]]$Candidates, [string]$Fallback = 'Arial')
    $installed = [System.Drawing.FontFamily]::Families | ForEach-Object { $_.Name }
    foreach ($name in $Candidates) { if ($installed -contains $name) { return $name } }
    return $Fallback
}

# Windows ships Bahnschrift, a DIN derivative -- the closest match to the
# condensed aerospace lettering used on the site.
$DisplayFont = Get-Family @('Bahnschrift SemiBold Condensed', 'Bahnschrift Condensed', 'Bahnschrift', 'Segoe UI Semibold') 'Arial'
$SansFont    = Get-Family @('Segoe UI', 'Inter') 'Arial'
$MonoFont    = Get-Family @('Cascadia Mono', 'Consolas') 'Courier New'

function New-Canvas {
    param([int]$Width, [int]$Height)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    return @{ Bitmap = $bmp; Graphics = $g }
}

function Add-RoundedRect {
    param($Path, [float]$X, [float]$Y, [float]$W, [float]$H, [float]$R)
    $d = $R * 2
    $Path.AddArc($X,           $Y,           $d, $d, 180, 90)
    $Path.AddArc($X + $W - $d, $Y,           $d, $d, 270, 90)
    $Path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d,   0, 90)
    $Path.AddArc($X,           $Y + $H - $d, $d, $d,  90, 90)
    $Path.CloseFigure()
}

# Soft radial bloom, approximated by stacking translucent ellipses.
function Add-Glow {
    param($G, [float]$CX, [float]$CY, [float]$Radius, $Color, [int]$Steps = 26, [int]$Peak = 26)
    for ($i = $Steps; $i -ge 1; $i--) {
        $t     = $i / $Steps
        $r     = $Radius * $t
        $alpha = [int]([Math]::Max(1, $Peak * [Math]::Pow(1 - $t, 2.1)))
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, $Color.R, $Color.G, $Color.B))
        $G.FillEllipse($brush, $CX - $r, $CY - $r, $r * 2, $r * 2)
        $brush.Dispose()
    }
}

# The typographic string format measures a lone space as zero width, so the
# advance has to be derived from the difference between a kerned pair.
function Get-SpaceWidth {
    param($G, $Font)
    $fmt   = [System.Drawing.StringFormat]::GenericTypographic
    $tight = $G.MeasureString('nn',  $Font, [System.Drawing.PointF]::Empty, $fmt).Width
    $loose = $G.MeasureString('n n', $Font, [System.Drawing.PointF]::Empty, $fmt).Width
    return [float][Math]::Max(1.0, $loose - $tight)
}

# System.Drawing has no letter-spacing, so draw glyph by glyph.
function Write-Tracked {
    param($G, [string]$Text, $Font, $Brush, [float]$X, [float]$Y, [float]$Tracking = 0)
    $fmt   = [System.Drawing.StringFormat]::GenericTypographic
    $space = Get-SpaceWidth $G $Font
    $cx    = $X
    foreach ($ch in $Text.ToCharArray()) {
        if ($ch -eq ' ') {
            $cx += $space + $Tracking
            continue
        }
        $s = [string]$ch
        $G.DrawString($s, $Font, $Brush, $cx, $Y, $fmt)
        $cx += $G.MeasureString($s, $Font, [System.Drawing.PointF]::Empty, $fmt).Width + $Tracking
    }
    return $cx - $X
}

# ── The orbit-and-core brand mark, matching assets/favicon.svg ───────────────
function Add-Mark {
    param($G, [float]$X, [float]$Y, [float]$Size, [bool]$WithPlate = $true)
    $s = $Size / 64.0

    if ($WithPlate) {
        $plate = New-Object System.Drawing.Drawing2D.GraphicsPath
        Add-RoundedRect $plate $X $Y $Size $Size (12 * $s)
        $bg = New-Object System.Drawing.SolidBrush $Black
        $G.FillPath($bg, $plate)
        $bg.Dispose()

        $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(128, $Blue.R, $Blue.G, $Blue.B)), (2.5 * $s)
        $inner = New-Object System.Drawing.Drawing2D.GraphicsPath
        Add-RoundedRect $inner ($X + 1.25 * $s) ($Y + 1.25 * $s) ($Size - 2.5 * $s) ($Size - 2.5 * $s) (11 * $s)
        $G.DrawPath($edge, $inner)
        $edge.Dispose(); $inner.Dispose(); $plate.Dispose()
    }

    $state = $G.Save()
    $G.TranslateTransform($X + $Size / 2, $Y + $Size / 2)
    $G.RotateTransform(-28)

    $ring = New-Object System.Drawing.Pen $BlueLift, (3.25 * $s)
    $G.DrawEllipse($ring, (-24 * $s), (-9.5 * $s), (48 * $s), (19 * $s))
    $ring.Dispose()
    $G.Restore($state)

    $core = New-Object System.Drawing.SolidBrush $White
    $r = 7.75 * $s
    $G.FillEllipse($core, ($X + $Size / 2 - $r), ($Y + $Size / 2 - $r), ($r * 2), ($r * 2))
    $core.Dispose()
}

# ── Icons ───────────────────────────────────────────────────────────────────
function New-Icon {
    param([int]$Size, [string]$File)
    $c = New-Canvas $Size $Size
    $g = $c.Graphics
    $g.Clear($Black)
    Add-Glow $g ($Size / 2) ($Size / 2) ($Size * 0.55) $Blue 22 18
    Add-Mark $g 0 0 $Size $true
    $path = Join-Path $assets $File
    $c.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $c.Bitmap.Dispose()
    Write-Host "  wrote assets/$File ($Size x $Size)"
}

# ── Open Graph card ─────────────────────────────────────────────────────────
function New-OgCover {
    $W = 1200; $H = 630
    $c = New-Canvas $W $H
    $g = $c.Graphics
    $g.Clear($Black)

    # Upper-right atmospheric bloom
    Add-Glow $g 1010 40 620 $Blue 30 20

    # Planetary limb sweeping across the lower edge
    $limbR  = 1500.0
    $limbCX = $W / 2.0
    $limbCY = $H - 40 + $limbR
    for ($i = 22; $i -ge 1; $i--) {
        $spread = $i * 9.0
        $alpha  = [int]([Math]::Max(1, 30 * [Math]::Pow(1 - ($i / 22.0), 1.6)))
        $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($alpha, $Blue.R, $Blue.G, $Blue.B)), $spread
        $g.DrawEllipse($pen, ($limbCX - $limbR), ($limbCY - $limbR), ($limbR * 2), ($limbR * 2))
        $pen.Dispose()
    }
    $rim = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(205, 180, 220, 255)), 2.25
    $g.DrawEllipse($rim, ($limbCX - $limbR), ($limbCY - $limbR), ($limbR * 2), ($limbR * 2))
    $rim.Dispose()

    $body = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.FillEllipse($body, ($limbCX - $limbR), ($limbCY - $limbR + 3), ($limbR * 2), ($limbR * 2))
    $body.Dispose()

    # Sparse starfield
    $rng = New-Object System.Random 20260830
    for ($i = 0; $i -lt 150; $i++) {
        $sx = $rng.NextDouble() * $W
        $sy = $rng.NextDouble() * ($H * 0.72)
        $sr = 0.5 + $rng.NextDouble() * 1.3
        $sa = 60 + $rng.Next(0, 150)
        $b = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($sa, 255, 255, 255))
        $g.FillEllipse($b, $sx, $sy, ($sr * 2), ($sr * 2))
        $b.Dispose()
    }

    $M = 80.0

    Add-Mark $g $M 74 56 $false

    # Eyebrow
    $fEyebrow = New-Object System.Drawing.Font $MonoFont, 15, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    $bSteel = New-Object System.Drawing.SolidBrush $Steel
    $eyebrow = ("UW{0}MADISON  {1}  B.S. MECHANICAL ENGINEERING  {1}  CLASS OF 2030" -f $EnDash, $MidDot)
    Write-Tracked $g $eyebrow $fEyebrow $bSteel ($M + 78) 92 2.2 | Out-Null

    # Headline
    $fTitle = New-Object System.Drawing.Font $DisplayFont, 132, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $bWhite = New-Object System.Drawing.SolidBrush $White
    Write-Tracked $g 'BUILT,'          $fTitle $bWhite $M 186 1.0 | Out-Null
    Write-Tracked $g 'THEN VERIFIED.'  $fTitle $bWhite $M 312 1.0 | Out-Null

    # Rule
    $rule = New-Object System.Drawing.Pen $Blue, 2.0
    $g.DrawLine($rule, $M, 476, ($M + 190), 476)
    $rule.Dispose()

    # Name + disciplines
    $fName = New-Object System.Drawing.Font $DisplayFont, 44, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    Write-Tracked $g 'COHEN BRYANT' $fName $bWhite $M 500 1.6 | Out-Null

    $fSub = New-Object System.Drawing.Font $SansFont, 22, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    $bInk = New-Object System.Drawing.SolidBrush $Ink2
    $sub = ("Nuclear propulsion  {0}  Thermal systems  {0}  Embedded control" -f $MidDot)
    $g.DrawString($sub, $fSub, $bInk, $M, 556)

    $path = Join-Path $assets 'og-cover.png'
    $c.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $fEyebrow.Dispose(); $fTitle.Dispose(); $fName.Dispose(); $fSub.Dispose()
    $bSteel.Dispose(); $bWhite.Dispose(); $bInk.Dispose()
    $g.Dispose(); $c.Bitmap.Dispose()
    Write-Host "  wrote assets/og-cover.png (1200 x 630)"
}

Write-Host "Generating raster assets..."
Write-Host ("  display face: {0}" -f $DisplayFont)
New-Icon 180 'apple-touch-icon.png'
New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
New-OgCover
Write-Host "Done."
