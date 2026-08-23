# Emergent sync prompt

Emergent's GitHub integration is **one-directional** (Emergent → GitHub). There is
no pull, so work done outside Emergent has to be brought in another way.

The repo is public, so `raw.githubusercontent.com` serves every file directly.
Rather than have the agent *reimplement* features from a description — paying
credits to regenerate code that already exists and is tested — it just downloads
them.

Paste the block below into Emergent as a single message.

---

## The prompt

> Download these files from my public GitHub repo and write them into this
> project, replacing what is there. **Take them verbatim — do not rewrite,
> reformat, "improve", or regenerate any of them.** They are already tested; your
> job is transfer, not authorship. Do all of them in one pass; don't stop to check
> in between files.
>
> Base URL: `https://raw.githubusercontent.com/christie-lihg/idgaf-tracker/main/`
>
> Each path below is both the download path (base URL + path) and the destination:
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
>   `onboarding.js` and `reactions.js` are new files. `extras.js` is an
>   edit to your existing file (weekday selection on the reminder).
> - The root `index.html` is a redirect to `frontend/`, not the app itself.
> - Download the three PNGs in **binary mode** (`curl -o`, or `wb`) — do not pipe
>   them through text handling and do not regenerate them.
> - If a download returns stale content, append `?v=2` and retry;
>   raw.githubusercontent.com caches for a few minutes.
>
> **Do not change anything else.** Specifically:
> - Do not convert the scripts to ES modules. The markup uses ~45 inline
>   `onclick=` handlers that resolve against global scope; modules break every
>   button at click time with no error on load. `frontend/index.html` contains the
>   string `type="module"` exactly once, inside a comment warning against this —
>   that hit is expected, leave it.
> - Do not rename any `idgaf_*` localStorage key.
> - Do not reorder `SYMS` or `WELLNESS_ITEMS`; stored entries are keyed by array
>   position, so reordering silently relabels existing history.
>
> **Then verify and report these four:**
>
> 1. `grep -c "{start:'" frontend/js/import-health.js` → must be **0**
> 2. `grep -c "importHistoricalPeriodData" frontend/js/init.js` → must be **0**
> 3. `grep -c 'type="module"' frontend/index.html` → must be **1**
> 4. `grep CACHE_VERSION frontend/sw.js` → should read `idgaf-tracker-v25`
>
> Then open the app, confirm no console errors and that all four views render,
> and deploy.

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

## Why assertion 1 matters most

The current `import-health.js` in the deployed app contains one person's real
menstrual history hardcoded in source, and `init.js` runs it on first load — so
every new user receives that history preloaded and the Cycle tab shows those
stats as their own. If the agent reports anything other than **0** for assertions
1 and 2, the fix did not land and nothing else matters.
