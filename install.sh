#!/usr/bin/env bash
# One-line installer for the Persian RTL Hermes Desktop plugin (Linux / macOS).
#
#   curl -fsSL https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.sh | bash
#
# It downloads the whole persian-rtl/ folder from GitHub and drops it into the
# user's desktop-plugins directory. Unlike the CDN-based sibling project, this
# does NOT stream plugin.js and rely on remote fonts -- the font is embedded in
# plugin.js, so the result works fully offline, which matters for Iranian users
# behind filtering. Nothing is executed from the internet except this script,
# and it only copies a folder.

set -euo pipefail

REPO="Rpg-420/hermes-agent-rtl"
BRANCH="main"
DEST="persian-rtl"

# Locate Hermes home: $HERMES_HOME, then ~/.hermes
if [ -n "${HERMES_HOME:-}" ] && [ -d "${HERMES_HOME}" ]; then
  HERMES_HOME_DIR="$HERMES_HOME"
else
  HERMES_HOME_DIR="$HOME/.hermes"
fi

PLUGIN_ROOT="$HERMES_HOME_DIR/desktop-plugins"
TARGET="$PLUGIN_ROOT/$DEST"

echo ""
echo "  Persian RTL for Hermes Desktop - installer"
echo ""
echo "  Hermes home : $HERMES_HOME_DIR"
echo "  Installing to: $TARGET"
echo ""

mkdir -p "$PLUGIN_ROOT"

# Download the source archive and pull just the persian-rtl/ folder out of it,
# so we never depend on a CDN for the font (it ships inside plugin.js).
echo "  Downloading plugin..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ARCHIVE="$TMP/src.zip"
curl -fsSL "https://codeload.github.com/$REPO/zip/$BRANCH" -o "$ARCHIVE"

SRC_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP" "$SRC_ROOT"' EXIT
if command -v unzip >/dev/null 2>&1; then
  unzip -q "$ARCHIVE" -d "$SRC_ROOT"
else
  # Fall back to Python's zipfile when unzip isn't installed.
  python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$ARCHIVE" "$SRC_ROOT"
fi

EXTRACTED="$(find "$SRC_ROOT" -mindepth 1 -maxdepth 1 -type d | head -n1)"
SRC="$EXTRACTED/$DEST"
if [ ! -d "$SRC" ]; then
  echo "ERROR: persian-rtl/ folder not found in the downloaded archive" >&2
  exit 1
fi

# Replace any previous copy so an update is clean.
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$SRC/." "$TARGET/"

# Confirm the plugin actually landed and looks like ours.
PLUGIN="$TARGET/plugin.js"
if [ ! -f "$PLUGIN" ]; then
  echo "ERROR: plugin.js missing after copy" >&2
  exit 1
fi
BYTES="$(wc -c < "$PLUGIN" | tr -d ' ')"

echo ""
echo "  Done. plugin.js ($BYTES bytes) installed."
echo ""
echo "  To activate:"
echo "    1. In Hermes Desktop press Ctrl+K (or Cmd+K)."
echo "    2. Run 'Reload desktop plugins' (or just restart the app)."
echo "    3. Settings > Appearance > Language to pick Persian."
echo ""
