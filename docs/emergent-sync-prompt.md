# Emergent sync prompt

Emergent's GitHub integration is **one-directional** (Emergent → GitHub). There is
no pull. So work done outside Emergent has to be brought in another way.

The repo is public, which means `raw.githubusercontent.com` serves every file
directly. So instead of the agent *reimplementing* features from a description —
paying credits to regenerate code that already exists and is tested — it just
downloads them.

Paste the block below into Emergent as a single message.

---

## The prompt

> Fetch a set of updated files from my public GitHub repo and write them into this
> project, replacing what is there. **Download them verbatim — do not rewrite,
> reformat, "improve", or regenerate any of them.** They are already tested. Your
> job is transfer, not authorship.
>
> Base URL: `https://raw.githubusercontent.com/christie-lihg/idgaf-tracker/main/`
>
> **Do these two first — they fix a live privacy defect:**
>
> | Download from base URL + | Write to |
> |---|---|
> | `frontend/js/import-health.js` | `frontend/js/import-health.js` |
> | `frontend/js/init.js` | `frontend/js/init.js` |
>
> Why this is urgent: the current `import-health.js` contains one specific
> person's real menstrual history hardcoded into the source, and `init.js` runs it
> automatically on first load. Every new user of the deployed app receives that
> person's period history preloaded, and the Cycle tab shows their stats as if
> they were the user's own. The replacement removes the data entirely and swaps in
> a real Apple Health `export.xml` importer that reads the user's own file
> on-device.
>
> **Then the rest:**
>
> | Download from base URL + | Write to |
> |---|---|
> | `frontend/js/triggers.js` | `frontend/js/triggers.js` *(new file)* |
> | `frontend/js/trends.js` | `frontend/js/trends.js` *(new file)* |
> | `frontend/js/treatments.js` | `frontend/js/treatments.js` *(new file)* |
> | `frontend/js/dashboard.js` | `frontend/js/dashboard.js` |
> | `frontend/js/symptoms.js` | `frontend/js/symptoms.js` |
> | `frontend/index.html` | `frontend/index.html` |
> | `frontend/css/styles.css` | `frontend/css/styles.css` |
> | `frontend/sw.js` | `frontend/sw.js` |
> | `frontend/icons/icon-192.png` | `frontend/icons/icon-192.png` *(binary)* |
> | `frontend/icons/icon-512.png` | `frontend/icons/icon-512.png` *(binary)* |
> | `frontend/icons/icon-512-maskable.png` | `frontend/icons/icon-512-maskable.png` *(binary)* |
> | `frontend/icons/icon-192.svg` | `frontend/icons/icon-192.svg` |
> | `frontend/icons/icon-512.svg` | `frontend/icons/icon-512.svg` |
> | `README.md` | `README.md` |
> | `index.html` | `index.html` *(repo root — a redirect to frontend/, not the app)* |
>
> Download the four PNGs in **binary mode** (`curl -o`, or `wb`) — do not pipe
> them through any text handling, and do not regenerate them.
>
> If a download returns stale content, append a cache-buster (`?v=2`) and retry —
> raw.githubusercontent.com caches for a few minutes.
>
> **After writing everything, verify and report:**
>
> 1. `grep -c "{start:'" frontend/js/import-health.js` → must be **0**
> 2. `grep -c "importHistoricalPeriodData" frontend/js/init.js` → must be **0**
> 3. `grep -c 'type="module"' frontend/index.html` → must be **1** (that single hit
>    is a warning comment, not a real module script — do not "fix" it)
> 4. `grep "CACHE_VERSION" frontend/sw.js` → should read `idgaf-tracker-v23`
> 5. Open the app and confirm no console errors, all four views render, and the
>    Dashboard shows the new cards: Cycle patterns, Did it help?, Trigger
>    patterns, The last six months, What's rising what's easing, Search your notes
>
> **Do not change anything else.** In particular do not convert the scripts to ES
> modules (the markup uses ~45 inline `onclick=` handlers that resolve against
> global scope — modules break every button at click time with no error on load),
> do not rename any `idgaf_*` localStorage key, and do not reorder `SYMS` or
> `WELLNESS_ITEMS` (stored entries are keyed by array position; reordering
> silently relabels existing history).
>
> Then deploy.

---

## What this brings in

| | |
|---|---|
| **Privacy fix** | removes the hardcoded personal cycle history + its auto-run |
| **Apple Health import** | reads the user's own `export.xml`, chunked, on-device, with preview and confirm |
| **Cycle patterns** | which symptoms cluster where in the cycle |
| **Treatment log + "Did it help?"** | dated changes, before/after on symptom load and capacity |
| **Trigger patterns** | daily checklist, days-with vs days-without comparison |
| **Six-month trend** | the timescale perimenopause actually moves on |
| **Symptom direction** | last 30 days vs the 30 before, per symptom |
| **Notes search** | notes were write-only; now findable |
| **New icon** | stacked IDGAF wordmark, no leaf |

## If you only have credits for one thing

Do the first two files. Everything else is an improvement; that one is a defect
that affects every person who opens the app.
