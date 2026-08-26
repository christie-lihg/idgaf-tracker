# PRODUCT.md

register: product

## Product purpose

A perimenopause and menopause symptom tracker. One tap logs a symptom with a
timestamp; weeks of those taps become a plain clinical summary a woman can hand
her doctor. The pitch is the gap it closes: "I've had a rough few months" is not
actionable, and a printed count of 47 hot flashes across 30 days is.

Everything runs in the browser. No account, no server, no network call ever
carries health data. That constraint is the product, not an implementation
detail: it is the reason someone will type the truth into it.

## Users

Women in perimenopause and menopause, roughly 40 to 58. They grew up in the
90s. They are tracking symptoms while already having a bad day, often at 2am,
usually one-handed on a phone, sometimes in a doctor's waiting room. They are
not patient with forms.

Two audiences read the output and they are not the same person:

1. **The user**, in the app, who needs the friction near zero and deserves an
   interface that is on her side.
2. **Her clinician**, reading the exported summary, who needs clinical
   vocabulary and numbers with denominators.

## Tone: the two-register rule

Playful in the app chrome. Clinical in anything a doctor sees.

The app can say "F#$%s left to give" on a slider. The export says "Capacity
(self-rated 0-10)". `clinicalLabel` is a separate stored field and is never
derived from the display label, because a rename in one must not leak into the
other.

One rule inside the playful register: logging a symptom is not an achievement.
Acknowledgements commiserate, they do not congratulate.

## Anti-references

- **Clinical-white wellness apps.** Teal, sans-serif, stock photography of a
  woman laughing at a salad. The category default, and it reads as something
  done TO the user rather than something she owns.
- **Gamified habit trackers.** Streak shame, confetti for compliance, a
  cartoon mascot disappointed in you. This app is used on bad days.
- **Anything that implies causation.** A health tool that says "your HRT
  reduced your hot flashes" from n-of-1 uncontrolled self-report is actively
  harmful. Descriptive language only, always with the count visible.

## Strategic principles

1. **Local-only is load-bearing.** No backend, no analytics, no CDN call with
   data in it. If a feature needs a server, the feature is wrong.
2. **Positional data keys are append-only forever.** `SYMS` and
   `WELLNESS_ITEMS` are keyed by array index in stored entries. Reordering
   silently relabels history. Retire with a flag, never splice.
3. **Minimum sample sizes, always visible.** Every insight states how many days
   it rests on and refuses to speak below a threshold.
4. **The playful voice never reaches the clinician.** See the two-register rule.
5. **Offline is the normal case.** It is a PWA because a hot flash at 2am in a
   hotel with bad wifi is a core scenario, not an edge case.

## Register note

Formally a **product** register: the user is in a task and the interface serves
it. But the aesthetic is deliberately brand-forward (90s Memphis, display type,
beveled chrome) because the identity IS a retention mechanism for this audience.
Judge the display type and the confetti as intent, not as slop. Judge anything
that costs a woman a tap on a bad day as a defect.
