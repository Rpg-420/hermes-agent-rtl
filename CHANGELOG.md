# Changelog

All notable changes to the Persian RTL plugin.

## 1.2.0

- Persian UI language now covers the whole app — all 5,065 catalog strings, including the 660 whose English entry is a function (interpolators and plurals), written as positional {0} placeholders.
- Fixed Font scope → "Whole app": the option was selectable but silently did nothing, because the scope id the setting wrote never matched the CSS that reads it. The whole-app Vazirmatn face now actually applies.
- One-line install: install.ps1 (Windows) and install.sh (Linux/macOS) download the self-contained persian-rtl/ folder — no CDN, works offline.
- The translation pack moved out of plugin.template.js into build/fa_fragments/, so a typo is a one-file fix, and merge_fa.py fails the build on any key the real app catalog does not know.

