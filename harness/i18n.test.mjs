/**
 * Validate the Persian pack's keys against the app's real catalog.
 *
 * `registerAppLocale` merges a PARTIAL pack over the bundled catalog, so a
 * misspelled key is not an error — it is a string that never renders, quietly.
 * This asserts every key in the pack exists in the flattened en.ts catalog, so
 * a typo fails loudly here instead of shipping as an invisible no-op.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

// The flattened app catalog is a build artifact, not committed: regenerate it
// with `node harness/dump-keys.ts` when you have the Hermes source checked out.
// Without it this test SKIPS rather than fails, so a fresh clone is green.
const CATALOG = new URL('./en-flat.json', import.meta.url)
const hasCatalog = fs.existsSync(CATALOG)
const catalog = hasCatalog ? JSON.parse(fs.readFileSync(CATALOG, 'utf8')) : null
const plugin = fs.readFileSync(new URL('../persian-rtl/plugin.js', import.meta.url), 'utf8')

// Pull the FA object out of the built plugin (it is the argument to
// registerAppLocale) and flatten it the same way the catalog was flattened.
const start = plugin.indexOf('const FA = {')
const end = plugin.indexOf('\n}\n', start) + 3
const faSrc = plugin.slice(start, end).replace('const FA =', 'return')

const flatten = (node, prefix, out) => {
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out)
    else out[path] = v
  }

  return out
}

// eslint-disable-next-line no-new-func
const FA = new Function(faSrc)()
const flat = flatten(FA, '', {})

if (!hasCatalog) {
  console.log('skipped: no harness/en-flat.json — regenerate with `node harness/dump-keys.ts`')
  process.exit(0)
}

console.log('persian-rtl locale pack:', Object.keys(flat).length, 'keys')

const missing = []
const invented = []

const phCount = s => (s.match(/\{\d+\}/g) || []).length

for (const [key, value] of Object.entries(flat)) {
  if (!(key in catalog)) {
    missing.push(key)
    continue
  }

  if (typeof value !== 'string') continue

  // English has a function (an interpolator/plural) where we shipped a string.
  // That is the documented pack shape — the registry wraps a positional {0}
  // form back into a call — so a string here is correct, not a bug. 61 of the
  // pack's formatter entries are labels whose function takes an argument it
  // never interpolates ('افزونه'), and those must stay legal.
  //
  // What IS a bug: a formatter whose Persian invented placeholders the English
  // never passes. The flattened catalog records every function as the bare token
  // 'fn', so the English arity is not visible from here; the asymmetry we can
  // actually see is a Persian string with an implausible number of {N} slots.
  // A pagination range legitimately takes three ('{0} تا {1} از {2}'), so the
  // bar is 4: anything beyond that is a rewrite that made arguments up.
  if (catalog[key] === 'fn' && phCount(value) > 3) {
    invented.push(`${key} (fa has ${phCount(value)} positional placeholders)`)
  }
}

assert.deepEqual(missing, [], 'keys not present in the app catalog')
assert.deepEqual(invented, [], 'placeholders invented in a positional rewrite')

// And the reverse check that matters most: the keys we care about are covered.
for (const key of ['common.save', 'common.cancel', 'language.label', 'sidebar.nav.cron', 'settings.subpages.appearanceTheme']) {
  assert.ok(key in flat, `expected the pack to cover ${key}`)
}

console.log('all keys resolve against the app catalog')
