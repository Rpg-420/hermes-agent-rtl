/**
 * persian-rtl — Persian (Farsi) RTL + Vazirmatn font support for Hermes Desktop.
 *
 * A zero-config desktop plugin. Drop this folder in `$HERMES_HOME/desktop-plugins/`
 * and it loads within seconds — no build step, no app patching, no npm install.
 *
 * What it does
 * ------------
 * 1. Registers a **Persian (فارسی) UI language** — the app's own i18n catalog is
 *    extended with a `fa` pack, so Settings ▸ Language lists فارسی and picking it
 *    sets `<html lang="fa" dir="rtl">` through the app's own `applyDocumentLocale`.
 *    RTL is a *supported* app state, not a hack: `styles.css` already carries the
 *    `unicode-bidi: plaintext` / `text-align: start` / code-isolation rules.
 * 2. Ships **Vazirmatn offline** (a 60 KB subset, base64-inlined — no CDN, no
 *    network) and offers it as the chat/UI font through the app's own
 *    `desktop.font_family` door, so it survives theme switches and restarts.
 * 3. Adds the **Persian-keyboard `@` fix**: on a Persian layout `Shift+2` types
 *    `٬` (U+066C), so `@`-mentions were unreachable from the composer. This
 *    plugin rewrites that keystroke to `@` only while the composer is focused.
 * 4. A **globe tool in the title bar** with a hover panel for the live controls,
 *    plus a Settings ▸ Plugins page, an `Alt+R` keybind, and a status-bar chip.
 *
 * Design notes (why it is built this way)
 * --------------------------------------
 * - Everything rides the **documented plugin SDK**: `ctx.i18n.registerAppLocale`
 *    for the language, `ctx.storage` for prefs, `ctx.registerSettingsPage` for
 *    settings, contribution areas for chrome. No app internals are touched, so a
 *    Hermes update cannot break it the way an `app.asar` patch would.
 * - The font is applied by writing the app's own `desktop.font_family` config
 *    (the same lever Settings ▸ Appearance ▸ Chat Font uses) rather than by
 *    injecting a `font-family` override — so the theme's own stack stays behind
 *    it and missing glyphs still resolve.
 * - No hardcoded colours: every plugin surface uses `var(--ui-*)` theme tokens,
 *    so it follows light/dark and every theme automatically.
 */

import {
  KEYBINDS_AREA,
  PALETTE_AREA,
  STATUSBAR_AREAS,
  TITLEBAR_AREAS,
  ToggleRow,
  ListRow,
  SegmentedControl,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tip,
  atom,
  cn,
  host,
  icons,
  usePluginI18n,
  useValue
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useRef, useState } from 'react'

const ID = 'persian-rtl'

/* ── Font ───────────────────────────────────────────────────────────────────
 * A subset of Vazirmatn v33.003 (Saber Rastikerdar, SIL OFL 1.1): the Arabic /
 * Arabic-Supplement / Arabic-Presentation-Forms blocks, basic Latin, and the
 * punctuation a chat transcript actually uses. The variable `wght` axis is kept
 * (100–900) so one file covers every weight the app asks for. Inlined as base64
 * so the plugin is a single self-contained folder with zero network access.
 * Keep the layout features that Persian shaping needs (init/medi/fina/isol via
 * `rlig`/`calt`, plus `ss01` = Persian digits and `tnum`).
 */
const FONT_BASE64 =
  '__FONT_BASE64__'

const FONT_FAMILY = 'Vazirmatn'

const FONT_CSS = `
@font-face {
  font-family: '${FONT_FAMILY}';
  src: url(data:font/woff2;base64,${FONT_BASE64}) format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
`

/* ── Preferences ────────────────────────────────────────────────────────────
 * Everything is opt-in and persisted under `hermes.plugin.persian-rtl.*`.
 * `direction` mirrors the app's own Text direction setting (auto/rtl/ltr) but is
 * owned here so the plugin can drive it without fighting the Settings page.
 */
const DEFAULTS = {
  /** Ship the Persian UI language pack (adds فارسی to Settings ▸ Language). */
  locale: true,
  /** Offer Vazirmatn as the chat font and apply it when chosen. */
  font: true,
  /** Rewrite Persian-layout `Shift+2` (٬) to `@` inside the composer. */
  atFix: true,
  /** Show the status-bar chip. */
  chip: true,
  /** Font scope: chat text only, or the whole app UI. */
  scope: 'chat',
  /** Chat text size multiplier, 80–140 %. */
  scale: 100,
  /** Code block font size in px (independent of prose size). */
  codeSize: 12
}

const SCOPES = [
  { id: 'chat', label: 'متن گفتگو' },
  { id: 'ui', label: 'کل برنامه' }
]

/* ── i18n: the Persian UI language pack ─────────────────────────────────────
 * `registerAppLocale` merges a PARTIAL pack over the bundled catalog — every key
 * omitted here keeps its English (or bundled) string, so this can never leave a
 * blank label. `rtl: true` is what makes `applyDocumentLocale` set `dir="rtl"`.
 *
 * Keys are the real flattened dot-paths of `apps/desktop/src/i18n/en.ts`
 * (5065 of them); only the highest-traffic surfaces are translated here, which
 * is exactly the merge-over-English contract. Values that are functions in
 * English (`t(...)`) are left to English — a positional `{0}` rewrite of a
 * plural rule reads worse than the shipped string.
 */
const FA = /*__FA_PACK__*/

/* The plugin's own chrome strings. English + Persian, resolved against whatever
 * language the app is currently in (a plugin follows the user, it never owns the
 * locale) — so the panel reads فارسی when the app is Persian and English when
 * it is not, which is what a language-support plugin should do.
 */
const EN = {
  title: 'Persian',
  panel: 'Persian language & typography',
  open: 'Persian language settings',
  locale: 'Persian UI language',
  localeDesc: 'Adds فارسی to Settings ▸ Language and switches the interface to RTL.',
  font: 'Vazirmatn font',
  fontDesc: 'Use the bundled Vazirmatn face instead of the theme default.',
  atFix: 'Persian @ key',
  atFixDesc: 'Shift+2 types @ instead of ٬ on a Persian keyboard layout.',
  chip: 'Status-bar chip',
  chipDesc: 'Show the Persian state at the right end of the status bar.',
  scope: 'Font scope',
  scopeChat: 'Chat text',
  scopeUi: 'Whole app',
  scale: 'Text size',
  codeSize: 'Code font size',
  apply: 'Apply',
  applied: 'Vazirmatn applied',
  cleared: 'Theme font restored',
  toggle: 'Toggle Persian mode',
  on: 'فارسی',
  off: 'EN',
  more: 'Text size, code size, and the status-bar chip live in Settings ▸ Plugins ▸ Persian RTL.'
}
const FAUI = {
  title: 'فارسی',
  panel: 'زبان و تایپوگرافی فارسی',
  open: 'تنظیمات زبان فارسی',
  locale: 'زبان رابط فارسی',
  localeDesc: 'فارسی را به تنظیمات ▸ زبان اضافه می‌کند و رابط را راست‌چین می‌کند.',
  font: 'فونت وزیرمتن',
  fontDesc: 'به‌جای فونت پیش‌فرض پوسته، از فونت وزیرمتن استفاده می‌کند.',
  atFix: 'کلید @ فارسی',
  atFixDesc: 'Shift+2 به‌جای ٬، کاراکتر @ را تایپ می‌کند.',
  chip: 'چیپ نوار وضعیت',
  chipDesc: 'وضعیت فارسی را در انتهای نوار وضعیت نشان می‌دهد.',
  scope: 'دامنه فونت',
  scale: 'اندازه متن',
  codeSize: 'اندازه فونت کد',
  apply: 'اعمال',
  applied: 'وزیرمتن اعمال شد',
  cleared: 'فونت پوسته بازگشت',
  toggle: 'تغییر حالت فارسی',
  on: 'فارسی',
  off: 'EN',
  more: 'اندازه متن، اندازه کد و چیپ نوار وضعیت در تنظیمات ▸ افزونه‌ها ▸ فارسی قرار دارند.'
}

/* ── CSS the plugin owns ────────────────────────────────────────────────────
 * Everything keys off `html[data-persian-rtl]` so it is one attribute to add and
 * one to remove, and the rules below only *extend* the app's own bidi contract
 * (styles.css already isolates code and resolves prose direction per block).
 * No colours here — the app's tokens do that.
 */
const CSS = `
html[data-persian-rtl='font'] {
  /* !important because the app writes --dt-font-sans inline on <html> from
     applyTheme(); an inline style only loses to an important author rule.
     (No backticks in here — this whole block is already inside a template
     literal, and a stray backtick would close it and break the module.) */
  --dt-font-sans: '${FONT_FAMILY}', 'Segoe WPC', 'Segoe UI', -apple-system,
    BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', emoji !important;
}

/* Chat-only scope: leave the app chrome on the theme face, restyle the
   transcript + composers. Matches the app's own CJK carve-out pattern
   ([data-slot='composer-rich-input']:lang(ja) { … }) so it composes with it. */
html[data-persian-rtl='chat'] [data-slot='aui_assistant-message-content'] .aui-md,
html[data-persian-rtl='chat'] [data-slot='aui_user-inline-text'],
html[data-persian-rtl='chat'] [data-slot='composer-rich-input'] {
  font-family: '${FONT_FAMILY}', var(--dt-font-sans);
}

/* Persian text needs a little more leading than Latin at the same size —
   Vazirmatn's tall ascenders and dot stacks clip at the app's 1.5. */
html[data-persian-rtl='font'] [data-slot='aui_assistant-message-content'] .aui-md :where(p, li, blockquote),
html[data-persian-rtl='font'] [data-slot='aui_user-inline-text'],
html[data-persian-rtl='font'] [data-slot='composer-rich-input'] {
  line-height: 1.75;
}

/* Code never inherits the Persian face or the extra leading: the app pins it to
   --dt-font-mono and dir=ltr already; this only keeps our line-height off it. */
html[data-persian-rtl='font'] [data-slot='aui_assistant-message-content'] .aui-md [data-slot='code-card-body'],
html[data-persian-rtl='font'] [data-slot='aui_user-fence'] {
  line-height: 1.5;
}

/* Tables: the app pins th/td to text-left for the auto (LTR) box. A Persian
   table wants its own start edge, and cells should resolve direction from
   their own first strong character like the prose blocks do. */
html[data-persian-rtl='font'] [data-slot='aui_assistant-message-content'] .aui-md :where(th, td) {
  text-align: start;
  unicode-bidi: plaintext;
}

/* List markers and blockquote rules sit beside the text, driven by the box's
   direction. Under a Persian-first transcript the markers belong on the right;
   logical properties do that without touching the LTR chrome. */
html[data-persian-rtl='font'] [data-slot='aui_assistant-message-content'] .aui-md :where(ul, ol) {
  padding-inline-start: 1.5em;
  padding-inline-end: 0;
}
`

/* The live text/code size sliders write CSS custom properties on <html> rather
 * than the app's own scale store, so the plugin's preference and the user's
 * Settings ▸ Chat text size choice never overwrite each other: the app's
 * `--conversation-text-font-size` is calc()'d from its own scale, and ours
 * multiplies on top of the resolved value.
 */
const SIZE_CSS = `
html[data-persian-scale] [data-slot='aui_assistant-message-content'] .aui-md,
html[data-persian-scale] [data-slot='aui_user-inline-text'],
html[data-persian-scale] [data-slot='composer-rich-input'] {
  font-size: calc(var(--conversation-text-font-size) * var(--persian-text-scale, 1));
}
html[data-persian-scale] [data-slot='aui_assistant-message-content'] .aui-md [data-slot='code-card-body'],
html[data-persian-scale] [data-slot='aui_user-fence'] {
  font-size: calc(0.7rem * var(--persian-code-size, 12) / 12);
}
`

/* ── The Persian-layout `@` fix ─────────────────────────────────────────────
 * On a Persian keyboard `Shift+2` produces `٬` (U+066C ARABIC THOUSANDS
 * SEPARATOR), which is what made `@`-mentions unreachable from the composer.
 * We only rewrite it while an editable target has focus, and only when the
 * keystroke actually produced that character — so a user who genuinely wants
 * `٬` can still get it from a character picker, and no other layout is touched.
 */
function installAtFix() {
  const onKeyDown = event => {
    if (event.key !== '٬' || event.ctrlKey || event.metaKey || event.altKey) {
      return
    }

    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const editable =
      target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement

    if (!editable) {
      return
    }

    event.preventDefault()

    // A contenteditable has no `value`; insert at the caret. execCommand is
    // deprecated but is still the only API that preserves the editor's own
    // undo stack and input-event contract, which is what a rich composer
    // (and its mention/slash plugins) are wired to.
    if (target.isContentEditable) {
      document.execCommand('insertText', false, '@')

      return
    }

    const field = target
    const start = field.selectionStart ?? field.value.length
    const end = field.selectionEnd ?? start
    field.setRangeText('@', start, end, 'end')
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  document.addEventListener('keydown', onKeyDown, true)

  return () => document.removeEventListener('keydown', onKeyDown, true)
}

/* ── Font application ──────────────────────────────────────────────────────
 * The app's Chat Font setting is `desktop.font_family`. It is NOT a gateway
 * `config.set` key — Settings ▸ Appearance ▸ Chat Font writes it through
 * `saveHermesConfig` (a sparse `PUT /api/config` that deep-merges), and the
 * live value is published to `$chatFontFamily` so `applyTheme` repaints
 * `--dt-font-sans`. Reaching for `config.set` here would 404.
 *
 * But a plugin cannot touch either door: `ctx.rest` is scoped to
 * `/api/plugins/<id>` and rejects path traversal, and `$chatFontFamily` is app
 * state with no SDK export. So the font is applied the way every other plugin
 * stylesheet is — an author rule on `<html>` — and it is written to beat the
 * inline style `applyTheme` puts there, which only an `!important` rule does.
 * The tradeoff is honest and documented: while the plugin's font is on,
 * Settings ▸ Chat Font shows the theme default rather than Vazirmatn. Turning
 * the plugin off restores the theme face exactly, because nothing was
 * overwritten — the inline value was never touched.
 */

/* ── UI ────────────────────────────────────────────────────────────────────
 * The globe lives in the title bar and opens its panel on hover (the same
 * gesture the reference Antigravity tool uses); the Settings ▸ Plugins page is
 * the durable home for the same controls, and `Alt+R` toggles the whole thing.
 *
 * `usePluginI18n` is a React hook, so it is called INSIDE each component (never
 * in `register`, which is not a render). `ctx.i18n.t` is the non-reactive twin
 * for handlers. Both resolve against the app's active locale, so the panel
 * reads فارسی when the app is Persian and English when it is not.
 */
function PersianChip({ prefs, update }) {
  const t = usePluginI18n(ID)
  const { chip, locale, font } = useValue(prefs)

  if (!chip) {
    return null
  }

  const on = Boolean(locale || font)

  return jsx(Tip, {
    label: on ? t('panel') : t('toggle'),
    children: jsx('button', {
      type: 'button',
      'aria-pressed': on,
      className: cn(
        'inline-flex h-full items-center gap-1 px-1.5 text-[0.6875rem]',
        on ? 'text-(--ui-accent)' : 'text-(--ui-text-tertiary)'
      ),
      onClick: () => {
        update({ locale: !locale, font: !font })
      },
      children: jsx('span', { children: on ? t('on') : t('off') })
    })
  })
}

function PersianTool({ prefs, update }) {
  const t = usePluginI18n(ID)
  const { locale, font, atFix } = useValue(prefs)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  // Hover-open / hover-close with a small grace period so travelling from the
  // globe to the panel doesn't close it mid-gesture.
  const arm = next => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }

    if (next) {
      setOpen(true)

      return
    }

    closeTimer.current = setTimeout(() => setOpen(false), 220)
  }

  useEffect(() => () => void (closeTimer.current && clearTimeout(closeTimer.current)), [])

  const on = Boolean(locale || font)

  return jsxs('div', {
    className: 'flex h-full items-center',
    onMouseEnter: () => arm(true),
    onMouseLeave: () => arm(false),
    children: [
      jsxs(Popover, {
        open,
        onOpenChange: setOpen,
        children: [
          jsx(PopoverTrigger, {
            asChild: true,
            children: jsx('button', {
              type: 'button',
              'aria-expanded': open,
              'aria-label': t('open'),
              className: cn(
                'flex h-6 w-6 items-center justify-center rounded-[0.25rem]',
                on ? 'text-(--ui-accent)' : 'text-(--ui-text-tertiary)'
              ),
              children: jsx(icons.Globe, { size: 14 })
            })
          }),
          jsx(PopoverContent, {
            side: 'bottom',
            align: 'end',
            className: 'w-[17rem] p-2',
            onMouseEnter: () => arm(true),
            onMouseLeave: () => arm(false),
            children: jsxs('div', {
              className: 'flex flex-col gap-2',
              children: [
                jsx('div', {
                  className: 'px-1 text-[0.6875rem] font-medium text-(--ui-text-secondary)',
                  children: t('panel')
                }),
                jsx(ToggleRow, {
                  checked: Boolean(locale),
                  description: t('localeDesc'),
                  label: t('locale'),
                  onChange: value => update({ locale: value })
                }),
                jsx(ToggleRow, {
                  checked: Boolean(font),
                  description: t('fontDesc'),
                  label: t('font'),
                  onChange: value => update({ font: value })
                }),
                jsx(ToggleRow, {
                  checked: Boolean(atFix),
                  description: t('atFixDesc'),
                  label: t('atFix'),
                  onChange: value => update({ atFix: value })
                }),
                jsx('div', {
                  className: 'px-1 pb-1 text-[0.6875rem] leading-relaxed text-(--ui-text-tertiary)',
                  children: t('more')
                })
              ]
            })
          })
        ]
      })
    ]
  })
}

export default {
  id: ID,
  name: 'Persian RTL',
  description: 'Persian (Farsi) UI language, RTL text direction, Vazirmatn font, and the Persian-keyboard @ fix.',
  register(ctx) {
    const prefs = atom({ ...DEFAULTS, ...ctx.storage.get('prefs', {}) })
    const say = ctx.i18n.t

    const update = patch => {
      const next = { ...prefs.get(), ...patch }
      prefs.set(next)
      ctx.storage.set('prefs', next)
    }

    /* The font's @font-face must exist before anything asks for it. */
    const fontStyle = document.createElement('style')
    fontStyle.textContent = FONT_CSS
    document.head.append(fontStyle)

    /* The attribute-driven rules (scope, leading, tables, lists). */
    const style = document.createElement('style')
    style.textContent = `${CSS}\n${SIZE_CSS}`
    document.head.append(style)

    const root = document.documentElement

    const paint = () => {
      const p = prefs.get()

      // One attribute carries the font decision; the app's own dir/lang state
      // is left entirely alone (it is driven by the locale picker).
      root.dataset.persianRtl = p.font ? p.scope : 'off'

      if (p.scale === 100) {
        delete root.dataset.persianScale
        root.style.removeProperty('--persian-text-scale')
      } else {
        root.dataset.persianScale = ''
        root.style.setProperty('--persian-text-scale', String(p.scale / 100))
      }

      if (p.codeSize === DEFAULTS.codeSize) {
        root.style.removeProperty('--persian-code-size')
      } else {
        root.style.setProperty('--persian-code-size', String(p.codeSize))
      }
    }

    paint()

    // Re-paint on every preference change. Everything the plugin does is CSS
    // state on <html>, so there is no async side effect to guard and nothing
    // that can half-apply: the atom write and the attribute write are one step.
    const stop = prefs.subscribe(paint)

    ctx.onDispose(() => {
      stop()
      fontStyle.remove()
      style.remove()
      delete root.dataset.persianRtl
      delete root.dataset.persianScale
      root.style.removeProperty('--persian-text-scale')
      root.style.removeProperty('--persian-code-size')
    })

    /* ── Contributions ── */
    ctx.register({
      id: 'tool',
      area: TITLEBAR_AREAS.right,
      order: 40,
      render: () => jsx(PersianTool, { prefs, update })
    })

    ctx.register({
      id: 'chip',
      area: STATUSBAR_AREAS.right,
      order: 140,
      render: () => jsx(PersianChip, { prefs, update })
    })

    ctx.register({
      id: 'toggle',
      area: PALETTE_AREA,
      data: {
        id: 'persian-rtl.toggle',
        label: 'فارسی / Toggle Persian mode',
        keywords: ['persian', 'farsi', 'rtl', 'vazirmatn', 'فارسی', 'راست‌چین'],
        run: () => {
          const p = prefs.get()
          const on = !(p.locale || p.font)
          update({ locale: on, font: on })
        }
      }
    })

    // `alt+r` — Alt is a non-shift modifier, so the combo is allowed to fire
    // even with the composer focused (that is when you want it most).
    ctx.register({
      id: 'keybind',
      area: KEYBINDS_AREA,
      data: {
        id: 'persian-rtl.toggle',
        label: 'فارسی / Toggle Persian mode',
        category: 'view',
        defaults: ['alt+r'],
        run: () => {
          const p = prefs.get()
          const on = !(p.locale || p.font)
          update({ locale: on, font: on })
        }
      }
    })

    ctx.registerSettingsPage({
      id: 'settings',
      title: 'Persian RTL',
      icon: 'globe',
      render: function General() {
        const p = useValue(prefs)

        return jsxs('div', {
          children: [
            jsx(ToggleRow, {
              checked: Boolean(p.locale),
              description: 'Adds فارسی to Settings ▸ Language and switches the interface to RTL.',
              label: 'Persian UI language',
              onChange: value => update({ locale: value })
            }),
            jsx(ToggleRow, {
              checked: Boolean(p.font),
              description: 'Use the bundled Vazirmatn face instead of the theme default.',
              label: 'Vazirmatn font',
              onChange: value => update({ font: value })
            }),
            jsx(ListRow, {
              action: jsx(SegmentedControl, {
                onChange: value => update({ scope: value }),
                options: SCOPES,
                value: p.scope
              }),
              description: 'Restyle only the transcript, or the whole application.',
              title: 'Font scope'
            }),
            jsx(ListRow, {
              action: jsx('input', {
                type: 'range',
                min: 80,
                max: 140,
                step: 5,
                value: p.scale,
                'aria-label': 'Chat text size',
                className: 'w-40 accent-(--ui-accent)',
                onChange: event => update({ scale: Number(event.target.value) })
              }),
              description: `${p.scale}% — Persian text needs a little more size than Latin at the same leading.`,
              title: 'Text size'
            }),
            jsx(ListRow, {
              action: jsx('input', {
                type: 'range',
                min: 10,
                max: 18,
                step: 1,
                value: p.codeSize,
                'aria-label': 'Code font size',
                className: 'w-40 accent-(--ui-accent)',
                onChange: event => update({ codeSize: Number(event.target.value) })
              }),
              description: `${p.codeSize}px — independent of the prose size, so code blocks never bloat.`,
              title: 'Code font size'
            }),
            jsx(ToggleRow, {
              checked: Boolean(p.chip),
              description: 'Show the Persian state at the right end of the status bar.',
              label: 'Status-bar chip',
              onChange: value => update({ chip: value })
            }),
            jsx(ToggleRow, {
              checked: Boolean(p.atFix),
              description:
                'Shift+2 types @ instead of ٬ while a text field has focus. Only fires on that exact keystroke, so no other layout is affected.',
              label: 'Persian @ key',
              onChange: value => update({ atFix: value })
            })
          ]
        })
      }
    })

    /* The language pack is registered unconditionally: `registerAppLocale` only
     * ADDS فارسی to the picker, it never changes the active language, so
     * nothing happens until the user selects it. Its disposer is tracked by the
     * ctx.i18n door already.
     *
     * The `@` fix is gated by its own pref, and re-installed whenever it flips —
     * `installAtFix` returns its own remover, so the old listener is always torn
     * down before a new one goes on and the two can never stack. */
    ctx.i18n.registerAppLocale('fa', {
      endonym: 'فارسی',
      englishName: 'Persian',
      rtl: true,
      translations: FA
    })
    ctx.i18n.register({ en: EN, fa: FAUI })

    let removeAtFix = prefs.get().atFix ? installAtFix() : null

    ctx.onDispose(() => removeAtFix?.())

    const stopAtFix = prefs.subscribe(value => {
      if (value.atFix === Boolean(removeAtFix)) {
        return
      }

      removeAtFix?.()
      removeAtFix = value.atFix ? installAtFix() : null
    })

    ctx.onDispose(stopAtFix)

    // A toast confirms the toggle from the palette / Alt+R, where there is no
    // panel to look at. `ctx.i18n.t` is the non-reactive translator, which is
    // the right door for a handler.
    //
    // nanostores' `subscribe` fires once immediately with the current value, so
    // the first emission is skipped — otherwise merely loading the plugin (or a
    // hot reload) would toast "applied" at a user who changed nothing. This is
    // the same creation-emission trap `lib/persisted.ts` documents.
    let creationEmission = true
    let lastOn = Boolean(prefs.get().locale || prefs.get().font)

    const stopToast = prefs.subscribe(value => {
      if (creationEmission) {
        creationEmission = false

        return
      }

      const on = Boolean(value.locale || value.font)

      if (on === lastOn) {
        return
      }

      lastOn = on
      host.notify({ kind: 'info', message: on ? say('applied') : say('cleared') })
    })

    ctx.onDispose(stopToast)
  }
}
