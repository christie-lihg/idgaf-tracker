/* ── 90s voice ────────────────────────────────────────────────────────
 *
 * Tone rule: logging a hot flash is not an achievement, so these commiserate
 * rather than congratulate. Nothing celebratory — "Booyah!" in response to a
 * migraine reads as the app not listening. The upbeat register is reserved
 * for things actually completed (saving a check-in).
 *
 * This is CHROME copy. Symptom names, dashboard figures and the doctor-facing
 * export stay plain — see docs/ARCHITECTURE.md.
 */

/* Draw from a shuffled bag instead of calling Math.random() each time.
 *
 * Independent random draws FEEL repetitive to people: with a short list, the
 * odds of repeating within a handful of clicks are high, and it reads as "it
 * keeps saying the same two things" — which is exactly the bug this replaces.
 * A shuffle bag guarantees every line appears once before any line repeats,
 * and the seam check stops the tail of one bag butting up against the head of
 * the next.
 */
function makeRotator(items){
  let bag = [], last = null;
  return () => {
    if(!bag.length){
      bag = items.slice();
      for(let i = bag.length - 1; i > 0; i--){          // Fisher-Yates
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if(bag.length > 1 && bag[bag.length - 1] === last)  // no repeat across the seam
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    return (last = bag.pop());
  };
}

const HYPE = [
  'Ugh. Logged.',
  'Noted. Bogus.',
  'Logged. Whatever.',
  'On the record.',
  'Got it. Total drag.',
  'Logged. Talk to the hand.',
  'Noted. Not rad.',
  "Logged. You're not buggin'.",
  'Got it. Rough.',
  'Logged. That blows.',
  'Noted. Harsh.',
  'Got it. So not fresh.',
  'On the list. Lame.',
  'Noted. Gnarly.',
  "Got it. That's wack.",
  'Logged. Hang in there.',
  'Noted. Word.',
  'Got it. Blergh.',
];
const hype = makeRotator(HYPE);

/* Saves ARE accomplishments, so these get the upbeat register. */
const MORNING_SAVED = makeRotator([
  '🌅 Morning logged. Fresh.',
  '🌅 Locked in. Nice.',
  '🌅 Done and done.',
  '🌅 Morning: handled.',
  '🌅 Logged it. Word.',
]);
const WELLNESS_SAVED = makeRotator([
  "✅ Saved. You're all that.",
  '✅ Saved. And a bag of chips.',
  '✅ Locked in. Word.',
  '✅ Saved. Da bomb.',
  '✅ Got it. Sweet.',
]);


/* Read a CSS custom property so JS-drawn things (Chart.js, the cycle
 * calendar) follow the stylesheet instead of hardcoding hex. Re-theming the
 * app is then a single edit to :root in css/styles.css.
 *
 * themeColor('rose')      -> "#ff2d78"
 * themeColor('rose', .55) -> "rgba(255,45,120,0.55)"
 */
function themeColor(name, alpha){
  const v = getComputedStyle(document.documentElement)
              .getPropertyValue('--' + name).trim();
  if(alpha === undefined || !v.startsWith('#')) return v;
  let h = v.slice(1);
  if(h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

// UTILS
// ═══════════════════════════════════════════════════════════════
function fmtFull(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
function fmtShort(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function dc(id){const el=document.getElementById(id);if(!el)return;const c=Chart.getChart(el);if(c)c.destroy()}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}

// ═══════════════════════════════════════════════════════════════
