# فارسی / Persian RTL for Hermes Desktop

<div dir="rtl" align="right">

## فارسی

افزونهٔ **پشتیبانی فارسی برای هرمس دسکتاپ**: بستهٔ زبان فارسی، جهت راست‌چین، فونت
وزیرمتن، و اصلاح کلید `@` برای کیبورد فارسی. بدون patch کردن فایل‌های برنامه،
بدون نیاز به build، بدون npm، و کاملاً آفلاین.

### نصب

**سریع‌ترین راه — یک خط (پیشنهادی):**

در **PowerShell** (ویندوز):

```powershell
iwr -useb https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.ps1 | iex
```

در **مک یا لینوکس**:

```bash
curl -fsSL https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.sh | bash
```

این اسکریپت‌ها کل پوشهٔ `persian-rtl` را دانلود و در مسیر افزونه‌ها می‌گذارند — **کاملاً آفلاین**، چون فونت داخل خود `plugin.js` embed شده و به هیچ CDN وابسته نیست.

**راه دستی:** آخرین نسخهٔ آماده (`persian-rtl-<version>.zip`) را از صفحهٔ
[Releases](../../releases) دانلود کنید و پوشهٔ `persian-rtl` را در یکی از این
مسیرها کپی کنید:

| سیستم | مسیر |
|---|---|
| ویندوز | `%LOCALAPPDATA%\hermes\desktop-plugins\` |
| مک / لینوکس | `~/.hermes/desktop-plugins/` |

مسیر کامل ویندوز معمولاً این است:

```
C:\Users\<نام‌کاربری>\AppData\Local\hermes\desktop-plugins\persian-rtl\plugin.js
```

در **PowerShell**:

```powershell
Copy-Item -Recurse persian-rtl "$env:LOCALAPPDATA\hermes\desktop-plugins\"
```

در **مک یا لینوکس**:

```bash
cp -r persian-rtl ~/.hermes/desktop-plugins/
```

پوشهٔ `desktop-plugins` را برنامه خودش زیر نظر دارد: افزونه در چند ثانیه لود
می‌شود. اگر ظاهر نشد، <kbd>Ctrl</kbd>+<kbd>K</kbd> بزنید و **Reload desktop
plugins** را انتخاب کنید.

### فعال‌سازی زبان فارسی

نصب افزونه زبان را عوض نمی‌کند — فقط `فارسی` را به لیست اضافه می‌کند:

**Settings ▸ Appearance ▸ Language ▸ فارسی**

پس از انتخاب آن، `<html lang="fa" dir="rtl">` ست می‌شود و رابط کاربری راست‌چین
می‌شود.

### چه چیزی اضافه می‌شود

| قابلیت | توضیح |
|---|---|
| **زبان فارسی** | گزینهٔ `فارسی` به تنظیمات زبان اضافه می‌شود؛ **کل ۵٬۰۶۵ رشتهٔ** برنامه ترجمه شده. |
| **فونت وزیرمتن** | نسخهٔ ۳۳.003، داخل خود فایل افزونه embed شده — بدون اینترنت و بدون CDN. |
| **راست‌چین هوشمند** | پاراگراف فارسی راست‌چین می‌شود؛ پاسخ انگلیسی، بلوک کد و خروجی ترمینال چپ‌چین می‌مانند. |
| **کلید @** | `Shift+2` به‌جای `٬`، کاراکتر `@` را تایپ می‌کند (تا وقتی composer فوکوس دارد). |
| **کنترل‌ها** | آیکن کرهٔ زمین در نوار عنوان (با گذاشتن موس باز می‌شود)، صفحهٔ تنظیمات، <kbd>Alt</kbd>+<kbd>R</kbd>، و پالت فرمان. |

### تنظیمات

**Settings ▸ Plugins ▸ Persian RTL**

| تنظیم | پیش‌فرض | کارش چیست |
|---|---|---|
| زبان رابط فارسی | روشن | بستهٔ `fa` را ثبت می‌کند. فقط فارسی را به لیست اضافه می‌کند، خودش زبان را عوض نمی‌کند. |
| فونت وزیرمتن | روشن | فونت embed‌شده را اعمال می‌کند. دامنه: **متن گفتگو** یا **کل برنامه**. |
| کلید @ فارسی | روشن | `Shift+2` را فقط داخل فیلدهای متنی به `@` تبدیل می‌کند. |
| اندازه متن | ۱۰۰٪ | بازهٔ ۸۰ تا ۱۴۰٪. متن فارسی در همان ارتفاع خط، به کمی اندازه بیشتر نیاز دارد. |
| اندازه فونت کد | ۱۲ پیکسل | بازهٔ ۱۰ تا ۱۸ پیکسل، مستقل از اندازهٔ متن تا بلوک کد حجیم نشود. |
| چیپ نوار وضعیت | روشن | `فارسی` یا `EN` را در انتهای نوار وضعیت نشان می‌دهد؛ کلیک = تغییر حالت. |

تنظیمات برای هر پروفایل جداگانه ذخیره می‌شود، زیر کلید
`hermes.plugin.persian-rtl.*`.

### نحوهٔ کار

همه‌چیز روی **SDK رسمی افزونه‌ها** سوار است — `ctx.i18n.registerAppLocale` برای
زبان، `ctx.registerSettingsPage` برای تنظیمات، و contribution areas برای
عناصر رابط. هیچ فایلی از برنامه patch نمی‌شود، پس آپدیت هرمس نمی‌تواند آن را
بشکند (برخلاف ابزارهایی که `app.asar` را دست‌کاری می‌کنند).

سه نکتهٔ مهم دربارهٔ نحوهٔ کار:

- **راست‌چین یک state رسمی برنامه است، نه یک hack.** فایل `styles.css` خود
  هرمس از قبل قواعد `unicode-bidi: plaintext` و `text-align: start` و
  ایزوله‌سازی کد را دارد؛ این افزونه همان قرارداد را گسترش می‌دهد، نه اینکه با
  آن بجنگد.
- **فونت با یک CSS author rule اعمال می‌شود، نه با نوشتن در config.** تنظیمات
  «فونت گفتگو» در هرمس، کلید `desktop.font_family` را از طریق `saveHermesConfig`
  می‌نویسد و مقدار زنده را در `$chatFontFamily` منتشر می‌کند — و هیچ‌کدام از
  این دو در از دسترس افزونه نیست (`ctx.rest` فقط به `/api/plugins/<id>` محدود
  است). پس افزونه یک rule با `!important` روی `<html>` تزریق می‌کند، چون تنها
  چیزی که از استایل inline بردن `applyTheme` جلو می‌زند همان است.
  **نتیجه:** تا وقتی فونت روشن است، تنظیمات «فونت گفتگو» مقدار پیش‌فرض پوسته را
  نشان می‌دهد. خاموش کردن افزونه دقیقاً همان را برمی‌گرداند، چون هیچ چیزی
  overwrite نشده — فقط یک rule موقت روی `<html>` بوده.
- **بستهٔ زبان کامل است.** هر ۵٬۰۶۵ رشتهٔ برنامه، از جمله
  پرترافیک‌ترین بخش‌ها. `registerAppLocale` روی کاتالوگ موجود merge می‌کند، پس هر
  کلید ترجمه‌نشده انگلیسی می‌ماند — هیچ برچسب خالی‌ای وجود ندارد.

### تست و تأیید

افزونه روی یک نمونهٔ در حال اجرای هرمس تست شد؛ از لاگ خود برنامه:

```
[persian] registered; fontBytes=80048
[persian] painted; html[data-persian-rtl]=chat
[persian] Vazirmatn available=true faces=["Vazirmatn 100 900 loaded"]
[persian] calling registerAppLocale(fa, rtl=true)
```

یعنی ماژول لود می‌شود، `register()` اجرا می‌شود، فونت در دسترس است
(`document.fonts.check('16px Vazirmatn')` مقدار `true` می‌دهد)، و بستهٔ زبان ثبت
می‌شود.

دو تست هم داخل ریپو هست:

- `harness/atfix.test.mjs` — ۸ تست برای قرارداد کلید `@`: فقط روی یک کاراکتر
  مشخص کار می‌کند، هیچ ترکیب Ctrl/Cmd/Alt را نمی‌بلعد، و خارج از فیلد متنی کاری
  نمی‌کند.
- `harness/i18n.test.mjs` — هر ۵٬۰۶۵ کلید فارسی را با کاتالوگ واقعی برنامه تطبیق
  می‌دهد، تا یک اشتباه تایپی در مسیر کلید به‌جای اینکه بی‌صدا نادیده گرفته شود،
  تست را fail کند.


### حذف

**Settings ▸ Plugins** و خاموش کردن افزونه. چیزی برای uninstall نیست و چیزی برای
بازگردانی نمی‌خواهد — چون هیچ تنظیم یا فایل برنامه‌ای دست نخورده باقی مانده.

</div>

---

# فارسی / Persian RTL for Hermes Desktop

Persian (Farsi) support for **Hermes Desktop**: a UI language pack, RTL text
direction, the Vazirmatn font, and the Persian-keyboard `@` fix. No app
patching, no build step, no npm install, no network access.

[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![font: OFL 1.1](https://img.shields.io/badge/font-OFL--1.1-green.svg)](assets/fonts/OFL.txt)
[![release](https://img.shields.io/github/v/release/Rpg-420/hermes-agent-rtl?label=release)](../../releases)

## Install

**Fastest — one line (recommended):**

Windows (PowerShell):

```powershell
iwr -useb https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.ps1 | iex
```

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Rpg-420/hermes-agent-rtl/main/install.sh | bash
```

These download the whole `persian-rtl/` folder into your plugins directory —
**fully offline**, because the font is embedded inside `plugin.js` and depends
on no CDN.

**Manual:** download the latest `persian-rtl-<version>.zip` from
[Releases](../../releases) and copy the `persian-rtl` folder into:

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

Then pick your language at **Settings ▸ Appearance ▸ Language ▸ فارسی** — the
plugin adds فارسی to the picker but never changes your language on its own.

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
└── plugin.js              the distributable — drop-in, font + pack inlined

build/
├── plugin.template.js     the source; edit this, not the output
├── build.py               template + font + pack → plugin.js (build-time asserts)
├── split_fa_block.py      one-time: moved the pack out of the template (backed up)
├── fa_fragments/          the Persian language pack — THE source, edit these
│   ├── INSTRUCTIONS.md      translation style + the verify command
│   └── *.json               one file per section-group, {dotted.key: fa}
├── merge_fa.py            fragments → fa.pack.json, asserted vs the catalog
├── merge_fa_partial.py    same merge, coverage gate relaxed (build-path testing)
├── fa.pack.json           derived — .gitignored, regenerated by merge_fa.py
└── fa_batches/            derived English slices — .gitignored

harness/
├── run.mjs                loads the built module through stub shims and
│                          drives register() against a recording ctx
├── shim-{sdk,react,jsx}.js
├── atfix.test.mjs         8 tests — the @-fix contract
├── i18n.test.mjs          every pack key resolves against the app catalog
├── dump-keys.ts           regenerates en-flat.json from the Hermes source
└── en-flat.json           the flattened app catalog (5,065 keys — the pack covers all of them)

assets/fonts/
├── Vazirmatn-Variable.woff2   the subset the build inlines
└── OFL.txt                   SIL Open Font License 1.1
```

## Developing

```bash
python build/merge_fa.py     # fragments → fa.pack.json, asserted (refuses if incomplete)
python build/build.py        # build + assert the module loads and register() runs
node harness/atfix.test.mjs  # the @-fix contract
node harness/i18n.test.mjs   # every pack key resolves against the app catalog
node harness/scope.test.mjs  # font-scope ids match the CSS that reads them
```

### Releasing

```bash
python build/release.py      # build, run all tests, zip persian-rtl/, update CHANGELOG
```

Bump `VERSION` in `build/plugin.template.js` first and add its entry to
`ENTRIES` in `build/release.py` — the script refuses to build if the version
has no changelog entry, so the two never drift. It prints the exact
`git tag` / `gh release create` commands to make it public, and leaves that
decision to you.

### The language pack

`build/fa_fragments/*.json` is where the Persian strings live — that is the file
to edit, not `plugin.js`. `build/merge_fa.py` merges the fragments into
`fa.pack.json` and **fails the build** on three things:

- an **unknown key** — a dot-path not in `harness/en-flat.json`. This is the one
  that matters: `registerAppLocale` merges over the catalog, so a mistyped key
  is never an error to the app, it is a string that silently never renders.
- a key **still equal to its English** — a translation that never got done.
- a **bad placeholder** — `{0}` in a Persian string whose English entry is a
  plain string, so there is no argument to interpolate and it renders literally.

English entries that are **functions** (interpolators, plurals) are translated as
plain strings with positional `{0}`, `{1}` placeholders in argument order — the
SDK's merge wraps them back into a call shape. `build/fa_batches/INSTRUCTIONS.md`
has the style rules; product names and technical tokens stay verbatim.

`build.py` refuses to write if the template still has an unfilled placeholder, if
a CR survives, or if the built module fails to load — because each of those has
already shipped broken once. The backtick guard is the interesting one: a single
`` ` `` inside the CSS template literal closes it and pushes the following CSS
into code position, which surfaces as a baffling `SyntaxError: Unexpected token
'!'` pointing at the app's SDK bundle rather than at the plugin.

`.gitattributes` pins `eol=lf` for the same reason: with `core.autocrlf=true` a
Windows checkout would hand every Windows user a `plugin.js` with CRLF, which
the runtime loader rejects outright.

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
- **The locale pack is complete.** All 5,065 of the app's strings, including the
  660 whose English entry is a function — those are written as positional `{0}`,
  `{1}` strings, which the SDK's merge wraps back into the same call shape.
  `merge_fa.py` asserts every key against the flattened `en.ts` catalog, so a
  mistyped dot-path fails the build instead of silently never rendering.

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
