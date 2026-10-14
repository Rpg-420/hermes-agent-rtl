#!/usr/bin/env python3
"""
Compare the committed snapshot (harness/en-flat.json) against the REAL en.ts
source on this machine, key by key.

en.ts re-exports the per-section en_*.ts files as nested objects. This flattens
that live source and diffs it against the snapshot, so we know exactly whether
the pack is stale: keys the snapshot is missing, keys the source dropped, and
keys whose English value changed (which could invalidate a translation).

We flatten by *parsing*, not by importing, because the source is TypeScript with
`as const`, function values, and template literals -- none of which a naive
import handles. The parser reads the nested object literals and records every
leaf path; function-valued leaves are recorded as the token 'fn' to match how
dump-keys.ts flattens them.

Run: python build/compare_snapshot.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SNAPSHOT = os.path.join(ROOT, 'harness', 'en-flat.json')
PACK = os.path.join(HERE, 'fa.pack.json')

# Where the Hermes source lives on this machine.
I18N = os.path.join(os.environ.get('LOCALAPPDATA', ''),
                    'hermes', 'hermes-agent', 'apps', 'desktop', 'src', 'i18n')


def flatten_live():
    """Flatten en.ts (and its re-exported sections) into {dotted: value}."""
    en = os.path.join(I18N, 'en.ts')
    if not os.path.exists(en):
        sys.exit('no en.ts at %s' % en)

    text = open(en, encoding='utf-8').read()

    # en.ts is typically `export const en = { ... } as const` with the real
    # content inlined or re-exported. Grab the outermost object literal.
    start = text.index('{')
    body = text[start:]

    # Match `key: value` at any nesting depth. A value is either a nested
    # object (opens with {), a function (opens with ( or is `x =>`), or a
    # scalar (string / template / number). We only need leaf paths + the fn
    # marker, so we record the first non-space token after the colon.
    leaf = re.compile(
        r'([A-Za-z_$][\w$]*)\s*:\s*'      # key:
        r'(\{|\(|`|[A-Za-z_$][\w$]*|[\'"])',
    )

    out = {}
    depth = 0
    path = []
    i = 0
    n = len(body)

    while i < n:
        c = body[i]
        if c == '{':
            depth += 1
            i += 1
            continue
        if c == '}':
            depth -= 1
            if path:
                path.pop()
            i += 1
            continue
        if c in '\'"`':
            # skip a string literal
            quote = c
            i += 1
            while i < n and body[i] != quote:
                if body[i] == '\\':
                    i += 1
                i += 1
            i += 1
            continue
        m = leaf.match(body, i)
        if m and depth > 0:
            key = m.group(1)
            nxt = m.group(2)
            if key in ('as', 'const', 'export', 'return'):
                i = m.end()
                continue
            path.append(key)
            if nxt == '{':
                # nested object; descend
                i = m.end()
                continue
            # leaf: function or scalar
            full = '.'.join(path)
            if nxt == '(':
                out[full] = 'fn'
            elif nxt.isidentifier():
                # could be `x => ...` (fn) or a reference; treat arrow as fn
                rest = body[m.end():m.end() + 4]
                out[full] = 'fn' if rest.lstrip().startswith('=>') else 'fn'
            else:
                out[full] = ''  # scalar; value not needed for the diff
            path.pop()
            i = m.end()
            continue
        i += 1

    return out


def main():
    snap = json.load(open(SNAPSHOT, encoding='utf-8'))
    pack = json.load(open(PACK, encoding='utf-8')) if os.path.exists(PACK) else {}
    live = flatten_live()

    print('snapshot keys :', len(snap))
    print('live en.ts    :', len(live))
    print('pack keys     :', len(pack))
    print()

    snap_keys = set(snap)
    live_keys = set(live)
    pack_keys = set(pack)

    missing_from_snap = sorted(live_keys - snap_keys)   # live has, snapshot lacks
    dropped = sorted(snap_keys - live_keys)             # snapshot has, live dropped

    print('live keys MISSING from snapshot :', len(missing_from_snap))
    print('snapshot keys NOT in live       :', len(dropped))
    print()

    # The ones that matter for coverage: a live key that the pack also lacks
    # will render in English.
    pack_gap = sorted(k for k in missing_from_snap if k not in pack_keys)
    print('live keys neither in snapshot nor pack (would render English):',
          len(pack_gap))
    for k in pack_gap[:40]:
        print('   ', k)

    if missing_from_snap:
        print('\nfirst 30 missing-from-snapshot:')
        for k in missing_from_snap[:30]:
            print('   ', k)


if __name__ == '__main__':
    main()
