/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// TRIGGERS — what you did, against what you felt
//
// Treatments answer "is this working". Triggers answer the other half:
// "what sets this off". Both are the same shape of question — compare
// days where a thing was true against days where it wasn't — but triggers
// are per-day and recurring, where treatments are one dated change.
//
// Stored as an extension of the existing day log:
//   day.triggers = ['alcohol', 'heat', ...]
//
// A day logged before this feature existed simply has no `triggers` key,
// which reads as "none recorded" rather than "none happened" — the
// analysis below only counts days where the user actually engaged with
// the checklist, so old days don't silently dilute the comparison.
// ═══════════════════════════════════════════════════════════════════════

const TRIGGERS = [
  { id:'alcohol',  icon:'🍷', label:'Alcohol' },
  { id:'caffeine', icon:'☕', label:'Caffeine' },
  { id:'heat',     icon:'🥵', label:'Hot room / weather' },
  { id:'stress',   icon:'😰', label:'Stress' },
  { id:'poorsleep',icon:'😴', label:'Bad night' },
  { id:'spicy',    icon:'🌶', label:'Spicy food' },
  { id:'exercise', icon:'🏃', label:'Hard exercise' },
  { id:'sugar',    icon:'🍬', label:'Sugar' },
];

/* A day counts as "assessed" once the user has touched the checklist at
   all — recorded by an explicit marker, so an empty array means "checked,
   nothing today" and a missing key means "never asked". */
function dayTriggers(d){
  const log = loadDay(d);
  return Array.isArray(log.triggers) ? log.triggers : null;   // null = not assessed
}

function toggleTrigger(id){
  const today = todayStr();
  const log = loadDay(today);
  const cur = Array.isArray(log.triggers) ? log.triggers : [];
  log.triggers = cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id);
  saveDay(today, log);
  renderTriggerGrid();
}

function renderTriggerGrid(){
  const el = document.getElementById('triggerGrid');
  if(!el) return;
  const active = dayTriggers(todayStr()) || [];
  el.innerHTML = TRIGGERS.map(t => `
    <button class="trg-tile${active.includes(t.id) ? ' on' : ''}"
            onclick="toggleTrigger('${t.id}')" data-testid="trigger-${t.id}">
      <span class="trg-ico">${t.icon}</span><span class="trg-lbl">${t.label}</span>
    </button>`).join('');
}

/* ── Which triggers actually track with worse days ───────────────────
 * For each trigger, compare mean symptom events on days it was logged
 * against days it explicitly wasn't. Only days where the checklist was
 * actually used count on either side.
 *
 * Gates, for the same reason as everywhere else in this app: a
 * difference computed from three days is noise wearing a number's
 * clothes.
 */
const TRG_MIN_EACH = 5;

function triggerImpacts(){
  const withT = new Map(), withoutT = new Map();
  TRIGGERS.forEach(t => { withT.set(t.id, []); withoutT.set(t.id, []); });
  let assessedDays = 0;

  for(const day of allDays()){
    const trg = Array.isArray(day.triggers) ? day.triggers : null;
    if(trg === null) continue;                 // never assessed — skip entirely
    assessedDays++;
    const load = (day.events || []).length;
    for(const t of TRIGGERS){
      (trg.includes(t.id) ? withT : withoutT).get(t.id).push(load);
    }
  }

  const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const rows = [];
  for(const t of TRIGGERS){
    const a = withT.get(t.id), b = withoutT.get(t.id);
    if(a.length < TRG_MIN_EACH || b.length < TRG_MIN_EACH) continue;
    const ma = mean(a), mb = mean(b);
    rows.push({ ...t, withMean:ma, withoutMean:mb, diff:ma-mb, nWith:a.length, nWithout:b.length });
  }
  rows.sort((x,y) => Math.abs(y.diff) - Math.abs(x.diff));
  return { assessedDays, rows };
}

function renderTriggerInsight(){
  const card = document.getElementById('triggerInsightCard');
  const body = document.getElementById('triggerInsightBody');
  if(!card || !body) return;

  const { assessedDays, rows } = triggerImpacts();
  card.style.display = 'block';

  if(!rows.length){
    const need = Math.max(0, (TRG_MIN_EACH * 2) - assessedDays);
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🔍</div>
        <div class="cap-empty-text">
          <strong>${assessedDays === 0 ? 'Start ticking triggers on the Today tab' : 'Not enough days yet'}</strong>
          <div class="cap-empty-sub">${
            assessedDays === 0
              ? 'Tick what applied to your day and this works out which ones track with worse days.'
              : `${assessedDays} day${assessedDays!==1?'s':''} recorded. Each trigger needs ${TRG_MIN_EACH} days with it and ${TRG_MIN_EACH} without before it can be compared${need ? ` — about ${need} more days` : ''}.`
          }</div>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = rows.slice(0,6).map(r => {
    const worse = r.diff > 0;
    const cls = worse ? 'trg-worse' : 'trg-better';
    const word = worse ? 'more' : 'fewer';
    return `
      <div class="trg-row">
        <div class="trg-row-name">${r.icon} ${escHtml(r.label)}</div>
        <div class="trg-row-val ${cls}">
          <b>${Math.abs(r.diff).toFixed(1)} ${word}</b> symptoms
          <span class="trg-n">${r.nWith} with · ${r.nWithout} without</span>
        </div>
      </div>`;
  }).join('') + `
    <p class="cyc-note">Comparing days you ticked each trigger against days you didn't.
    Describes your own logs — plenty else differs between those days, so treat it as
    a lead to test, not a verdict.</p>`;
}
