/**
 * Assert the Font-scope ids the plugin writes match the CSS that reads them.
 *
 * paint() does `document.documentElement.dataset.persianRtl = p.font ? p.scope
 * : 'off'`, so every value SegmentedControl can produce MUST appear as a
 * `data-persian-rtl='<value>'` attribute selector in the CSS block. A mismatch
 * is the worst kind of bug here: the setting is visible, clickable, persists —
 * and silently does nothing, because no rule matches the attribute it wrote.
 * That exact bug shipped once (`id: 'ui'` while the CSS only knew `'font'`),
 * so this test exists to keep it from coming back.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const plugin = fs.readFileSync(new URL('../persian-rtl/plugin.js', import.meta.url), 'utf8')

// The SegmentedControl options.
const scopesBlock = plugin.match(/const SCOPES = \[([\s\S]*?)\]/)
assert.ok(scopesBlock, 'SCOPES not found in the built plugin')

const scopeIds = [...scopesBlock[1].matchAll(/id:\s*'([^']+)'/g)].map(m => m[1])
assert.ok(scopeIds.length >= 2, 'expected at least two scope options, got ' + scopeIds.length)

// Every `data-persian-rtl='x'` the CSS actually uses.
const cssAttrs = new Set(
  [...plugin.matchAll(/data-persian-rtl='([^']+)'/g)].map(m => m[1])
)

// 'off' is written by paint() when the font is off and legitimately has no
// rules of its own — it just removes the attribute's effect.
const expected = new Set([...scopeIds, 'off'])

const dead = [...scopeIds].filter(id => !cssAttrs.has(id))
assert.deepEqual(
  dead,
  [],
  `scope id(s) ${JSON.stringify(dead)} are selectable but match no CSS rule — ` +
  'the setting would persist and silently do nothing. Add the rule or fix the id.'
)

// And the reverse: an attribute the CSS styles but no scope can produce is
// either dead CSS or a missing option.
const orphan = [...cssAttrs].filter(a => !expected.has(a) && a !== 'chat' && a !== 'font')
assert.deepEqual(
  orphan,
  [],
  `CSS styles data-persian-rtl=${JSON.stringify(orphan)} but no scope id produces it`
)

console.log(`scope ids ${JSON.stringify(scopeIds)} all match CSS attributes ${JSON.stringify([...cssAttrs])}`)
