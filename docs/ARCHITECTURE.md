# Architecture

Notes for anyone — human or AI agent — changing this codebase.

## The one rule that will bite you

**The `<script>` tags in `index.html` must stay classic scripts. Never add
`type="module"`.**

The markup uses 37 inline `onclick=` and 9 inline `oninput=` handlers:

```html
<button class="nav-tab" onclick="showView('today')">Today</button>
```

Inline handlers resolve function names against the **global** scope. Every function
in `js/` is declared at the top level of a classic script, which puts it on `window`,
which is why those handlers work.

ES modules get their own scope. The moment a `<script>` becomes `type="module"`, its
functions stop being global, and every button in the app fails with
`Uncaught ReferenceError: showView is not defined` — **at click time, not load time**.
Nothing throws on page load, the app looks completely fine, and it is entirely broken.

If you want ES modules, that is a legitimate refactor, but it is not a one-line
change. You must also replace all 46 inline handlers with `addEventListener`
bindings, including the ones generated inside template strings in `today.js`,
`history.js` and `cycle.js`.

## Script load order

`index.html` loads scripts with `defer`, which guarantees they execute **in document
order, after the DOM is parsed**. Order matters:

1. `vendor/chart.umd.min.js` — defines `Chart`, needed by `dashboard.js`
2. `js/symptoms.js` — `SYMS` and `WELLNESS_ITEMS`, read by nearly everything
3. `js/storage.js`, `js/utils.js` — the shared base layer
4. feature modules — `nav`, `morning`, `today`, `dashboard`, `history`,
   `past-day-modal`, `cycle`, `import-health`
5. `js/init.js` — **the only file that executes anything at load time**

Because everything else is function *declarations* (hoisted) and top-level `const`
definitions, the feature modules can be reordered among themselves safely. `init.js`
must stay last.

## Data model

Everything lives in `localStorage` under three key prefixes. **Do not rename these
keys** — users have real history under them, and a rename is a silent data loss.

### `vv_day_YYYY-MM-DD`

```jsonc
{
  "events": [
    { "sym": 3,          // index into SYMS in js/symptoms.js
      "ts": 1755500000000,
      "time": "2:14 PM",
      "intensity": 2 }   // 1–3, or null if never set
  ],
  "wellness": { "0": 7, "1": 5, "2": 6, "3": 8, "4": 3 },  // index into WELLNESS_ITEMS
  "note": "free text"
}
```

> ⚠️ `events[].sym` is a **positional index** into the `SYMS` array. Inserting or
> reordering entries in `SYMS` silently relabels every historical event. Only ever
> **append** to `SYMS`. If you must remove a symptom, tombstone it rather than
> splicing it out.

### `vv_morning_YYYY-MM-DD`

The morning check-in: overnight symptom flags, sleep hours, sleep quality, note.

### `vv_period_YYYY-MM-DD`

```jsonc
{ "flow": "light" | "medium" | "heavy", "note": "" }
```

A day with no period key means no flow that day. `savePeriodDayData` **removes** the
key when flow is `'none'` rather than storing it — so absence is meaningful, and
`allPeriodDates()` scanning for existing keys is the source of truth for cycle stats.

## Offline

`sw.js` precaches the app shell cache-first. Two things to remember:

- **Bump `CACHE_VERSION` whenever you change any shell file.** Otherwise returning
  users keep booting the old cached build and will not see your change.
- **Add new files to the `SHELL` array.** A new `js/` file that is not listed will
  work online and 404 offline — which you will not notice in normal development.

Cross-origin requests (Google Fonts) use network-first with a cache fallback, and the
CSS declares system-font fallbacks, so a font failure degrades quietly.

## Testing without a backend

There are no automated tests. To exercise the dashboard you need data, and a fresh
browser has none — the dashboard renders a "No data yet" empty state that will pass a
casual smoke test on a completely broken build.

Paste [`docs/seed-demo-data.js`](seed-demo-data.js) into the browser console to
populate 14 days of realistic entries, then reload.

## Deployment

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on every
push to `main`. Since there is no build step, the deployed site is byte-identical to
the repo — what you commit is what ships.
