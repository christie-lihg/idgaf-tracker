/* Wry 90s acknowledgements shown when a symptom is logged.
 *
 * Tone matters here: logging a hot flash is not an achievement, so these
 * commiserate rather than congratulate. Nothing celebratory — "Booyah!" for
 * a migraine reads as the app not listening.
 *
 * This is CHROME copy. Symptom names, the dashboard's clinical figures and
 * the doctor-facing export stay plain — see docs/ARCHITECTURE.md.
 */
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
];
function hype(){ return HYPE[Math.floor(Math.random() * HYPE.length)] }

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
