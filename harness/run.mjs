/**
 * Load the built plugin through stub shims, proving it parses AND evaluates.
 *
 * This is the local stand-in for what the app's runtime loader does: rewrite the
 * three allowed import specifiers (`@hermes/plugin-sdk`, `react`,
 * `react/jsx-runtime`) to shim modules, then `import()` the result. The shims
 * export inert stubs, so anything the plugin touches at module scope has to
 * survive without a real app — which is exactly the contract a disk plugin has.
 *
 * build/build.py runs this automatically; run it directly with `node harness/run.mjs`.
 */
import fs from 'node:fs'

const subject = new URL('./subject.js', import.meta.url)

if (!fs.existsSync(subject)) {
  console.error('No harness/subject.js — run `python build/build.py` first (it writes it).')
  process.exit(2)
}

const src = fs.readFileSync(subject, 'utf8')

const out = src
  .replace("from '@hermes/plugin-sdk'", "from './shim-sdk.js'")
  .replace("from 'react/jsx-runtime'", "from './shim-jsx.js'")
  .replace("from 'react'", "from './shim-react.js'")

fs.writeFileSync(new URL('./subject.rewritten.js', import.meta.url), out, 'utf8')

const mod = await import('./subject.rewritten.js')

const plugin = mod.default

if (!plugin?.id || typeof plugin.register !== 'function') {
  console.error('FAIL: default export is not a valid HermesPlugin')
  process.exit(1)
}

// Drive register() against a recording context, so a throw inside register —
// the other half of "does it load" — fails here rather than in someone's app.
const registered = []

const ctx = {
  source: 'plugin:' + plugin.id,
  register: c => { registered.push(`${c.area}/${c.id}`); return () => {} },
  registerMany: cs => { for (const c of cs) registered.push(`${c.area}/${c.id}`); return () => {} },
  registerSettingsPage: p => { registered.push(`settings/${p.id}`); return () => {} },
  rest: async () => ({}),
  socket: () => () => {},
  os: {
    notify() {},
    openExternal: async () => false,
    revealPath: async () => false,
    writeClipboard: async () => false
  },
  storage: { get: (_k, fallback) => fallback, set() {}, remove() {} },
  i18n: { register: () => () => {}, registerAppLocale: () => () => {}, t: k => k, onLocaleChange: () => () => {} },
  onDispose: () => {},
  onEvent: () => () => {},
  setTimeout: () => () => {},
  setInterval: () => () => {},
  addEventListener: () => () => {}
}

// jsdom is not a dependency, so give register() the DOM globals it touches at
// module scope. Anything more would mean the plugin is doing work it shouldn't.
globalThis.document = {
  createElement: () => ({ style: {}, textContent: '', append() {}, remove() {} }),
  head: { append() {} },
  documentElement: { dataset: {}, style: { setProperty() {}, removeProperty() {} } },
  execCommand: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
}

try {
  plugin.register(ctx)
} catch (error) {
  console.error('FAIL: register() threw:', error.message)
  process.exit(1)
}

console.log(`LOADED OK — id=${plugin.id}, ${registered.length} contributions:`)
for (const r of registered) console.log('  ' + r)
