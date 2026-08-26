# Impeccable audit: IDGAF Tracker

**Date:** 2026-08-26 · **Commit:** `1f0ec3b` · **Register:** product (brand-forward)
**Method:** static scan of `frontend/`, runtime probes in Chrome at 320/375px across
all four views, device-emulated capture on iPhone 17 Pro simulator, computed WCAG
ratios (never eyeballed).

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | The 22 symptom tiles, the primary control of the app, are `<div>`s with no role, no tabindex and no keyboard handler |
| 2 | Performance | 3/4 | `backdrop-filter` on all 27 cards for a 1px blur nobody can see |
| 3 | Theming | 2/4 | Excellent token system, zero dark mode, in an app whose core scenario is 2am |
| 4 | Responsive | 3/4 | Zero overflow at every width tested; touch targets down to 22×27px |
| 5 | Anti-patterns | 4/4 | No AI tells. Passes the category-reflex check at both altitudes |
| **Total** | | **14/20** | **Good: address the weak dimensions** |

## Anti-patterns verdict: PASS

Nobody would look at this and say AI made it.

Checked and absent: gradient text (0 `background-clip:text`), side-stripe borders
(0 `border-left/right` over 1px used as an accent), bounce or elastic easing (0),
generic AI palette, generic font stack, identical card grids.

**Category-reflex check, first order:** the training-data reflex for "perimenopause
health app" is white plus teal, soft humanist sans, a photo of a woman laughing at a
salad. This is the deliberate opposite.

**Second order:** the trap one tier down, "health app that is not clinical-white",
lands on either editorial-typographic or warm-earthy-organic. This is neither. It is
Memphis Milano on a paper ground with hard black outlines. Passes both altitudes.

Two soft tells, neither disqualifying:

- **The KPI row is structurally the hero-metric template** (big number, small label,
  supporting stat, coloured accent). It survives because the execution is Memphis
  cards with chunky top bars rather than gradient-accented SaaS tiles, and because
  four equal metrics with real denominators is honest here rather than decorative.
- **`backdrop-filter` on every card** is glassmorphism by the letter of the ban. It
  escapes in practice because `blur(1px)` over the confetti is imperceptible, which
  is also exactly why it should be deleted: see P1-4.

## Executive summary

**Score: 14/20 (Good)**

Issues by severity: **0 P0 · 6 P1 · 5 P2 · 3 P3**

The design work is genuinely strong and the newest third of the codebase is written
correctly. The problems cluster in two places: **keyboard and screen-reader access to
the original 2024-era controls**, and **one text token that is 0.3 short of WCAG AA
across roughly sixty elements**.

Top five:

1. The primary logging control is unreachable without a mouse or touchscreen.
2. There is no visible focus indicator anywhere in the app.
3. `--muted` fails 4.5:1 on all four background tokens, affecting ~60 elements.
4. The "improving" trend indicator sits at 1.76:1, effectively invisible.
5. No dark mode, in a tool designed to be opened during night sweats.

---

## Detailed findings

### [P1-1] The symptom tiles are not controls

**Location:** [js/today.js:38](../frontend/js/today.js#L38) · **Category:** Accessibility
**Standard:** WCAG 2.1.1 Keyboard (A), 4.1.2 Name Role Value (A)

```js
const tile = document.createElement('div');
tile.className = 'sym-tile' + (c>0 ? ' logged' : '');
tile.onclick = () => tapSym(i);
```

Twenty-two of these. No `role`, no `tabindex`, no keydown handler. Tabbing through the
Today view skips the entire symptom grid. A screen reader announces each tile as
unlabelled text with a number next to it.

This is the one thing the app exists to do. "Tap when it hits" is the product.

**Impact:** anyone using a keyboard, a switch device, or VoiceOver cannot log a
symptom at all. Everything downstream, the dashboard, the trends, the doctor summary,
is fed by a control they cannot reach.

**Fix:** the house pattern already exists three times over in this repo. `.trg-tile`
and `.rx-tile` are real `<button>`s; `.on-item` is a div done properly with
`role="button"`, `tabindex="0"`, `aria-pressed` and a keydown handler. Make
`sym-tile` a `<button>` with `aria-label` carrying the symptom name and the current
count. Nothing about the visual design has to change.

**Command:** `/impeccable harden`

---

### [P1-2] Three more control sets have the same defect

**Category:** Accessibility · **Standard:** WCAG 2.1.1 (A), 4.1.2 (A)

| Control | Count | Location | State |
|---|---|---|---|
| `.sh-btn` sleep hours | 8 | [js/morning.js:57](../frontend/js/morning.js#L57) | `<div>`, JS onclick, nothing else |
| `.flow-btn` period flow | 5 | [index.html:240](../frontend/index.html#L240) | `<div onclick>`, no role, no tabindex |
| `.morning-header` | 1 | [index.html:303](../frontend/index.html#L303) | `<div onclick>`, no role, no tabindex |

The morning header is the sharpest illustration of the pattern. Last week I gave all
20 new collapsible card headers `role="button"`, `tabindex="0"` and keyboard
handling. The original morning header, which those were built to match, still has
none of it. The correct pattern was copied outward and never backfilled inward.

**Fix:** same treatment as P1-1. These four sets are the complete list; everything
built after roughly June is already correct.

**Command:** `/impeccable harden`

---

### [P1-3] No visible focus indicator anywhere

**Location:** [css/styles.css](../frontend/css/styles.css) · **Category:** Accessibility
**Standard:** WCAG 2.4.7 Focus Visible (AA)

Measured across every stylesheet: **2 rules mention `:focus`**, both cosmetic
border-colour changes on textareas. **Zero rules use `:focus-visible`. Four rules set
`outline: none`** with no replacement, including `.sli`, which is the range input.

The range inputs are fully keyboard-operable with arrow keys, and give no indication
whatsoever that they have focus.

**Impact:** a keyboard user cannot tell where they are. With 22 symptom tiles, 8
trigger tiles, 6 reaction tiles and 20 card headers on one screen, that is not a minor
inconvenience, it is total loss of position.

**Fix:** one global rule, then remove the four `outline:none` declarations or pair
each with a `:focus-visible` replacement. The 90s vocabulary already has the right
answer sitting in it: a 3px offset ring in `--border` matches the existing hard-outline
treatment better than a browser default would.

```css
:where(button, [role="button"], a, input, select, textarea):focus-visible{
  outline: 3px solid var(--border);
  outline-offset: 2px;
}
```

**Command:** `/impeccable harden`

---

### [P1-4] `--muted` fails AA on every background it is used on

**Location:** [css/styles.css](../frontend/css/styles.css) `:root` · **Category:** Accessibility / Theming
**Standard:** WCAG 1.4.3 Contrast Minimum (AA)

`--muted: #7d76a8`, computed against the four surface tokens:

| Background | Ratio | Verdict |
|---|---|---|
| `--surface` `#ffffff` | **4.18:1** | fail (needs 4.5) |
| `--bg` `#FFFDF6` | **4.10:1** | fail |
| `--surface2` `#FFF9EC` | **3.98:1** | fail |
| `--mint` `#D4FBFB` (card headers) | **3.78:1** | fail |

It misses by 0.3 to 0.7, which is why it looks fine and is not. It carries
`.kpi-label`, `.kpi-sub`, `.cap-empty-sub`, `.week-day-head`, `.cyc-note`, `.tx-empty`,
`.data-hint`, `.cycle-day-head`, `.flow-legend-item`, `.morning-section-title`,
`.sh-btn`, `.sli-scale-end`, `.hi-del`, and every card subtitle: roughly **sixty
elements across all four views**, all from one token.

**Fix:** one line. `#6b6394` clears 4.5:1 on all four backgrounds with the worst case
at **4.95:1** (on mint), and stays in the same hue family so nothing else shifts.
`#665d8c` gives more headroom (worst case 5.41:1) if you want margin.

By contrast `--text2: #453f6b` passes comfortably everywhere (8.73:1 worst case), so
the ramp only has this one bad rung.

**Command:** `/impeccable colorize`

---

### [P1-5] The good news is the illegible one

**Location:** [index.html:499-530](../frontend/index.html#L499) `.kpi-trend` · **Category:** Accessibility
**Standard:** WCAG 1.4.3 (AA)

| Element | Colour | Ratio on `#fff` at 11px | Verdict |
|---|---|---|---|
| `.kpi-trend.up` "↑ 3 vs last week" | `--leaf` `#00D9D9` | **1.76:1** | severe fail |
| `.kpi-trend.down` "↓ 1 vs last week" | `--rose` `#FF2D78` | **3.56:1** | fail |

`--leaf` is a bright turquoise designed for fills and active states, where it works.
As 11px text on white it is close to invisible. Confirmed against the rendered
dashboard: the magenta "down" line reads clearly and the turquoise "up" line washes
out beside it.

There is a second problem underneath the first. The metric that is improving is the
one the user cannot read.

**Fix:** this is a token-pair problem, not a colour-selection problem. `--leaf` and
`--rose` must stay bright for fills. Add text-safe siblings:

```css
--leaf-fg: #00807F;   /* 4.78:1 on white */
--rose-fg: #C4005A;   /* 6.01:1 on white */
```

and point `.kpi-trend.up` / `.kpi-trend.down` at those. Same hues, same meaning.

**Command:** `/impeccable colorize`

---

### [P1-6] Touch targets below the 24px AA floor

**Location:** multiple · **Category:** Responsive / Accessibility
**Standard:** WCAG 2.5.8 Target Size Minimum (AA, 24×24), Apple HIG (44×44)

Measured at 375px:

| Control | Size | Count | Note |
|---|---|---|---|
| `.hi-del` history delete | **22×27** | **31** | below the 24px AA floor, and destructive |
| `.rd-day` reminder weekday | 30×30 | 7 | |
| `.mnav-btn` month nav | 35×30 | 2 | |
| `.sli` range input | **109×5** | 6 | element box is 5px tall |
| `.btn-ghost` | ~33-35 tall | ~12 | |

Two of these matter more than the rest.

**`.hi-del` at 22×27 is a delete button.** It is under the AA minimum on width, it
appears 31 times in a scrolling list, and a mis-tap destroys a day of logged data.
Smallest target in the app, highest cost of error.

**The sliders are 5px tall.** The thumb renders at 18px, but the element's hit box is
the 5px track, so a tap a few pixels high or low does nothing at all. On the End-of-day
card that is five sliders in a row that feel broken rather than missed.

**Fix:** `.hi-del` to 44×44 with the icon centred, or move deletion behind a swipe or a
confirm. For the sliders, keep the 5px painted track and grow the hit area:
`.sli{height:5px;padding:20px 0;background-clip:content-box}`, or wrap each in a
44px-tall label, which fixes P2-1 at the same time.

**Command:** `/impeccable adapt`

---

### [P2-1] Eighteen form controls have no accessible name

**Category:** Accessibility · **Standard:** WCAG 1.3.1 (A), 4.1.2 (A)

`#w0 #w1 #w3 #w4 #w5 #sleepQualSlider #pastSleepQual #pastDate #pastNote #periodNote
#morningNote #dayNote #healthFile #txLabel #txNote` and three more. Every one has a
visible label sitting next to it as a `<div>`, and none are connected.

A screen reader announces the Energy slider as "slider, 5, minimum 0, maximum 10".
Not which of the five it is.

**Fix:** the labels already exist and already have stable ids in most cases. Add
`aria-labelledby` pointing at the existing `.sli-lbl`, or convert those divs to
`<label for>`. Mechanical, no visual change.

**Command:** `/impeccable harden`

---

### [P2-2] No dark mode

**Category:** Theming · **Standard:** n/a (product judgment)

Measured: **0 `prefers-color-scheme` rules** in the entire stylesheet. The app is
`#FFFDF6` at all times.

This is scored as a theming gap but it is really a product one. From PRODUCT.md, the
core scenario is a woman logging a hot flash at 2am, one-handed, in a dark bedroom.
The app currently answers that by putting a full-brightness cream screen in her face.

The token architecture makes this unusually cheap: every colour is in `:root`, and
`themeColor()` already bridges CSS custom properties into Chart.js, so the charts
would follow a theme flip for free. The work is choosing a dark Memphis palette, not
plumbing one.

Worth noting the hard part honestly: the design leans on `--border: #12102B` hard
outlines against light fills. A dark theme cannot simply invert that, it needs the
outlines to become light-on-dark, which is a real design decision rather than a token
swap.

**Command:** `/impeccable colorize`

---

### [P2-3] `backdrop-filter` on all 27 cards

**Location:** [css/styles.css:381](../frontend/css/styles.css#L381), [:885](../frontend/css/styles.css#L885)
**Category:** Performance

```css
.card{background:rgba(255,255,255,.88);backdrop-filter:saturate(1.1) blur(1px)}
```

Confirmed at runtime: **27 of 27 cards** have a non-`none` computed `backdrop-filter`.
Backdrop filters force the compositor to snapshot and re-filter the backdrop behind
every element that has one, on every paint that touches it.

**I did not measure frame drops.** An attempt to measure paint cost with and without
timed out because the browser pane was hidden and `requestAnimationFrame` does not
fire in a background tab, which is an instrument failure rather than a result. So this
is reported as a structural cost with a count, not as observed jank.

What is certain without measuring: `blur(1px)` is imperceptible. Compare the two
screenshots in this session with it on. The `saturate(1.1)` does something faintly
visible over the confetti; the blur does not.

**Fix:** drop the blur, keep the saturate, or drop both and raise the background alpha
from `.88` to `.92`. Visually indistinguishable, compositor work gone.

**Command:** `/impeccable optimize`

---

### [P2-4] No `<h1>`, no `<main>`

**Category:** Accessibility · **Standard:** WCAG 1.3.1 (A), 2.4.1 (A)

Landmarks present: `<nav>` ×1. Absent: `<main>`, `<header>`, `<footer>`.
Headings: **0 `<h1>`**, 4 `<h2>`, 31 `<h3>`.

A screen reader user landing on the app gets no document title in the heading tree and
no way to skip the nav. The wordmark is a `<div>`, so the app's own name is not in the
outline either.

**Fix:** wrap the four view containers in `<main>`, promote the wordmark to an `<h1>`
(visually identical, it is already styled by class), and the existing `<h2>` view
titles then sit correctly under it.

**Command:** `/impeccable harden`

---

### [P2-5] Two width transitions

**Location:** `.bar-fill` (0.6s), `.rx-bar` (0.3s) · **Category:** Performance

Animating `width` triggers layout on every frame. Small blast radius here (a handful
of bars, both on the dashboard) but it is the flagged pattern.

**Fix:** `transform: scaleX()` with `transform-origin: left`, which the compositor
handles without layout.

**Command:** `/impeccable optimize`

---

### [P3-1] Stale pre-rebrand colour in a keyframe

**Location:** [css/styles.css:169](../frontend/css/styles.css#L169)

```css
@keyframes tap{ ... 40%{transform:scale(.91);background:rgba(106,158,74,.3)} ... }
```

`rgb(106,158,74)` is the sage green from the theme this app had before the 90s
rebrand. It is the only surviving instance. It flashes for 40% of a tap animation, so
it is nearly invisible, which is why it survived.

**Fix:** `rgba(0,217,217,.3)` (`--leaf`) or `rgba(255,196,46,.3)` (`--amber`).

---

### [P3-2] `'Inter'` is referenced but never loaded

**Location:** [index.html:87](../frontend/index.html#L87)

```html
<input type="date" id="pastDate" style="...font-family:'Inter',sans-serif;...">
```

The document loads Fredoka and Space Grotesk only. This one control falls back to the
platform's generic sans, so the past-day date picker is the only element in the app
not in the app's typeface.

**Fix:** `'Space Grotesk', sans-serif`. Also the only inline `font-family` in the file.

---

### [P3-3] 33 colour literals outside `:root`

Most are legitimate: `rgba(255,255,255,.x)` and `rgba(0,0,0,.x)` neutral overlays for
the Win95 bevel insets, which genuinely should not be tokens. Two are not:

- `rgba(230,0,138,.05)` at `.cap-day-period` is `--chart5` with alpha, hardcoded.
- `rgba(18,16,43,.72)` at line 817 is `--border` with alpha, hardcoded.

**Fix:** `color-mix(in oklch, var(--chart5) 5%, transparent)` or a dedicated token.
Low value; noted for completeness.

---

## Patterns and systemic issues

**1. The correct pattern exists; it was applied forward and never backward.**
Everything built recently (`trg-tile`, `rx-tile`, `on-item`, the collapsible card
headers, the nav tabs) has proper roles, labels, keyboard handling and `aria-pressed`.
Everything from the original build (`sym-tile`, `sh-btn`, `flow-btn`,
`morning-header`) has none of it. This is not an absence of accessibility knowledge in
the codebase, it is an un-backfilled migration, which makes it a bounded, finishable
job rather than a rewrite. Four control sets, all listed above.

**2. One token, sixty failures.** `--muted` accounts for essentially every contrast
failure that is not `.kpi-trend`. Centralised tokens turned what would have been sixty
separate defects into one line of remediation. The token system is doing its job; the
value in it was simply chosen 0.3 too light.

**3. Bright fill colours are being used as text colours.** `--leaf` and `--rose` are
correct as fills and wrong as 11px type. The absence of `-fg` sibling tokens is what
let that happen, and it will happen again in the next feature unless the pair exists.

## Positive findings

Worth protecting.

- **Zero horizontal overflow at 320px and 375px across all four views.** Measured,
  not eyeballed, and confirmed on the iPhone 17 Pro simulator. For a fixed-canvas
  maximalist design with a fixed nav, that is not a given.
- **`prefers-reduced-motion` is honoured.** Present and correct, and rarer than it
  should be.
- **Safe-area insets on all fixed chrome.** Including the case that is invisible in
  emulation because `env()` resolves to 0 without hardware insets.
- **`themeColor()` bridging CSS custom properties into Chart.js.** No hardcoded hexes
  in the charts. This is what makes P2-2 tractable.
- **The token block is documented in the file.** The comment explaining that
  `--forest` is purple now and that names describe roles rather than values will save
  the next person, human or otherwise, a genuinely confusing hour.
- **Empty states teach the interface.** "Log 4 more days to see which symptoms travel
  together, 6 of 10 days so far" is a real empty state, not "no data".
- **Minimum sample sizes with visible denominators everywhere.** For a health tool
  this is an ethical property, not a polish one.
- **`lang="en"` set, no images without alt** (there are no images at all; every icon
  is an emoji in text, which is the correct call for a PWA that must work offline).

## A false positive I caught, and why it is in this report

The automated contrast walker reported `.mh-status`, the "Not done" pill, at
**1.15:1**, which would make it invisible. It is not: it is near-black text on amber
and reads perfectly.

The cause was the instrument. That element's background computes as
`color(srgb 1 0.91902 0.713137)`, and the numeric parser read `1, 0.919, 0.713` as
0-255 values, producing near-black. The real ratio is roughly **15:1**.

Recorded here because "would a healthy system have produced this same reading?" is the
question that caught it, and because two of the *other* extreme readings in the same
pass (`.kpi-trend.up` at 1.76 and `--muted` at 4.18) were verified against actual
computed foreground and background values and are real.

## Recommended actions

1. **[P1] `/impeccable harden`** · Give `sym-tile`, `sh-btn`, `flow-btn` and
   `morning-header` the treatment `on-item` already has. Add the global
   `:focus-visible` ring and remove the four unpaired `outline:none`. Connect the 18
   orphaned labels. Add `<main>` and promote the wordmark to `<h1>`. This single pass
   takes Accessibility from 2 to 4 and is most of the remaining score.
2. **[P1] `/impeccable colorize`** · `--muted` to `#6b6394`. Add `--leaf-fg` and
   `--rose-fg` for the trend indicators. Two-line fix, ~60 elements.
3. **[P1] `/impeccable adapt`** · `.hi-del` to 44×44, slider hit areas to 44px tall.
4. **[P2] `/impeccable optimize`** · Drop `blur(1px)` from 27 cards; the two width
   transitions to `scaleX`.
5. **[P2] `/impeccable colorize`** · Dark mode. Larger than the others and a real
   design decision, not a token swap, because the hard black outlines have to invert.
6. **[P3] `/impeccable polish`** · The stale sage green, the phantom Inter, the two
   hardcoded alpha literals.

Items 1 through 3 are roughly one session and would move the score to about 18/20.
