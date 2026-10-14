# One-line installer for the Persian RTL Hermes Desktop plugin (Windows).
#
#   iwr -useb https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.ps1 | iex
#
# It downloads the whole persian-rtl/ folder from GitHub and drops it into the
# user's desktop-plugins directory. Unlike the CDN-based sibling project, this
# does NOT stream plugin.js and rely on remote fonts -- the font is embedded in
# plugin.js, so the result works fully offline, which matters for Iranian users
# behind filtering. Nothing is executed from the internet except this script,
# and it only copies a folder.

$ErrorActionPreference = "Stop"

$Repo   = "Rpg-420/hermes-agent-rtl"
$Branch = "main"
$Zip    = "$env:TEMP\hermes-persian-rtl.zip"
$Tmp    = "$env:TEMP\hermes-persian-rtl-src"
$Dest   = "persian-rtl"

Write-Host ""
Write-Host "  Persian RTL for Hermes Desktop - installer" -ForegroundColor Cyan
Write-Host ""

# Locate Hermes home: $HERMES_HOME, then %LOCALAPPDATA%\hermes, then ~/.hermes
$HermesHome = $env:HERMES_HOME
if (-not $HermesHome -or -not (Test-Path $HermesHome)) {
    $HermesHome = Join-Path $env:LOCALAPPDATA "hermes"
}
if (-not (Test-Path $HermesHome)) {
    $HermesHome = Join-Path $HOME ".hermes"
}

$PluginRoot = Join-Path $HermesHome "desktop-plugins"
if (-not (Test-Path $PluginRoot)) {
    New-Item -ItemType Directory -Path $PluginRoot -Force | Out-Null
}
$Target = Join-Path $PluginRoot $Dest

Write-Host "  Hermes home : $HermesHome" -ForegroundColor Gray
Write-Host "  Installing to: $Target" -ForegroundColor Gray
Write-Host ""

# Download the source archive and pull just the persian-rtl/ folder out of it,
# so we never depend on a CDN for the font (it ships inside plugin.js).
Write-Host "  Downloading plugin..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://codeload.github.com/$Repo/zip/$Branch" -OutFile $Zip

if (Test-Path $Tmp) { Remove-Item -Recurse -Force $Tmp }
Expand-Archive -Path $Zip -DestinationPath $Tmp -Force

$srcRoot = Get-ChildItem -Path $Tmp -Directory | Select-Object -First 1
$src = Join-Path $srcRoot.FullName $Dest
if (-not (Test-Path $src)) {
    throw "persian-rtl/ folder not found in the downloaded archive"
}

# Replace any previous copy so an update is clean.
if (Test-Path $Target) { Remove-Item -Recurse -Force $Target }
New-Item -ItemType Directory -Path $Target -Force | Out-Null
Copy-Item -Path (Join-Path $src "*") -Destination $Target -Recurse -Force

Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
Remove-Item -Force $Zip -ErrorAction SilentlyContinue

# Confirm the plugin actually landed and looks like ours.
$plugin = Join-Path $Target "plugin.js"
if (-not (Test-Path $plugin)) { throw "plugin.js missing after copy" }
$bytes = (Get-Item $plugin).Length
Write-Host ""
Write-Host "  Done. plugin.js ($bytes bytes) installed." -ForegroundColor Green
Write-Host ""
Write-Host "  To activate:" -ForegroundColor Yellow
Write-Host "    1. In Hermes Desktop press Ctrl+K (or Ctrl+Shift+P)."
Write-Host "    2. Run 'Reload desktop plugins' (or just restart the app)."
Write-Host "    3. Settings > Appearance > Language > English/Persian to pick Persian."
Write-Host ""
