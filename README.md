# 🌿 Symptom Tracker

A private, offline-first web app for tracking perimenopause and menopause symptoms,
cycles, and daily wellness — and turning them into a summary you can hand to a doctor.

**Every entry stays on your device.** There is no backend, no account, no analytics,
and no network call that carries your health data anywhere.

---

## The problem

Perimenopause symptoms arrive scattered across months — a hot flash here, three bad
nights of sleep there, brain fog that's hard to describe in a 12-minute appointment.
People routinely get told it's stress, or get sent home to "monitor it," precisely
because they have nothing to show but recollection.

Recollection is the weak link. What changes an appointment is *data*: "34 hot flashes
in the last 30 days, clustered 9pm–2am, energy averaging 4.1/10."

This app is built to produce exactly that sentence.

## What it does

| Feature | What it's for |
|---|---|
| **Morning check-in** | A 30-second overnight recall — night sweats, waking, sleep hours and quality — captured while it's still fresh |
| **One-tap symptom log** | 22 symptoms across 7 clinical groups (vasomotor, cognitive, mood, physical, sexual, urinary, anxiety), timestamped on tap |
| **Daily wellness ratings** | Energy, mood, sleep quality, brain clarity, hot-flash severity on a 0–10 scale |
| **Cycle tracker** | Flow logging on a calendar, with computed average cycle and period length |
| **Dashboard** | Week-over-week trends, a symptom heatmap, time-of-day distribution, and cycle overlay |
| **📋 Weekly summary** | One tap copies a plain-text clinical summary to your clipboard — top symptoms with counts, averages, and your own notes |

That last one is the point of the whole app. Everything else feeds it.

## Privacy

This is health data, so the architecture is the privacy policy:

- All entries live in your browser's `localStorage`, on your device only.
- There is no server, no database, no account, and no telemetry.
- The only outbound request the app makes is for Google Fonts — and it renders
  correctly with system fonts if that request never happens.
- Clearing your browser data for this site erases everything. **There is no backup.**
  Export before you clear. (See [Roadmap](#roadmap) — export is not built yet.)

## Running it

No build step, no dependencies to install. Any static file server works:

```bash
python3 -m http.server 8137
```

Then open <http://localhost:8137>.

You need a real server rather than opening `index.html` directly — service workers
require a secure context, so `file://` will load the app but not the offline mode.

### Installing it on your phone

Open the deployed URL in Safari (iOS) or Chrome (Android) and choose
**Add to Home Screen**. It installs as a standalone app, launches without browser
chrome, and works with no connection at all.

## Tech

Deliberately boring, and that is a feature:

- **Vanilla HTML, CSS and JavaScript.** No framework, no bundler, no `npm install`.
- **Chart.js 4.4.1**, vendored into `vendor/` rather than loaded from a CDN, so the
  dashboard renders offline.
- **A service worker** that precaches the app shell, cache-first.

Anyone — including an AI agent — can clone this and change something in under a
minute, because there is no toolchain standing in the way.

> **⚠️ One hard rule before you touch the JavaScript:** the markup uses inline
> `onclick=` handlers, which resolve against the *global* scope. The `<script>` tags
> must stay classic scripts. Converting them to `type="module"` silently breaks every
> button in the app. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Layout

```
index.html                 markup + ordered script tags
css/styles.css             all styling
js/
  symptoms.js              symptom + wellness definitions
  storage.js               localStorage read/write layer
  utils.js                 formatting, toasts, chart teardown
  nav.js                   view switching
  morning.js               morning check-in card
  today.js                 today's log, symptom grid, timeline
  dashboard.js             aggregation, charts, weekly summary
  history.js               past-entry list
  past-day-modal.js        backfilling a missed day
  cycle.js                 period calendar + cycle statistics
  import-health.js         historical cycle import
  init.js                  boot
vendor/chart.umd.min.js    Chart.js 4.4.1
sw.js                      offline service worker
docs/                      architecture notes + demo data seeder
```

## Roadmap

Ordered by how much each one matters to someone actually using this:

- [ ] **Export / import JSON** — right now clearing site data is unrecoverable
- [ ] **PDF summary** for appointments, not just clipboard text
- [ ] **Symptom↔cycle correlation** — "hot flashes spike on cycle days 24–28"
- [ ] **Reminders** to log the morning check-in
- [ ] **Custom symptoms** beyond the built-in 22
- [ ] **Optional encrypted sync** across devices — opt-in, end-to-end, never default

## Medical disclaimer

This app is a personal record-keeping tool. It is not a medical device, it does not
diagnose anything, and it does not provide medical advice. Always consult a qualified
healthcare professional about your symptoms and before making any treatment decision.

## License

[MIT](LICENSE)
