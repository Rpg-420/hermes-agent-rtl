/**
 * Flatten the Hermes Desktop i18n catalog to harness/en-flat.json.
 *
 * The `fa` locale pack merges over the app's catalog, so a misspelled dot-path
 * is not an error — it is a string that never renders, silently. This script
 * produces the key list that `harness/i18n.test.mjs` checks the pack against,
 * which turns that class of typo into a failing test.
 *
 * Only meaningful with the Hermes source checked out:
 *
 *     cd apps/desktop
 *     TSX_TSCONFIG_PATH=$PWD/tsconfig.json \
 *       node ../../node_modules/tsx/dist/cli.mjs <this file>
 *
 * The output is committed so the test runs in a fresh clone without the source.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolved at runtime, not import time: this file is only ever run by someone
// who has the source tree, and a hard import would break `node --check`.
const EN = process.env.HERMES_DESKTOP_EN ?? ''
  ? path.resolve(process.env.HERMES_DESKTOP_EN)
  : null

if (!EN) {
  console.error('Set HERMES_DESKTOP_EN to the path of apps/desktop/src/i18n/en.ts')
  process.exit(2)
}

const { en } = await import(/* @vite-ignore */ new URL('file:///' + EN.replace(/\\/g, '/')).href)

const flat: Record<string, string> = {}

const walk = (node: Record<string, unknown>, prefix: string): void => {
  for (const [key, value] of Object.entries(node)) {
    const at = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walk(value as Record<string, unknown>, at)
    } else {
      // Formatters are recorded as 'fn': the pack may legally replace one with
      // a positional {0} string, and the test flags that separately.
      flat[at] = typeof value === 'function' ? 'fn' : String(value)
    }
  }
}

walk(en as unknown as Record<string, unknown>, '')

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'en-flat.json')
fs.writeFileSync(out, JSON.stringify(flat))

console.log(`${Object.keys(flat).length} keys → ${path.relative(process.cwd(), out)}`)
