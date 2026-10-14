#!/usr/bin/env python3
"""
Cut a release: build, verify, zip the distributable, and update the changelog.

    python build/release.py

Reads  build/plugin.template.js   (VERSION lives there)
Writes persian-rtl/plugin.js      (via build/build.py)
       dist/persian-rtl-<version>.zip   the drop-in folder, ready to ship
       CHANGELOG.md             prepended with the new version's entry

The zip contains ONLY the persian-rtl/ folder, because that is the whole
deliverable -- a user unzips it into desktop-plugins/ and is done. The font is
inlined in plugin.js, so the zip is self-contained and works offline.

This does not push a git tag or upload anywhere; it prepares the artifacts and
prints the tag command, so the human decides when the release is public.
"""
import json
import os
import re
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATE = os.path.join(HERE, 'plugin.template.js')
DIST = os.path.join(ROOT, 'dist')
PLUGIN_DIR = os.path.join(ROOT, 'persian-rtl')
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')

# What each version section should say. Keyed by version so release.py is the
# one place a release is described, and CHANGELOG.md can never drift from it.
ENTRIES = {
    '1.2.0': [
        'Persian UI language now covers the whole app — all 5,065 catalog strings, '
        'including the 660 whose English entry is a function (interpolators and '
        'plurals), written as positional {0} placeholders.',
        'Fixed Font scope → "Whole app": the option was selectable but silently '
        'did nothing, because the scope id the setting wrote never matched the '
        'CSS that reads it. The whole-app Vazirmatn face now actually applies.',
        'One-line install: install.ps1 (Windows) and install.sh (Linux/macOS) '
        'download the self-contained persian-rtl/ folder — no CDN, works offline.',
        'The translation pack moved out of plugin.template.js into '
        'build/fa_fragments/, so a typo is a one-file fix, and merge_fa.py fails '
        'the build on any key the real app catalog does not know.',
    ],
    '1.1.0': [
        'Bundled Vazirmatn (v33.003, subset with the variable weight axis and '
        'Persian shaping features) inlined as base64 — fully offline, no CDN.',
        'Smart RTL that keeps code blocks, terminal output, and English replies LTR.',
        'Persian-keyboard @ fix: Shift+2 types @ instead of ٬ in editable fields.',
        'Settings page, title-bar globe, Alt+R, status-bar chip.',
    ],
    '1.0.0': [
        'First public release: فارسی language pack (88 highest-traffic strings), '
        'Vazirmatn font, smart RTL, and the Persian-keyboard @ fix.',
    ],
}


def version():
    text = open(TEMPLATE, encoding='utf-8').read()
    m = re.search(r"const VERSION = '([^']+)'", text)
    if not m:
        sys.exit('FAIL: no VERSION in the template')
    return m.group(1)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit('FAIL: %s exited %d' % (' '.join(cmd), r.returncode))
    return r.stdout


def main():
    v = version()

    print('release %s' % v)
    print('  building…')
    run([sys.executable, os.path.join(HERE, 'build.py')])

    if v not in ENTRIES:
        sys.exit('FAIL: no CHANGELOG entry for %s — add one to ENTRIES in release.py' % v)

    # Verify the built module loads and every test passes before shipping.
    print('  verifying…')
    for t in ('atfix.test.mjs', 'i18n.test.mjs', 'scope.test.mjs'):
        out = run(['node', os.path.join(ROOT, 'harness', t)])
        print('    %s ok' % t)

    # Zip ONLY the persian-rtl folder — that is the whole deliverable.
    os.makedirs(DIST, exist_ok=True)
    zip_path = os.path.join(DIST, 'persian-rtl-%s.zip' % v)
    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in sorted(os.listdir(PLUGIN_DIR)):
            full = os.path.join(PLUGIN_DIR, name)
            if os.path.isfile(full):
                z.write(full, os.path.join('persian-rtl', name))

    size = os.path.getsize(zip_path)
    print('  zip: %s (%d bytes)' % (os.path.relpath(zip_path, ROOT), size))

    # Prepend the changelog entry.
    stamp = '## %s\n\n' % v + '\n'.join('- %s' % e for e in ENTRIES[v]) + '\n'
    existing = open(CHANGELOG, encoding='utf-8').read() if os.path.exists(CHANGELOG) else ''
    # Drop any previous section for this same version so re-running is idempotent.
    existing = re.sub(r'\n## %s\n.*?(?=\n## |\Z)' % re.escape(v), '', existing, flags=re.S)
    header = '# Changelog\n\nAll notable changes to the Persian RTL plugin.\n'
    body = existing[len(header):].lstrip('\n') if existing.startswith(header) else existing.lstrip('\n')
    open(CHANGELOG, 'w', encoding='utf-8', newline='').write(header + '\n' + stamp + '\n' + body)
    print('  CHANGELOG.md updated')

    print()
    print('ready. when you want it public:')
    print('  git add -A && git commit -m "release %s"' % v)
    print('  git tag -a v%s -m "v%s"' % (v, v))
    print('  git push origin main --tags')
    print('  gh release create v%s dist/persian-rtl-%s.zip' % (v, v))


if __name__ == '__main__':
    main()
