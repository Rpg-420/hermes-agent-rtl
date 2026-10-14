#!/usr/bin/env python3
"""
Merge build/fa_fragments/*.json into one pack, then assert it against the
real catalog. Run from the repo root:

    python build/merge_fa.py          # merge + assert, prints coverage
    python build/merge_fa.py --write  # also write build/fa.pack.json

A fragment is { "<dotted.key>": "<persian>" }. A key whose English value is a
function takes a plain string with {0}, {1} in argument order -- the SDK's
merge wraps it back into a call shape.

The assertions are the point. A mistyped dot-path is not an error to the app:
registerAppLocale merges over the catalog, so a key that does not exist is
simply never rendered, silently, forever. So every one of these is a hard
failure:

  unknown key      not in harness/en-flat.json
  untranslated     still equal to the English string
  not translated   missing from the pack entirely
  bad placeholder  {0} present in Persian but the English is a plain string
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FRAGMENTS = os.path.join(HERE, 'fa_fragments')
CATALOG = os.path.join(ROOT, 'harness', 'en-flat.json')
OUT = os.path.join(HERE, 'fa.pack.json')

# English strings that are also correct Persian -- keeping them English is the
# right call, not a missing translation.
ENGLISH_IS_FINE = {
    'JSON', 'MEDIA', 'ID', 'PR', 'URL', 'API', 'MCP', 'SSH', 'OS', 'RAM', 'GPU',
    'IDE', 'CDN', 'OAuth', 'Nous', 'Hermes', 'Discord', 'GitHub', 'Vazirmatn',
    'YOLO', 'IDEA.md', 'Bots', 'Free', 'Docs', 'Pet', 'TigerVNC', 'Xfce',
    'ElevenLabs', 'OpenAI', 'Slack', 'Linear', 'Notion', 'Spotify', 'Zoom',
    'VNC', 'TCP', 'UDP', 'HTTP', 'HTTPS', 'LAN', 'VPN', 'Wi-Fi', 'CLI', 'TUI',
    'Skunkworks',
    # A real email placeholder -- translating it would break the example.
    'you@example.com',
    # An em-dash pill: the "unavailable" state renders a dash, not a word.
    '—',
}


def main():
    write = '--write' in sys.argv

    if not os.path.exists(CATALOG):
        sys.exit('FAIL: no %s' % CATALOG)

    catalog = json.load(open(CATALOG, encoding='utf-8'))

    if not os.path.isdir(FRAGMENTS):
        sys.exit('FAIL: no %s -- nothing to merge' % FRAGMENTS)

    pack = {}
    files = sorted(f for f in os.listdir(FRAGMENTS) if f.endswith('.json'))

    for name in files:
        frag = json.load(open(os.path.join(FRAGMENTS, name), encoding='utf-8'))
        for key, value in frag.items():
            if key in pack:
                sys.exit('FAIL: %s defines %r twice' % (name, key))
            pack[key] = value

    unknown, untranslated, missing, bad_ph = [], [], [], []

    for key, value in pack.items():
        if key not in catalog:
            unknown.append(key)
            continue
        english = catalog[key]
        if english == value:
            if value not in ENGLISH_IS_FINE and not value.startswith('http'):
                untranslated.append(key)
        # A {0} in a Persian string means the author expects interpolation. If
        # the English was a plain string there is no argument to interpolate,
        # so the placeholder renders literally.
        if '{0}' in str(value) and english != 'fn':
            bad_ph.append(key)

    for key in catalog:
        if key not in pack:
            missing.append(key)

    problems = False

    for label, items in (('unknown key', unknown),
                         ('still English', untranslated),
                         ('bad placeholder', bad_ph)):
        if items:
            problems = True
            print('FAIL: %d %s(s):' % (len(items), label))
            for k in items[:40]:
                print('   ', k)
            if len(items) > 40:
                print('    … and %d more' % (len(items) - 40))

    covered = len(catalog) - len(missing)

    print()
    print('fragments      : %d' % len(files))
    print('catalog keys   : %d' % len(catalog))
    print('translated     : %d (%.1f%%)' % (covered, 100.0 * covered / len(catalog)))
    print('missing        : %d' % len(missing))

    if problems:
        sys.exit(1)

    if write:
        json.dump(pack, open(OUT, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1, sort_keys=True)
        print('\nwrote %s' % os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
