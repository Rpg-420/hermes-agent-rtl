#!/usr/bin/env python3
"""
Assert every fragment against the real catalog WITHOUT requiring full
coverage, then write the pack. Used while the pack is still being translated,
when build.py must be exercised against a partial pack.

    python build/merge_fa_partial.py

merge_fa.py is the real gate and refuses to write while keys are missing --
that is what keeps a half-translated pack from reaching an install. This
script is the same merge with the coverage gate relaxed, for build-path
testing only.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FRAGMENTS = os.path.join(HERE, 'fa_fragments')
CATALOG = os.path.join(ROOT, 'harness', 'en-flat.json')
OUT = os.path.join(HERE, 'fa.pack.json')


def main():
    catalog = json.load(open(CATALOG, encoding='utf-8'))
    pack = {}

    for name in sorted(f for f in os.listdir(FRAGMENTS) if f.endswith('.json')):
        frag = json.load(open(os.path.join(FRAGMENTS, name), encoding='utf-8'))
        for key, value in frag.items():
            if key in pack:
                sys.exit('FAIL: %s defines %r twice' % (name, key))
            pack[key] = value

    unknown = [k for k in pack if k not in catalog]
    if unknown:
        print('FAIL: %d unknown key(s): %s' % (len(unknown), unknown[:10]))
        sys.exit(1)

    json.dump(pack, open(OUT, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1, sort_keys=True)

    covered = len([k for k in pack if k in catalog])
    print('wrote %s -- %d of %d keys (%.1f%%)'
          % (os.path.relpath(OUT, ROOT), covered, len(catalog),
             100.0 * covered / len(catalog)))


if __name__ == '__main__':
    main()
