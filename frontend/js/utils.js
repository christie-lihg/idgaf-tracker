/* eslint-disable no-undef, emergent/no-undef */
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
 *
 * Rotation is only half of it. An earlier version rotated perfectly but 11 of
 * 18 lines opened with 'Noted.' or 'Logged.', so the first word you read was
 * the same most of the time and it still felt repetitive. Keep the OPENING
 * WORDS varied, not just the lines. And skip the acknowledgement verb entirely:
 * the toast appearing IS the acknowledgement, and it already names the symptom.
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
  'Bogus.',
  'Total drag.',
  'Bunk.',
  'Weak sauce.',
  'Harsh.',
  'Not rad.',
  'Wack.',
  'Major bummer.',
  'Lame.',
  'Gnarly.',
  'That bites.',
  'Rough one.',
  'Ugh, again?',
  'So not fresh.',
  'Talk to the hand.',
  'Hang in there.',
  'As if you needed that.',
  'Blergh.',
  'Not!',
  'How rude.',                 // Full House / Michelle Tanner
  "Whatchu talkin' 'bout?",    // Diff'rent Strokes
  'Ay caramba.',               // Bart Simpson
  "Well, isn't that special.", // SNL / Church Lady
  'Did I do that?',            // Urkel — apologetic, fits a symptom
  "D'oh.",                     // Homer
  'Bogus journey.',            // Bill & Ted
  'Take a chill pill.',
  "Ain't nobody got time for that.",
];
const hype = makeRotator(HYPE);

/* Saves ARE accomplishments, so these get the upbeat register. Heads vary
   here too — the ✅ already signals "it saved", so the words don't have to. */
const MORNING_SAVED = makeRotator([
  '🌅 Done and done.',
  '🌅 Locked in. Nice.',
  '🌅 Morning: handled.',
  '🌅 All set. Fresh.',
  '🌅 Nice work.',
  '🌅 Bazinga.',                 // Big Bang Theory
  '🌅 How you doin\'.',          // Joey / Friends
  '🌅 Legendary.',               // HIMYM
  '🌅 Winning.',                 // Charlie Sheen — a classic
]);
const WELLNESS_SAVED = makeRotator([
  "✅ You're all that.",
  '✅ All that and a bag of chips.',
  '✅ Locked in. Word.',
  '✅ Da bomb.',
  '✅ Sweet.',
  '✅ Yada, yada, yada — saved.',   // Seinfeld
  "✅ Pivot! Pivot! …saved.",       // Ross / Friends
  '✅ Show me the money.',          // Jerry Maguire
  '✅ Booyah.',                     // Stuart Scott / In Living Color
  '✅ Cowabunga.',                  // TMNT
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
