#!/usr/bin/env python3
"""
Create a GitHub Release and upload the dist/ zip, using the git credential
that already has push access (no `gh` CLI required).

    python build/publish_release.py

Reads the VERSION from the template, resolves the matching CHANGELOG section
as the release notes, creates the v<version> tag at the current commit (idempotent:
if it exists it is reused), creates the release, and uploads
dist/persian-rtl-<version>.zip as an asset.

The token comes from `git credential fill` for https://github.com -- the same
credential `git push` uses. It is read into memory only and never printed.
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATE = os.path.join(HERE, 'plugin.template.js')
CHANGELOG = os.path.join(ROOT, 'CHANGELOG.md')
ZIP = None  # resolved after we know the version

OWNER = 'Rpg-420'
REPO = 'hermes-agent-rtl'


def git_token():
    """Pull the https://github.com password from git's credential helper."""
    r = subprocess.run(
        ['git', 'credential', 'fill'],
        input='protocol=https\nhost=github.com\n\n',
        capture_output=True, text=True,
    )
    for line in r.stdout.splitlines():
        if line.startswith('password='):
            return line[len('password='):]
    sys.exit('FAIL: no git credential for github.com — push once so the '
             'credential helper caches it, then retry.')


def api(method, url, token, payload=None, raw=None, content_type=None):
    headers = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'persian-rtl-release',
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if raw is not None:
        data = raw
        headers['Content-Type'] = content_type or 'application/octet-stream'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')
        sys.exit('FAIL: %s %s -> %s\n%s' % (method, url, e.code, detail))


def version():
    text = open(TEMPLATE, encoding='utf-8').read()
    m = re.search(r"const VERSION = '([^']+)'", text)
    if not m:
        sys.exit('FAIL: no VERSION in the template')
    return m.group(1)


def notes(v):
    """The CHANGELOG section for this version, minus its heading line."""
    if not os.path.exists(CHANGELOG):
        return 'Release %s' % v
    text = open(CHANGELOG, encoding='utf-8').read()
    m = re.search(r'\n## %s\n(.*?)(?=\n## |\Z)' % re.escape(v), text, re.S)
    return (m.group(1).strip() if m else 'Release %s' % v)


def main():
    v = version()
    tag = 'v' + v
    zip_path = os.path.join(ROOT, 'dist', 'persian-rtl-%s.zip' % v)

    if not os.path.exists(zip_path):
        sys.exit('FAIL: %s missing — run `python build/release.py` first' % zip_path)

    # Tag must point at a commit; use the current HEAD we just pushed.
    sha = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True,
                         text=True, cwd=ROOT).stdout.strip()
    token = git_token()

    base = 'https://api.github.com/repos/%s/%s' % (OWNER, REPO)

    # 1. Ensure the tag exists (create the ref if missing; reuse if present).
    refs = api('GET', '%s/git/refs/tags/%s' % (base, tag), token) \
        if _tag_exists(base, tag, token) else None
    if refs:
        print('tag %s already exists — reusing' % tag)
    else:
        api('POST', '%s/git/refs' % base, token,
            payload={'ref': 'refs/tags/' + tag, 'sha': sha})
        print('created tag %s at %s' % (tag, sha[:8]))

    # 2. Create the release (or fetch it if it already exists).
    existing = _release_exists(base, tag, token)
    if existing:
        print('release %s already exists (id %s) — uploading asset' % (tag, existing['id']))
        release = existing
    else:
        release = api('POST', '%s/releases' % base, token, payload={
            'tag_name': tag,
            'name': tag,
            'body': notes(v),
            'draft': False,
            'prerelease': False,
        })
        print('created release %s (id %s)' % (tag, release['id']))

    # 3. Upload the zip as a release asset. The upload URL has a {?name,label}
    # template suffix we strip and replace with the query.
    upload_url = release['upload_url'].split('{')[0]
    name = os.path.basename(zip_path)
    with open(zip_path, 'rb') as f:
        raw = f.read()

    # If an asset with this name already exists, delete it first so re-runs work.
    for a in release.get('assets', []):
        if a['name'] == name:
            api('DELETE', '%s/releases/assets/%s' % (base, a['id']), token)
            print('replaced existing asset %s' % name)

    asset = api('POST', '%s?name=%s' % (upload_url, name), token, raw=raw,
                content_type='application/zip')
    print('uploaded %s (%d bytes)' % (asset['name'], asset['size']))
    print('\nRelease is live: %s' % release['html_url'])


def _tag_exists(base, tag, token):
    try:
        api('GET', '%s/git/refs/tags/%s' % (base, tag), token)
        return True
    except SystemExit:
        return False


def _release_exists(base, tag, token):
    try:
        r = api('GET', '%s/releases/tags/%s' % (base, tag), token)
        return r
    except SystemExit:
        return None


if __name__ == '__main__':
    main()
