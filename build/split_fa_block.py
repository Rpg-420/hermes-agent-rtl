#!/usr/bin/env python3
"""
Replace the inline `const FA = {...}` block in plugin.template.js with a
__FA_PACK__ placeholder, so the pack can be injected from fa.pack.json at build
time instead of living inside the JS source.

Run from the repo root:  python build/split_fa_block.py
Idempotent: a second run is a no-op if the placeholder is already there.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TPL = os.path.join(HERE, 'plugin.template.js')
PLACEHOLDER = 'const FA = /*__FA_PACK__*/'


def main():
    text = open(TPL, encoding='utf-8').read()

    if PLACEHOLDER in text:
        print('already split — nothing to do')
        return

    lines = text.split('\n')

    start = None
    for i, line in enumerate(lines):
        if line.startswith('const FA = {'):
            start = i
            break

    if start is None:
        sys.exit('FAIL: no `const FA = {` in the template')

    # Walk forward to the closing brace at column 0.
    end = None
    for i in range(start + 1, len(lines)):
        if lines[i] == '}':
            end = i
            break

    if end is None:
        sys.exit('FAIL: no closing brace for the FA block')

    removed = end - start + 1
    backup = TPL + '.pre-split'
    if not os.path.exists(backup):
        open(backup, 'w', encoding='utf-8', newline='').write(text)

    lines[start:end + 1] = [PLACEHOLDER]
    open(TPL, 'w', encoding='utf-8', newline='').write('\n'.join(lines))

    print('removed %d lines, inserted the placeholder' % removed)
    print('backup at %s' % os.path.relpath(backup, ROOT))


if __name__ == '__main__':
    main()
