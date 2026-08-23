/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// SYMPTOM CORRELATIONS — which symptoms travel together
//
// Everything else on the dashboard looks at symptoms one at a time. This
// looks at PAIRS: which two show up on the same day far more often than
// either one's own frequency would predict.
//
// That gap is the whole point. "Anxiety and insomnia both happen a lot"
// is not a finding — if each occurs on 80% of days they'll overlap
// constantly by chance alone. What's worth saying is when they overlap
// MORE than chance predicts, because that suggests they're moving
// together rather than coinciding.
//
// So each pair is scored by lift:
//
//     lift = P(A and B) / (P(A) * P(B))
//
// lift 1.0 = exactly what independence predicts. 2.0 = they co-occur
// twice as often as chance. Only pairs meaningfully above 1 are shown.
//
// Same honesty rules as the rest of the dashboard: minimum sample sizes,
// counts always visible, describes what was logged and never claims one
// symptom causes the other.
// ═══════════════════════════════════════════════════════════════════════

const CORR_WINDOW     = 30;   // days to look back
const CORR_MIN_DAYS   = 10;   // days of logs before we say anything at all
const CORR_MIN_EACH   = 4;    // each symptom must appear on this many days
const CORR_MIN_TOGETHER = 3;  // and they must co-occur at least this often
const CORR_MIN_LIFT   = 1.35; // ...meaningfully more than chance

function computeSymptomCorrelations(){
  const dayMs = 86400000, now = Date.now();

  // one Set of symptom indices per day — a symptom logged five times in a
  // day still counts once, because we're asking "did it happen today"
  const days = [];
  for(const day of allDays()){
    const age = Math.floor((now - new Date(day.date+'T12:00:00').getTime()) / dayMs);
    if(age < 0 || age >= CORR_WINDOW) continue;
    const set = new Set((day.events||[]).map(e => e.sym));
    if(set.size) days.push(set);
  }
  if(days.length < CORR_MIN_DAYS) return {enough:false, days:days.length};

  const N = days.length;
  const single = new Map();
  for(const s of days) for(const sym of s) single.set(sym, (single.get(sym)||0)+1);

  const together = new Map();
  for(const s of days){
    const arr = [...s].sort((a,b)=>a-b);
    for(let i=0;i<arr.length;i++)
      for(let j=i+1;j<arr.length;j++)
        { const k = arr[i]+','+arr[j]; together.set(k,(together.get(k)||0)+1); }
  }

  const rows = [];
  for(const [key, both] of together){
    if(both < CORR_MIN_TOGETHER) continue;
    const [a,b] = key.split(',').map(Number);
    const na = single.get(a)||0, nb = single.get(b)||0;
    if(na < CORR_MIN_EACH || nb < CORR_MIN_EACH) continue;
    const expected = (na/N) * (nb/N) * N;      // days they'd share by chance
    if(!expected) continue;
    const lift = both / expected;
    if(lift < CORR_MIN_LIFT) continue;
    rows.push({
      a, b,
      aLabel:(SYMS[a]||{}).label||'?', aIcon:(SYMS[a]||{}).icon||'•',
      bLabel:(SYMS[b]||{}).label||'?', bIcon:(SYMS[b]||{}).icon||'•',
      both, na, nb, N, lift,
      // of the days A happened, what share also had B — the plainest phrasing
      pct: Math.round((both / Math.min(na, nb)) * 100),
    });
  }
  rows.sort((x,y)=> (y.lift - x.lift) || (y.both - x.both));
  return {enough:true, days:N, rows};
}

function renderSymptomCorrelations(){
  const card = document.getElementById('corrCard');
  const body = document.getElementById('corrBody');
  if(!card || !body) return;

  const res = computeSymptomCorrelations();
  card.style.display = 'block';

  if(!res.enough){
    const need = CORR_MIN_DAYS - res.days;
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🔗</div>
        <div class="cap-empty-text">
          <strong>Log ${need} more day${need!==1?'s':''}</strong> to see which symptoms travel together.
          <div class="cap-empty-sub">${res.days} of ${CORR_MIN_DAYS} days with symptoms in the last ${CORR_WINDOW}.</div>
        </div>
      </div>`;
    return;
  }

  if(!res.rows.length){
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🔗</div>
        <div class="cap-empty-text">
          <strong>Nothing pairing up yet.</strong>
          <div class="cap-empty-sub">Across ${res.days} logged days, no two symptoms show up together
          more than chance would explain. That's a real result, not a missing one — keep logging and
          this fills in if a pattern emerges.</div>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = res.rows.slice(0,4).map(r => `
    <div class="corr-row">
      <div class="corr-pair">
        <span class="corr-sym">${r.aIcon} ${escHtml(r.aLabel)}</span>
        <span class="corr-amp">+</span>
        <span class="corr-sym">${r.bIcon} ${escHtml(r.bLabel)}</span>
      </div>
      <div class="corr-detail">
        Showed up together on <b>${r.both} of ${r.days || res.days} days</b> —
        <b>${r.lift.toFixed(1)}×</b> more often than chance.
        <span class="corr-n">${r.aLabel}: ${r.na} days · ${r.bLabel}: ${r.nb} days</span>
      </div>
    </div>`).join('') + `
    <p class="cyc-note">Pairs that co-occur more than each symptom's own frequency predicts, over the
    last ${res.days} logged days. Travelling together is not the same as one causing the other —
    it's a pattern worth mentioning to your doctor, not a conclusion.</p>`;
}
