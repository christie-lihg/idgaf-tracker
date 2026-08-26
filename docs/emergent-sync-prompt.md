# Emergent sync prompt

## Read this before pasting anything (v2 — after two silent revert failures)

Two prior attempts both reported success — all four verification greps passed —
and the deployed app still shipped old content anyway, unmasked and missing
weeks of features. The pattern both times: **files on disk were correct, but
whatever Deploy actually ships from was not.**

The likely cause: Emergent tracks project state through its own edit/checkpoint
system (the thing that produces `"Auto-generated changes"` commits), separately
from the raw container filesystem. A shell `curl` can write correct bytes to
disk while never entering Emergent's own model of "what this project contains."
Deploy then ships from that model, not from disk — and a later Emergent-side
push to GitHub reverts to that model too, which is why masking and header
commits kept vanishing from `main` after each sync.

**So this version of the prompt does not use a bare shell fetch.** It tells the
agent explicitly to make each downloaded file a real, tracked edit — through
whatever file-write/edit tool it has, not shell redirection alone — and to
checkpoint immediately after, before doing anything else, so Deploy has no
ambiguity about what state to ship.

If this run *also* reports success but the deployed app is still wrong, that
confirms the tracking-layer theory beyond reasonable doubt, and the reliable
path becomes the manual one: open the **Code** button (VS Code) in Emergent,
open each file below yourself, and paste in the content from the matching
GitHub URL by hand. Slower, but every keystroke goes through Emergent's own
editor, so nothing can be invisible to it.

---

## The prompt

Paste this into Emergent as a single message.

> I need you to update several files in this project so they exactly match my
> public GitHub repo. This has failed silently twice before: the verification
> checks passed but the deployed app still showed old content, which means the
> files were written somewhere your own change-tracking didn't see. Follow this
> exactly.
>
> **For each file below:**
> 1. Fetch it from `https://raw.githubusercontent.com/christie-lihg/idgaf-tracker/main/<path>`
> 2. Open the destination file **using your normal file-editing capability** — the
>    same mechanism you'd use if I asked you to edit the file directly. Do NOT
>    write it only via a shell command like `curl -o` or `cat >`. If a shell
>    fetch is the only way to retrieve the content, fetch it that way, then take
>    the retrieved text and write it into the file through your file-edit tool
>    as a **second, separate step** — the edit has to register as a real change
>    to the project, not just a filesystem write.
> 3. Replace the entire file content verbatim. Do not rewrite, reformat,
>    "improve", or regenerate — the content is already tested; your job is
>    transfer, not authorship.
>
> Files (path is identical on both sides — GitHub URL suffix and destination):
>
> ```
> frontend/js/import-health.js
> frontend/js/init.js
> frontend/js/triggers.js
> frontend/js/trends.js
> frontend/js/treatments.js
> frontend/js/correlations.js
> frontend/js/onboarding.js
> frontend/js/reactions.js
> frontend/js/extras.js
> frontend/js/dashboard.js
> frontend/js/symptoms.js
> frontend/js/morning.js
> frontend/js/past-day-modal.js
> frontend/js/theme.js
> frontend/js/cycle.js
> frontend/js/today.js
> frontend/index.html
> frontend/css/styles.css
> frontend/sw.js
> frontend/icons/icon-192.png
> frontend/icons/icon-512.png
> frontend/icons/icon-512-maskable.png
> frontend/icons/icon-192.svg
> frontend/icons/icon-512.svg
> README.md
> index.html
> ```
>
> Notes:
> - `triggers.js`, `trends.js`, `treatments.js`, `correlations.js`,
>   `onboarding.js`, `reactions.js` and `theme.js` are new files.
> - `frontend/index.html` contains an INLINE `<script>` in `<head>`, before
>   the stylesheet link, that sets `data-theme`. It has to stay inline and
>   stay before the stylesheet: deferred or moved, the app flashes white on
>   every load, which is the exact moment the dark theme exists for.
> - `js/theme.js` must load BEFORE `js/init.js`. `init.js` executes at load
>   time and calls `initTheme()` behind a `typeof` guard, so the wrong order
>   fails silently rather than erroring.
> - The root `index.html` is a redirect to `frontend/`, not the app itself.
> - The three PNGs are binary — fetch and write them as binary, not through any
>   text-mode tool.
> - `frontend/index.html` contains the literal string `type="module"` exactly
>   once, inside a comment warning against ever using it. That one hit is
>   correct — leave it. Do not convert any `<script>` tag to a module: the
>   markup uses ~45 inline `onclick=` handlers that resolve against global
>   scope, and modules break every one of them at click time with no error on
>   load.
> - Do not rename any `idgaf_*` localStorage key.
> - Do not reorder `SYMS` or `WELLNESS_ITEMS` in `symptoms.js` — stored entries
>   are keyed by array position, so reordering silently relabels existing
>   history.
>
> **After all 26 files are written, in this exact order:**
>
> 1. Run ALL of these and report the actual output of each, not just pass/fail.
>    Each one probes a DIFFERENT file, because a partial sync is the failure
>    mode that has already happened: on the last attempt `sw.js` synced and
>    `styles.css` did not, so a version check alone passed while none of the
>    actual fixes shipped. A version marker only ever proves that one small
>    file arrived.
>
>    Every file in the list above now has at least one assertion pointed at
>    it. Keep it that way. `morning.js` and `past-day-modal.js` were being
>    changed for two releases while sitting outside the list entirely, so a
>    "successful" sync would have shipped tile styling with no tile
>    behaviour behind it and nothing would have caught it.
>
>    - `grep -c "{start:'" frontend/js/import-health.js` → must be **0**
>    - `grep -c "importHistoricalPeriodData" frontend/js/init.js` → must be **0**
>    - `grep -c 'type="module"' frontend/index.html` → must be **1**
>    - `grep -c "F#\$%s left to give" frontend/js/symptoms.js` → must be **1**
>    - `grep -c "safe-area-inset" frontend/css/styles.css` → must be **8**
>    - `grep -c "nt-ico" frontend/index.html` → must be **4**
>    - `grep -c 'id="w2"' frontend/index.html` → must be **0**
>    - `grep -c "sli-scale" frontend/index.html` → must be **3**
>    - `grep -c "initCollapsibleCards" frontend/js/extras.js` → must be **1**
>    - `grep -c "aria-pressed" frontend/js/morning.js` → must be **1**
>    - `grep -c "item.retired" frontend/js/past-day-modal.js` → must be **1**
>    - `grep -c "read:d=>" frontend/js/dashboard.js` → must be **6**
>    - `grep -c "nav-wordmark" frontend/index.html` → must be **1**
>    - `grep -c "nav-right" frontend/index.html` → must be **0**
>    - `grep -c "createElement('button')" frontend/js/today.js` → must be **1**
>    - `grep -c "focus-visible" frontend/css/styles.css` → must be **6**
>    - `grep -c "var(--on-bright)" frontend/css/styles.css` → must be **14**
>    - `grep -c 'data-theme="dark"' frontend/css/styles.css` → must be **12**
>    - `grep -c "<main" frontend/index.html` → must be **1**
>    - `grep -c "js/theme.js" frontend/sw.js` → must be **1**
>    - `grep -o -- "--muted:#[0-9a-f]*" frontend/css/styles.css | head -1` → must read **`--muted:#6b6394`**
>    - `wc -c < frontend/css/styles.css` → must be **70105**
>    - `grep CACHE_VERSION frontend/sw.js` → must read **`idgaf-tracker-v35`**
>
>    If ANY of these is wrong, the sync is incomplete. Do not deploy. Re-fetch
>    the specific file that failed and re-check before continuing.
> 3. **Explicitly save or checkpoint the project now**, before doing anything
>    else — whatever action in your environment marks the current state as the
>    one to build from. Tell me what you did for this step by name.
> 4. Only after that checkpoint: open the app in your preview and confirm no
>    console errors and all four views render.
> 5. Deploy, in the same session, with no other actions in between steps 3 and
>    this one.
> 6. After deploying, fetch the LIVE deployed URL's `frontend/sw.js` (or
>    `sw.js`, whichever resolves) yourself and paste back the `CACHE_VERSION`
>    line it actually contains. I need to see that this matches v29 on the
>    live site, not just in your workspace.

---

## What this brings in

| | |
|---|---|
| **Privacy fix** | removes the hardcoded personal cycle history + its auto-run on first load |
| **Apple Health import** | reads the user's own `export.xml`, chunked, on-device, preview + confirm |
| **Cycle patterns** | which symptoms cluster where in the cycle |
| **Treatment log + "Did it help?"** | dated changes, before/after on symptom load and capacity |
| **Trigger patterns** | daily checklist, days-with vs days-without |
| **Six-month trend** | the timescale perimenopause actually moves on |
| **Symptom direction** | last 30 days vs the 30 before, per symptom |
| **Notes search** | notes were write-only; now findable |
| **New icon** | stacked IDGAF wordmark, no leaf |
| **Symptom correlations** | pairs co-occurring more than chance explains, scored by lift |
| **First-run onboarding** | 3 slides on an empty profile — what it is, privacy, the doctor summary |
| **Day reactions** | one-tap "how was today", six levels, plus a 30-day distribution |
| **Reminder weekdays** | pick which days the daily reminder may fire |
| **Masked label** | the capacity slider reads "F#$%s left to give", not spelled out |
| **90s headers** | eighteen card titles rewritten as period references |
| **Ghost-button fix** | Emergent's own fix, folded back in — legible over the confetti |
| **Cross-host QR URL** | Emergent's own fix — works on GitHub Pages and behind Emergent's redirect |
| **Phone fixes** | safe-area insets so the nav clears the status bar; nav tabs become 44px icon squares below 640px (was overflowing 79px) |
| **Overnight tiles** | the check-list became two-up tap tiles, icon and label centred, no tick box |
| **Sleep row fixes** | the 0–10 scale labels sit either side of the slider instead of being crushed into a 32px column; the eight hour bubbles stay on one line |
| **One sleep question** | the duplicate end-of-day Sleep Quality slider is gone — the morning check-in asks it, and the chart and doctor summary now read it from there |
| **Collapsible cards** | every non-chart card folds shut, state remembered per card |
| **Keyboard access** | the 22 symptom tiles, 8 sleep-hour bubbles, 5 flow buttons and the morning header were `div`s with a JS onclick; all are real controls now, so the app can be used without a pointer |
| **Focus ring** | there was no visible focus indicator anywhere; now a 3px offset ring in `--border` |
| **Contrast** | `--muted` was short of 4.5:1 on all four surfaces across ~60 elements; the "improving" KPI trend was 1.76:1 |
| **Dark mode** | three states (auto/light/dark), no flash on load, charts follow the theme |
| **Tab order** | 29 controls inside five invisible modals sat ahead of the page in the tab order |
| **The app says its name** | the nav badge is the IDGAF wordmark instead of a ✦ that named nothing; "Tracker" beside it down to 370px; an empty `.nav-right` spacer that was holding 42px hostage is gone |

## If this still doesn't work

Do the manual copy. In Emergent, click **Code** (opens VS Code). For each file in
the list above, open it and replace its contents by hand with what's at
`https://github.com/christie-lihg/idgaf-tracker/blob/main/<path>` (use the "Raw"
button on GitHub for plain text to copy). Slower — twenty files — but every
change goes through Emergent's own editor, which removes the one variable that
has failed twice: a write path invisible to its tracking.

If even that doesn't survive a deploy, the platform itself has a state-tracking
bug beyond what a prompt can route around, and Emergent support is the next
step, not another prompt rewrite.
