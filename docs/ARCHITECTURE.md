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

## Two registers: voice vs clinical output

The app's **chrome** is irreverent and period-90s — toasts ("Ugh. Logged."),
empty states ("Nada. Zip. Zilch."), button labels. `HYPE` in `js/utils.js` holds
the rotating acknowledgements shown when a symptom is logged.

Three things are **deliberately excluded** from that voice, and must stay so:

1. **Symptom and wellness names** (`SYMS`, `WELLNESS_ITEMS` in `js/symptoms.js`) —
   these are clinical vocabulary. "Vasomotor", "urinary urgency" and the rest are
   the words a clinician recognises. Do not make them cute.
2. **Dashboard figures and labels** — counts, averages, trends. The numbers are
   the product.
3. **The weekly summary export** — see below.

One tone rule inside the chrome: logging a symptom is not an achievement.
Acknowledgements commiserate ("Noted. Bogus.") rather than congratulate —
"Booyah!" in response to a migraine reads as the app not listening. Save the
celebratory register for things the user actually accomplished, like completing
a check-in.

## The clinical export stays plain

The app is branded **IDGAF Tracker**. The weekly summary produced by
`buildWeeklySummary()` in `js/dashboard.js` is **not** branded, and must not become
so — it is generated to be pasted into a message to a clinician, or printed and
carried into an appointment. It opens with `Week of <date> – <date>` and contains
only dates, counts, averages and the user's own notes.

If you are adding a PDF or richer export, keep the same rule: the product can be
irreverent, the clinical artefact it emits cannot be.

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

Everything lives in `localStorage` under three key families, all prefixed
`STORE_PREFIX` (`idgaf_`) from `js/storage.js`. **Do not rename these keys.**
Users have real history under them and a rename is silent data loss.

They were originally `vv_`, a prefix inherited from an unrelated project.
`migrateLegacyKeys()` handles the rename: it runs once from `js/init.js` before
the first render, copies the legacy keys across, and is deliberately
non-destructive — originals are kept as a backup, existing `idgaf_*` keys are
never overwritten, and it is idempotent via a completion marker.

If you ever need to do this again, note the one non-obvious rule: it migrates an
explicit list of key families this app owns, **not** everything matching the old
prefix. A blanket prefix copy would pull an unrelated project's keys into this
app's storage if the two ever shared an origin. Enumerate what you own.

### `idgaf_day_YYYY-MM-DD`

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
>
> The same applies to `wellness` keys and `WELLNESS_ITEMS`. To retire an input,
> set `retired: true` on the entry and drop its markup — never splice the array.
> `WELLNESS_ITEMS[2]` (Sleep Quality) is retired this way: the morning check-in
> asks it now, so nothing new writes `wellness[2]`, but the slot has to stay or
> every historical Brain Clarity value silently becomes a Sleep Quality value.
> Anything that *reads* sleep quality should prefer `morning.sleepQuality` and
> fall back to `wellness[2]` for older days — see `js/dashboard.js`.

### `idgaf_morning_YYYY-MM-DD`

The morning check-in: overnight symptom flags, sleep hours, sleep quality, note.

### `idgaf_period_YYYY-MM-DD`

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

### While developing, the cache will lie to you

This bites during any edit session, and it does not look like a caching problem —
it looks like your change did not work. You edit `css/styles.css`, reload, and see
the old styling, because the worker serves its cached copy first.

Before concluding an edit failed, check whether the browser is even using it:

```js
// does the running page have the new token, and what is on disk?
getComputedStyle(document.documentElement).getPropertyValue('--heat1')   // '' = stale
await (await fetch('css/styles.css', {cache:'reload'})).text()           // the real file
```

If the token is empty but the fetched file contains it, you are looking at cache,
not a bug. Clear it with:

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

then reload. Or tick **Application → Service Workers → Bypass for network** in
DevTools for the session.

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
