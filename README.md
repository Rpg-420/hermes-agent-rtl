# فارسی / Persian RTL for Hermes Desktop

راست‌چین، فونت وزیرمتن، و کلید `@` برای کیبورد فارسی — یک افزونه، بدون patches روی برنامه.

Persian (Farsi) support for **Hermes Desktop**: a UI language pack, RTL text
direction, the Vazirmatn font, and the Persian-keyboard `@` fix. No app
patching, no build step, no npm install, no network access.

[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![font: OFL 1.1](https://img.shields.io/badge/font-OFL--1.1-green.svg)](assets/fonts/OFL.txt)

---

## Install

Copy `persian-rtl/` into your Hermes home's `desktop-plugins/`:

| Platform | Path |
|---|---|
| Windows | `%LOCALAPPDATA%\hermes\desktop-plugins\` |
| macOS / Linux | `~/.hermes/desktop-plugins/` |

```bash
# Windows (PowerShell)
Copy-Item -Recurse persian-rtl "$env:LOCALAPPDATA\hermes\desktop-plugins\"

# macOS / Linux
cp -r persian-rtl ~/.hermes/desktop-plugins/
```

The app watches that folder: the plugin loads within a few seconds and
hot-reloads on every save. If it doesn't appear, press <kbd>Ctrl</kbd>+<kbd>K</kbd>
→ **Reload desktop plugins**.

To remove it, toggle it off in **Settings ▸ Plugins** — there is nothing to
uninstall and nothing to restore.

## What you get

| | |
|---|---|
| **زبان فارسی** | `فارسی` appears in **Settings ▸ Appearance ▸ Language**. Selecting it sets `<html lang="fa" dir="rtl">`. |
| **فونت وزیرمتن** | Vazirmatn v33.003, bundled — fully offline, no CDN. Variable weight axis 100–900. |
| **راست‌چین هوشمند** | Persian paragraphs render RTL; English replies, code blocks, and terminal output stay LTR. |
| **کلید @** | `Shift+2` types `@` instead of `٬` while the composer is focused. |
| **کنترل‌ها** | Globe icon in the title bar (hover to open), **Settings ▸ Plugins ▸ Persian RTL**, <kbd>Alt</kbd>+<kbd>R</kbd>, and the command palette. |

## Settings

| Setting | Default | What it does |
|---|---|---|
| Persian UI language | on | Registers the `fa` pack. Only *adds* فارسی to the picker — it never changes your language on its own. |
| Vazirmatn font | on | Applies the bundled face. Scope: **chat text** (transcript + composers) or **whole app**. |
| Persian @ key | on | Rewrites `Shift+2` → `@` inside editable fields only. |
| Text size | 100 % | 80–140 %. Persian needs a little more size than Latin at the same leading. |
| Code font size | 12 px | 10–18 px, independent of prose size so code blocks never bloat. |
| Status-bar chip | on | Shows `فارسی` / `EN`; click to toggle. |

Preferences persist per profile under `hermes.plugin.persian-rtl.*`.

## Layout

```
persian-rtl/
└── plugin.js              the distributable — drop-in, font inlined

build/
├── plugin.template.js     the source; edit this, not the output
└── build.py               template + font → plugin.js (with build-time asserts)

harness/
├── run.mjs                loads the built module through stub shims and
│                          drives register() against a recording ctx
├── shim-{sdk,react,jsx}.js
├── atfix.test.mjs         8 tests — the @-fix contract
├── i18n.test.mjs          every pack key resolves against the app catalog
├── dump-keys.ts           regenerates en-flat.json from the Hermes source
└── en-flat.json           the flattened app catalog (5,065 keys)

assets/fonts/
├── Vazirmatn-Variable.woff2   the subset the build inlines
└── OFL.txt                   SIL Open Font License 1.1
```

## Developing

```bash
python build/build.py     # build + assert the module loads and register() runs
node harness/atfix.test.mjs
node harness/i18n.test.mjs
```

`build.py` refuses to write if the template still has an unfilled placeholder, if
a CR survives, or if the built module fails to load — because each of those has
already shipped broken once. The backtick guard is the interesting one: a single
`` ` `` inside the CSS template literal closes it and pushes the following CSS
into code position, which surfaces as a baffling `SyntaxError: Unexpected token
'!'` pointing at the app's SDK bundle rather than at the plugin.

## How it works

Everything rides the documented plugin SDK — `ctx.i18n.registerAppLocale` for
the language, `ctx.registerSettingsPage` for settings, contribution areas for
chrome. No `app.asar` patching, so a Hermes update cannot break it the way an
IDE patcher can.

Three decisions worth knowing:

- **RTL is a supported app state, not a hack.** `styles.css` already carries the
  `unicode-bidi: plaintext` / `text-align: start` / code-isolation rules, so the
  plugin extends that contract rather than fighting it.
- **The font is an author rule, not a config write.** Settings ▸ Chat Font
  writes `desktop.font_family` through `saveHermesConfig` (a sparse
  `PUT /api/config`) and publishes to `$chatFontFamily` — neither door is
  reachable from a plugin (`ctx.rest` is scoped to `/api/plugins/<id>`). So the
  plugin injects an `!important` rule on `<html>`, the only thing that beats the
  inline style `applyTheme` writes. Consequence: while the font is on, Settings
  ▸ Chat Font shows the theme default. Turning the plugin off restores it
  exactly — nothing was overwritten.
- **The locale pack is partial by design.** 88 of the app's 5,065 strings, on
  the highest-traffic surfaces. `registerAppLocale` merges over the bundled
  catalog, so every omitted key keeps its English string — there are no blank
  labels.

## Font licence

Vazirmatn v33.003 by Saber Rastikerdar — SIL Open Font License 1.1
([full text](assets/fonts/OFL.txt)). The bundled file is a subset reduced with
`fontTools.subset`, keeping the variable `wght` axis and the Persian shaping
features.

Plugin code: [MIT](LICENSE).

## Acknowledgements

- **Vazirmatn** — Saber Rastikerdar
- **Hermes Desktop Plugin SDK** — Nous Research
- Inspired by [antigravity-ide-rtl](https://github.com/seyedalida/antigravity-ide-rtl),
  which solves the same problem for a different editor by patching `app.asar`;
  this plugin uses the supported SDK instead.
