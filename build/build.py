"""Build persian-rtl/plugin.js from the template and the bundled font.

Run from the repo root:

    python build/build.py

Reads  build/plugin.template.js   (the source — edit this, not the output)
       assets/fonts/Vazirmatn-Variable.woff2
Writes persian-rtl/plugin.js      (the distributable, font inlined as base64)

The build asserts three things before writing, because each one has already
cost a debugging cycle:

  1. the template's placeholders are all filled;
  2. no CR survives (the app's runtime loader choked on CRLF once);
  3. the three CSS template literals contain no stray backtick — a backtick
     inside a template literal closes it and pushes the following CSS text
     into code position, which surfaces as a baffling
     `SyntaxError: Unexpected token '!'` from the SDK bundle rather than from
     the plugin.

It then loads the built module through stub shims to prove it parses and
evaluates, so a broken build never reaches an install.

The Persian language pack is injected the same way: build/merge_fa.py merges
build/fa_fragments/*.json into build/fa.pack.json and asserts it against the
real catalog, and this script substitutes that object for the __FA_PACK__
placeholder. A mistyped dot-path is not an error to the app -- registerAppLocale
merges over the catalog, so a key that does not exist is simply never rendered,
silently. merge_fa.py makes that a build failure instead.

"""
import base64
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TEMPLATE = os.path.join(HERE, 'plugin.template.js')
FONT = os.path.join(ROOT, 'assets', 'fonts', 'Vazirmatn-Variable.woff2')
FA_PACK = os.path.join(HERE, 'fa.pack.json')
OUT = os.path.join(ROOT, 'persian-rtl', 'plugin.js')
HARNESS = os.path.join(ROOT, 'harness')

CSS_LITERALS = ('const CSS = `', 'const FONT_CSS = `', 'const SIZE_CSS = `')


def fail(msg):
    sys.exit('FAIL: ' + msg)


def main():
    for path in (TEMPLATE, FONT):
        if not os.path.exists(path):
            fail('missing %s' % path)

    template = open(TEMPLATE, encoding='utf-8').read()
    font_b64 = base64.b64encode(open(FONT, 'rb').read()).decode('ascii')

    if '__FONT_BASE64__' not in template:
        fail('template has no __FONT_BASE64__ placeholder')

    out = template.replace('__FONT_BASE64__', font_b64)

    if '__FONT_BASE64__' in out:
        fail('placeholder survived the substitution')

    # The language pack. Injected as a JS object literal rather than JSON so the
    # output stays readable in a debugger, which means a Persian string
    # containing a backslash or a double quote has to be escaped -- a bare
    # `JSON.stringify` would be wrong here.
    if '__FA_PACK__' in template:
        if not os.path.exists(FA_PACK):
            fail('template has a __FA_PACK__ placeholder but no %s -- '
                 'run `python build/merge_fa.py --write` first' % FA_PACK)

        fa = json.load(open(FA_PACK, encoding='utf-8'))
        literal = '{\n' + ',\n'.join(
            '  %s: %s' % (json.dumps(k, ensure_ascii=False),
                          json.dumps(v, ensure_ascii=False))
            for k, v in sorted(fa.items())) + '\n}'

        out = out.replace('const FA = /*__FA_PACK__*/', 'const FA = ' + literal)

    if '__FA_PACK__' in out:
        fail('__FA_PACK__ placeholder survived the substitution')

    if '\r' in out:
        fail('CR in output — write with newline="" (the loader rejects CRLF)')

    for marker in CSS_LITERALS:
        start = out.index(marker) + len(marker)
        body = out[start:out.index('`', start)]
        if '`' in body:
            fail('stray backtick inside the %r template literal' % marker)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    # Prove it loads before shipping: the harness imports the module through
    # the same specifier rewrite the app's runtime loader performs.
    subject = os.path.join(HARNESS, 'subject.js')
    open(subject, 'w', encoding='utf-8', newline='').write(out)

    if os.path.exists(os.path.join(HARNESS, 'run.mjs')):
        r = subprocess.run(['node', os.path.join(HARNESS, 'run.mjs')],
                           capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stdout + r.stderr)
            fail('built module does not load')
        print(r.stdout.strip())

    open(OUT, 'w', encoding='utf-8', newline='').write(out)
    print('OK: %s (%d bytes, font %d b64 chars)'
          % (os.path.relpath(OUT, ROOT), len(out.encode('utf-8')), len(font_b64)))


if __name__ == '__main__':
    main()
