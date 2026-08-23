# Emergent build brief

Copy-paste prompts for building the remaining features **on Emergent**, where
they earn the contest's 15% "Use of Emergent" score.

## Why it's written this way

Emergent charges credits per action, and roughly 50/month just to keep an app
deployed. On a 100-credit plan that leaves ~50 for building. The expensive
failure mode is discovering what you want *through* the agent — every vague
prompt, wrong turn and revert costs credits.

**Chatting with the agent is free.** So: decide in chat, then spend on one
precise prompt. Each prompt below is written to be issued once.

## Step 0 — import the repo

In Emergent: connect GitHub → import `christie-lihg/idgaf-tracker` → branch
`main`.

The repo already contains `docs/ARCHITECTURE.md`, which documents every
constraint that will silently break this app. Point the agent at it. That file
is doing double duty as guardrails for exactly this.

---

## Prompt 1 — work-capacity rating + data export

> This is a vanilla HTML/CSS/JS app with no build step and no backend. Every
> entry lives in the browser's localStorage. Read `docs/ARCHITECTURE.md` before
> changing anything — it documents constraints that break this app silently.
>
> Hard constraints, all of which cause silent breakage if violated:
>
> 1. The `<script>` tags in `index.html` must stay **classic scripts**. Do not
>    add `type="module"`. The markup uses 46 inline `onclick=`/`oninput=`
>    handlers that resolve against global scope; modules break every button in
>    the app at click time, with no error on load.
> 2. Do not rename the localStorage keys (`idgaf_day_*`, `idgaf_morning_*`,
>    `idgaf_period_*`), and do not remove `migrateLegacyKeys()` in
>    `js/storage.js` — it carries users forward from the old `vv_` prefix.
> 3. `SYMS` and `WELLNESS_ITEMS` in `js/symptoms.js` are keyed by **array
>    position** in stored entries. Only ever **append**. Inserting or reordering
>    silently relabels every historical entry.
> 4. Do not add a backend, account system, or any network call carrying health
>    data. Local-only is the product's core promise.
> 5. All colour lives in `:root` in `css/styles.css`. Use existing tokens or
>    `themeColor()` from `js/utils.js`. Do not hardcode hex values.
> 6. When you add a file: add it to the `SHELL` array in `sw.js` AND bump
>    `CACHE_VERSION`. A file missing from `SHELL` works online and 404s offline.
>
> Build two features:
>
> **A. Capacity rating — "F#$%s left to give".** Add a sixth daily rating
> alongside the existing five in `WELLNESS_ITEMS` (append only). In the app UI
> it is labelled **"F#$%s left to give"**, 0–10, icon 🫠, with the prompt "How
> many did you have left today?". It must appear in the end-of-day wellness
> card exactly like the others, persist to the same `wellness` object, and
> appear in the dashboard's wellness-trends chart as a sixth series using a new
> `--chart5` token.
>
> **Two registers apply to this field specifically.** The playful label is for
> the app. Anywhere the data leaves the app for a clinician — the weekly
> summary export and any printed summary — it must be labelled **"Capacity
> (self-rated 0–10)"**. Store one value; render two labels. Do not put the
> playful label in the export.
>
> Then add a **capacity insight panel** to the dashboard: for the last 30 days,
> compare average work capacity on days in the top third of symptom count
> versus the bottom third, and state the difference in plain language — e.g.
> "On your 10 worst symptom days you had 4.1 out of 10 left to give,
> versus 7.8 on your best days. That's a 47% drop." Hide the panel until there are at least 10
> days of data, and say how many more days are needed.
>
> **B. JSON export and import.** Add a Data section to the History view with
> "Export all data" and "Import data" buttons. Export downloads a single JSON
> file containing every `idgaf_*` key, plus a schema version and export date,
> named `idgaf-tracker-YYYY-MM-DD.json`. Import accepts that file, shows a
> confirmation naming how many days it will add and how many existing days it
> will overwrite, and only proceeds on confirm. Never wipe existing data
> without explicit confirmation. Handle malformed files with a clear error
> rather than throwing.
>
> Match the existing visual style: hard black borders, offset block shadows,
> beveled controls, uppercase Fredoka headings.

---

## Prompt 2 — printable appointment summary

> Add a "Print summary" button next to the existing copy-to-clipboard button in
> the dashboard's weekly summary card. It should open a print-friendly view of
> the last 30 days and call `window.print()`. Use a `@media print` stylesheet —
> do not add a PDF library.
>
> **The printed page must be clinically plain.** No app branding, no colour, no
> confetti, no 90s copy, no emoji. Black text on white. This is handed to a
> doctor. See the "two registers" section in `docs/ARCHITECTURE.md`.
>
> Contents: date range; total days tracked; the ten most frequent symptoms with
> counts; average energy, mood, sleep quality and capacity; cycle dates in
> the period; and the user's own notes. A plain header reading "Symptom summary
> — [date range]".

---

## Prompt 3 — cycle correlation

> Add a "Cycle patterns" card to the dashboard. For users with at least two
> recorded cycles, map every symptom event to its cycle day (day 1 = first day
> of flow) and show which symptoms cluster where — e.g. "Hot flashes peak on
> cycle days 24–28."
>
> Show only correlations with at least 5 supporting events, and state the
> sample size for each. Hide the card entirely with an explanatory message when
> there isn't enough data. Do not overstate: this is a description of the user's
> own logged pattern, not a prediction or a medical claim.

---

## Then — and this is the step people lose entries on

Deploying is **not** submitting. After deploying, submit separately from the
Emergent homepage or your profile, and confirm you have a confirmation email
and "Submitted" status.

Upvoting closes at the same moment submissions do (31 Aug, 23:59 ET), so every
day spent unsubmitted is a day not collecting the 20% of your score that comes
from votes. Submit early; you can keep improving the app afterwards.
