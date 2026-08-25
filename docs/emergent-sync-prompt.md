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
>   `onboarding.js` and `reactions.js` are new files.
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
> **After all 20 files are written, in this exact order:**
>
> 1. Run these four checks and report the actual output of each, not just
>    pass/fail:
>    - `grep -c "{start:'" frontend/js/import-health.js` → must be **0**
>    - `grep -c "importHistoricalPeriodData" frontend/js/init.js` → must be **0**
>    - `grep -c 'type="module"' frontend/index.html` → must be **1**
>    - `grep CACHE_VERSION frontend/sw.js` → must read **`idgaf-tracker-v28`**
> 2. Additionally run `grep -c "F#\$%s left to give" frontend/js/symptoms.js` →
>    must be **1**. (This is the specific line that reverted last time — if
>    this comes back 0, the sync did not take even if the other four passed.)
> 3. **Explicitly save or checkpoint the project now**, before doing anything
>    else — whatever action in your environment marks the current state as the
>    one to build from. Tell me what you did for this step by name.
> 4. Only after that checkpoint: open the app in your preview and confirm no
>    console errors and all four views render.
> 5. Deploy, in the same session, with no other actions in between steps 3 and
>    this one.
> 6. After deploying, fetch the LIVE deployed URL's `frontend/sw.js` (or
>    `sw.js`, whichever resolves) yourself and paste back the `CACHE_VERSION`
>    line it actually contains. I need to see that this matches v28 on the
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
