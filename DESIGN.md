# DESIGN.md

Generated from `frontend/css/styles.css`. The `:root` block is the single
source of truth; this file describes it, it does not duplicate it.

## Direction

Saved by the Bell title sequence. Memphis Milano: confetti geometry on a paper
ground, hard black outlines, offset block shadows instead of blur, rounded
geometric display type, Win95-beveled controls that translate on press.

Colour strategy: **full palette**. Four named hues plus two accents, each with a
role, deliberately exceeding the one-accent rule. Restraint would be the wrong
answer here, the era was not restrained.

## Tokens

All colour lives in `:root`. Token NAMES are inherited from the original
sage-green theme and no longer describe their values (`--forest` is purple).
They describe ROLES. Renaming means touching every rule, so the roles stayed.

| Token | Value | Role |
|---|---|---|
| `--forest` | `#6C2BD9` | primary chrome, nav, headings |
| `--sage` | `#00B8B8` | secondary chrome, links |
| `--leaf` | `#00D9D9` | highlights, active states |
| `--mint` | `#D4FBFB` | tint fills, icon chips |
| `--rose` | `#FF2D78` | alerts, period flow |
| `--amber` | `#FFC42E` | warnings, accents, the wordmark badge |
| `--bg` | `#FFFDF6` | paper ground under the confetti |
| `--border` | `#12102B` | near-black hard outline |
| `--text` / `--text2` / `--muted` | `#161329` / `#453f6b` / `#7d76a8` | text ramp |

Three scales that must never be confused with each other:

- `--chart1..5`: chart series, four hues far enough apart in luminance to read
  side by side.
- `--heat0..3`: symptom frequency ramp, teal to indigo. Deliberately not
  magenta, which is reserved for flow.
- `--flow-spot/light/med/heavy`: period flow, light to heavy.

JS reads these through `themeColor()` so Chart.js follows the CSS, never a
hardcoded hex.

## Typography

- **Fredoka** 500/600/700: display. Headings, the wordmark, card titles,
  section labels. Uppercase with letter-spacing in chrome.
- **Space Grotesk** 400-700: everything else. Body, buttons, data, form
  controls.

Two families, both display-adjacent. This violates the product register's
"system fonts are legitimate" default on purpose: the type IS the era.

## Elevation

No blur. `--shadow: 3px 3px 0 var(--border)` and `--shadow-up: 5px 5px 0`.
Pressed states translate by the shadow offset and drop the shadow to zero, so
the control physically moves under the finger.

## Components

- **Cards**: `--bw` 2.5px border, `--r` 10px radius, offset shadow. Header
  (`.ch`) + body (`.cb`). Every non-chart card collapses.
- **Tiles**: the house control for multi-select. `.on-item` overnight checklist,
  `.trg-tile` triggers, `.rx-tile` reactions, `.sym-tile` symptoms. Two-up on
  phones, icon over centred label, no checkbox, the tile IS the control.
- **Nav**: fixed bar, wordmark badge left, four tabs right. Below 640px the tabs
  become 44px icon squares; below 370px "Tracker" drops and the badge carries
  the name alone.

## Constraints

- Safe-area insets on all fixed chrome. `viewport-fit=cover` without
  `env(safe-area-inset-*)` puts the nav under the status bar, and `env()`
  resolves to 0 in emulation, so this bug is invisible unless tested on device.
- Classic scripts only. ~45 inline `onclick=` handlers resolve against global
  scope; `type="module"` breaks every one at click time with no load error.
- No dark mode currently exists.
