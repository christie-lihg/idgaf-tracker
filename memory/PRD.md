# IDGAF Tracker — PRD

## Original Problem Statement
Vanilla HTML/CSS/JS app (no build, no backend). Every entry lives in the browser's
localStorage. Add two features while respecting hard constraints in
`docs/ARCHITECTURE.md`:

**Feature A — Capacity rating**: 6th daily wellness rating "Fucks left to give"
(icon 🫠, 0–10, prompt "How many did you have left today?"). Playful label in-app,
clinical label "Capacity (self-rated 0–10)" everywhere data leaves the app
(weekly summary export, printed summaries). Plus a dashboard insight panel
comparing average capacity on worst-third vs best-third of symptom days over the
last 30 days. Hidden below 10 days of data.

**Feature B — JSON export/import**: History view gets a Data section. Export
downloads a single JSON file (`idgaf-tracker-YYYY-MM-DD.json`) with every
`idgaf_*` key + schema version + export date. Import shows a confirm dialog
naming how many days will be ADDED vs OVERWRITTEN; malformed files show a
clear error rather than throwing.

## Architecture (Unchanged Constraints)
- Static site, no backend, no build step, no network calls with health data.
- `<script>` tags stay classic (never `type="module"`) — 46 inline handlers rely on globals.
- localStorage keys `idgaf_day_*`, `idgaf_morning_*`, `idgaf_period_*`. `migrateLegacyKeys()` in `js/storage.js` carries `vv_*` forward.
- `SYMS` and `WELLNESS_ITEMS` in `js/symptoms.js` are keyed by array position — **append only**.
- All colour lives in `:root` in `css/styles.css`. JS uses `themeColor()` from `js/utils.js`.
- Every new shell file must be added to `SHELL` in `sw.js` and `CACHE_VERSION` bumped.

## Deployment Layout (2026-01)
Deployment failed on first attempt with `read env file backend/.env: no such
file or directory`. Restructured into the standard Emergent layout:

- **`/app/frontend/`** — static PWA moved here. `package.json` uses `serve` to
  serve `index.html` on port 3000 (`serve -s . -l tcp://0.0.0.0:3000
  --no-clipboard --no-request-logging`). `.env` holds `REACT_APP_BACKEND_URL`.
- **`/app/backend/`** — minimal FastAPI on port 8001 exposing only
  `/api/health`. Does NOT touch MongoDB. Exists solely so the platform's
  build/health-check steps succeed. Anyone adding endpoints that persist
  symptom data here is violating the local-only guarantee documented in
  `docs/ARCHITECTURE.md`.
- Supervisor now reports both services RUNNING. deployment_agent status: **pass**.

## What's Been Implemented (2026-01)
### Feature A — Capacity rating
- **`js/symptoms.js`**: appended `{label:'Fucks left to give', icon:'🫠', clinicalLabel:'Capacity (self-rated 0–10)', prompt:'…'}` as `WELLNESS_ITEMS[5]`. Existing 5 entries unchanged.
- **`index.html`**: added 6th slider row (`#w5` / `#wv5`) in the end-of-day wellness card with the playful label + prompt hint. Added `#capacityInsightCard` on the dashboard.
- **`js/today.js`**: `restoreWellnessSliders` / `saveWellness` now iterate `WELLNESS_ITEMS.length` (not hardcoded 5). `past-day-modal.js` already iterated the array, so it inherits the 6th slider automatically.
- **`js/dashboard.js`**:
  - Wellness-trends chart now plots all 6 series: Energy, Mood, Sleep, Clarity, Hot flash (uses `--amber`), Capacity (uses new `--chart5`).
  - `renderCapacityInsight()`: last 30 days → keep days with wellness entry AND capacity value → require ≥10 → sort by symptom count → split into thirds → compare average capacity on worst-third vs best-third → plain-language summary ("On your N worst symptom days you had A/10 left to give, versus B on your best days. That's a Z% drop.").
  - `buildWeeklySummary()`: appended `Capacity (self-rated 0–10): X` — clinical label only, never the playful one.
- **`css/styles.css`**: new `--chart5` token; styles for `.cap-*` insight panel and `.sli-hint` under the capacity slider label.

### Feature B — JSON export/import
- **`js/data-io.js`** (new): `exportAllData()`, `triggerImportData()`, `handleImportFile()`, `proceedWithImport()`, `summarizeImport()`.
  - Export: single JSON with `{app:'idgaf-tracker', schemaVersion:1, exportDate, data:{key:value,…}}`, download named `idgaf-tracker-YYYY-MM-DD.json`.
  - Import: parses safely (try/catch), validates shape, filters to `idgaf_*` keys only, counts ADD vs OVERWRITE days, native `confirm()` names both counts, only writes on OK.
  - Malformed → clear `alert()`, no throw, no writes.
- **`index.html`**: Data card in History view with Export/Import buttons + hidden file input.
- **`css/styles.css`**: `.data-actions` / `.data-hint` styles.
- **`sw.js`**: added `./js/data-io.js` to `SHELL`, bumped `CACHE_VERSION` v13 → v14.

### Testing IDs added
`save-wellness-btn`, `save-past-day-btn`, `save-period-btn`, `export-data-btn`,
`import-data-btn`, `import-file-input`.

## Verified (screenshot + evaluate)
- All 6 sliders render with correct playful label + prompt subtitle.
- Wellness save persists indices 0–5 to `idgaf_day_<today>.wellness`.
- Past-day modal has 6 sliders.
- Wellness chart datasets = ['Energy','Mood','Sleep','Clarity','Hot flash','Capacity'].
- Capacity insight hidden state shows "Log capacity 7 more days" with "3 of 10 days".
- Capacity insight populated state shows Worst 4.4/10 vs Best 8.8/10 with "50% drop" summary.
- Weekly summary contains `Capacity (self-rated 0–10):` and does NOT contain `Fucks left`.
- Export downloads `idgaf-tracker-2026-08-20.json` with schema:1, correct key set.
- Malformed import → clear alert, no writes, no throw.
- Valid import cancel → localStorage unchanged. Valid import confirm → 3 records written; overwrite preserves non-conflicting existing keys.
- Nav / symptom-tap / morning check-in regression clean, zero console errors.

## Prioritized Backlog
- P2: Add a small "download" icon and file-size hint before/after export.
- P2: Show which days will be overwritten (list of dates) in the import confirm, not just a count — trades brevity for clarity.
- P2: Round-trip test on rollup: export → wipe → import → verify byte-identical.

## User Personas
- **Person tracking perimenopause symptoms** on their own device. Privacy is
  the product; no login, no cloud. Wants portable data (export/import) to move
  between phones or share a snapshot with a clinician.
- **Clinician receiving the exported weekly summary** — reads the clinical
  language ("Capacity (self-rated 0–10)"), never the app's playful register.
