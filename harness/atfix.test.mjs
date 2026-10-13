/**
 * Unit tests for the Persian-layout `@` fix, extracted from the plugin.
 *
 * The plugin installs a capture-phase keydown handler that rewrites the Persian
 * keyboard's Shift+2 (which produces `٬`, U+066C) into `@` — but only while an
 * editable target has focus. These tests pin the exact contract:
 *   - fires only for that one character
 *   - never swallows a modified chord (Ctrl/Cmd/Alt still reach the app)
 *   - only acts inside an editable (composer, input, textarea)
 *   - writes through the right insertion path per element kind
 */
import assert from 'node:assert/strict'

const ARABIC_THOUSANDS = '\u066C'

// Verbatim copy of installAtFix()'s handler body, with `document.execCommand`
// and the DOM swapped for spies so the logic can run in plain Node.
function makeHandler(spies) {
  return event => {
    if (event.key !== ARABIC_THOUSANDS || event.ctrlKey || event.metaKey || event.altKey) {
      return 'ignored'
    }

    const target = event.target

    if (!(target instanceof Object) || !target.isEditable) {
      return 'ignored'
    }

    event.preventDefault()

    if (target.isContentEditable) {
      spies.execCommand('insertText', false, '@')

      return 'execCommand'
    }

    const field = target
    const start = field.selectionStart ?? field.value.length
    const end = field.selectionEnd ?? start
    field.setRangeText('@', start, end, 'end')
    field.dispatchEvent(new Event('input', { bubbles: true }))

    return 'setRangeText'
  }
}

function evt(over = {}) {
  const base = {
    isEditable: true,
    isContentEditable: false,
    value: 'abc',
    selectionStart: 1,
    selectionEnd: 1,
    events: [],
    // Minimal stand-in for HTMLInputElement.setRangeText, matching its
    // contract: replace [start,end) with the text and move the caret to the end
    // of the insertion when mode is 'end'.
    setRangeText(text, start, end, mode) {
      this.value = this.value.slice(0, start) + text + this.value.slice(end)
      this.selectionStart = this.selectionEnd = mode === 'end' ? start + text.length : start
    },
    dispatchEvent(e) { this.events.push(e) }
  }

  // Merge over the base so a caller can override one field without dropping
  // the setRangeText stub.
  const target = Object.assign(base, over.target ?? {})

  return {
    key: ARABIC_THOUSANDS,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target,
    prevented: 0,
    preventDefault() { this.prevented++ },
    ...over,
    target
  }
}

let pass = 0
const check = (name, fn) => { fn(); pass++; console.log('  ok -', name) }

console.log('persian-rtl @ fix')

check('rewrites the Persian thousands separator to @', () => {
  const spies = { execCommand: () => {} }
  const e = evt()
  assert.equal(makeHandler(spies)(e), 'setRangeText')
  assert.equal(e.target.value, 'a@bc')
  assert.equal(e.prevented, 1)
})

check('uses execCommand for a contenteditable composer', () => {
  const calls = []
  const spies = { execCommand: (...a) => calls.push(a) }
  const e = evt({ target: { isEditable: true, isContentEditable: true } })
  assert.equal(makeHandler(spies)(e), 'execCommand')
  assert.deepEqual(calls, [['insertText', false, '@']])
})

check('inserts at the caret, replacing a selection', () => {
  const spies = { execCommand: () => {} }
  const e = evt({ target: { isEditable: true, isContentEditable: false, value: 'abcd', selectionStart: 1, selectionEnd: 3 } })
  makeHandler(spies)(e)
  assert.equal(e.target.value, 'a@d')
  assert.equal(e.target.selectionStart, 2)
})

check('ignores every other character', () => {
  const spies = { execCommand: () => {} }
  for (const key of ['@', 'a', '2', '\u060C', 'Enter', 'Tab']) {
    const e = evt({ key })
    assert.equal(makeHandler(spies)(e), 'ignored', `key ${JSON.stringify(key)} must be ignored`)
    assert.equal(e.prevented, 0)
  }
})

check('never swallows a modified chord', () => {
  const spies = { execCommand: () => {} }
  for (const mod of ['ctrlKey', 'metaKey', 'altKey']) {
    const e = evt({ [mod]: true })
    assert.equal(makeHandler(spies)(e), 'ignored', `${mod} chord must pass through`)
    assert.equal(e.prevented, 0)
  }
})

check('does nothing outside an editable', () => {
  const spies = { execCommand: () => {} }
  const e = evt({ target: { isEditable: false } })
  assert.equal(makeHandler(spies)(e), 'ignored')
  assert.equal(e.prevented, 0)
})

check('inserts at the caret (base stub puts it at index 1)', () => {
  const spies = { execCommand: () => {} }
  const e = evt({ target: { value: 'xy' } })
  makeHandler(spies)(e)
  assert.equal(e.target.value, 'x@y')
})

check('appends when the field has no selection API', () => {
  const spies = { execCommand: () => {} }
  // A field whose selectionStart/End are null/undefined — the plugin falls
  // back to the end of the current value.
  const e = evt({ target: { value: 'xy', selectionStart: undefined, selectionEnd: undefined } })
  makeHandler(spies)(e)
  assert.equal(e.target.value, 'xy@')
})

console.log(`\n${pass} passed`)
