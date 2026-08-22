/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// TREATMENTS — what you changed, and whether it did anything
//
// The question this app exists to answer is not "what happened" but
// "is what I'm doing working". Symptom history alone cannot answer that,
// because it has no record of what was different at the time.
//
// So: a dated log of changes — started HRT, doubled the dose, quit
// caffeine, began magnesium — and a before/after comparison across each
// one. It is the first thing a clinician asks ("any change since we
// started the estradiol?") and, until now, the app could not answer it.
//
// Storage shape (STORE_PREFIX so JSON export/import picks it up for free):
//   idgaf_treatments → [{id, label, date, kind, note}]
//
// Nothing here goes over the network. Same local-only guarantee as
// everything else — see docs/ARCHITECTURE.md.
// ═══════════════════════════════════════════════════════════════════════

const TREATMENTS_KEY = STORE_PREFIX + 'treatments';

const TREATMENT_KINDS = [
  { id: 'hrt',       label: 'HRT / hormone',  icon: '💊' },
  { id: 'med',       label: 'Medication',     icon: '🩹' },
  { id: 'supp',      label: 'Supplement',     icon: '🌿' },
  { id: 'lifestyle', label: 'Lifestyle',      icon: '🏃' },
];

function loadTreatments(){
  try{
    const arr = JSON.parse(localStorage.getItem(TREATMENTS_KEY) || '[]');
    return Array.isArray(arr) ? arr.sort((a,b)=> a.date.localeCompare(b.date)) : [];
  }catch{ return []; }
}

function saveTreatments(list){
  localStorage.setItem(TREATMENTS_KEY, JSON.stringify(list));
}

function addTreatment(){
  const labelEl = document.getElementById('txLabel');
  const dateEl  = document.getElementById('txDate');
  const kindEl  = document.getElementById('txKind');
  const noteEl  = document.getElementById('txNote');
  if(!labelEl || !dateEl) return;

  const label = labelEl.value.trim();
  const date  = dateEl.value;
  if(!label){ showToast('Give it a name first'); labelEl.focus(); return; }
  if(!date){  showToast('Pick a date first. Duh.'); dateEl.focus(); return; }

  const list = loadTreatments();
  list.push({
    id: 'tx_' + Date.now() + '_' + Math.floor(Math.random()*1e4),
    label, date,
    kind: kindEl ? kindEl.value : 'other',
    note: noteEl ? noteEl.value.trim() : '',
  });
  saveTreatments(list);

  labelEl.value = ''; if(noteEl) noteEl.value = '';
  renderTreatmentList();
  if(typeof renderTreatmentImpact === 'function') renderTreatmentImpact();
  showToast('📌 On the record.');
}

function removeTreatment(id){
  saveTreatments(loadTreatments().filter(t => t.id !== id));
  renderTreatmentList();
  if(typeof renderTreatmentImpact === 'function') renderTreatmentImpact();
  showToast('🗑 Gone. Buh-bye.');
}

function renderTreatmentList(){
  const el = document.getElementById('txList');
  if(!el) return;
  const list = loadTreatments();
  if(!list.length){
    el.innerHTML = `<p class="tx-empty">Nothing logged yet. Add the day you started or changed something — that's what makes the dashboard able to tell you if it helped.</p>`;
    return;
  }
  el.innerHTML = list.slice().reverse().map(t => {
    const k = TREATMENT_KINDS.find(x => x.id === t.kind) || {icon:'📌', label:''};
    return `
      <div class="tx-row">
        <div class="tx-icon">${k.icon}</div>
        <div class="tx-main">
          <div class="tx-label">${escHtml(t.label)}</div>
          <div class="tx-meta">${fmtFull(t.date)}${t.note ? ' · ' + escHtml(t.note) : ''}</div>
        </div>
        <button class="tx-del" onclick="removeTreatment('${t.id}')" aria-label="Remove">✕</button>
      </div>`;
  }).join('');
}

function initTreatmentForm(){
  const kindEl = document.getElementById('txKind');
  if(kindEl && !kindEl.options.length){
    kindEl.innerHTML = TREATMENT_KINDS
      .map(k => `<option value="${k.id}">${k.icon} ${k.label}</option>`).join('');
  }
  const dateEl = document.getElementById('txDate');
  if(dateEl && !dateEl.value) dateEl.value = todayStr();
  renderTreatmentList();
}

/* ── Did it help? ────────────────────────────────────────────────────
 * For each logged change, compare the WINDOW days before it against the
 * WINDOW days after, on two measures: average symptom events per day,
 * and average capacity.
 *
 * Honesty constraints, deliberately strict:
 *   - Needs MIN_DAYS of actual logged data on BOTH sides. A change made
 *     yesterday tells you nothing, and saying so is better than showing
 *     a number built on two days.
 *   - Always states how many days each side is based on.
 *   - Says "since", never "because". This is a before/after description
 *     of self-logged data with no control — it cannot establish cause,
 *     and a health app implying it can is actively harmful.
 */
const TX_WINDOW = 30;
const TX_MIN_DAYS = 7;

function treatmentImpact(t){
  const start = new Date(t.date + 'T12:00:00').getTime();
  const dayMs = 86400000;
  const before = [], after = [];

  for(const day of allDays()){
    const ts = new Date(day.date + 'T12:00:00').getTime();
    const delta = Math.round((ts - start) / dayMs);
    const cap = (day.wellness || {})[5];
    const row = { events: (day.events || []).length, cap: cap === undefined ? null : +cap };
    if(delta < 0 && delta >= -TX_WINDOW) before.push(row);
    else if(delta >= 0 && delta <= TX_WINDOW) after.push(row);
  }

  if(before.length < TX_MIN_DAYS || after.length < TX_MIN_DAYS){
    return { enough:false, before:before.length, after:after.length };
  }

  const mean = (arr, k) => {
    const v = arr.map(r => r[k]).filter(x => x !== null && x !== undefined);
    return v.length ? v.reduce((a,b)=>a+b,0) / v.length : null;
  };
  return {
    enough: true,
    beforeDays: before.length,
    afterDays: after.length,
    eventsBefore: mean(before,'events'),
    eventsAfter:  mean(after,'events'),
    capBefore: mean(before,'cap'),
    capAfter:  mean(after,'cap'),
  };
}

function renderTreatmentImpact(){
  const card = document.getElementById('txImpactCard');
  const body = document.getElementById('txImpactBody');
  if(!card || !body) return;

  const list = loadTreatments();
  if(!list.length){ card.style.display = 'none'; return; }
  card.style.display = 'block';

  const blocks = list.slice().reverse().map(t => {
    const r = treatmentImpact(t);
    if(!r.enough){
      const need = Math.max(TX_MIN_DAYS - r.before, TX_MIN_DAYS - r.after);
      return `
        <div class="tx-imp">
          <div class="tx-imp-h">${escHtml(t.label)}</div>
          <div class="tx-imp-thin">Not enough logged days either side yet —
            ${r.before} before, ${r.after} after. Needs ${TX_MIN_DAYS} of each
            (about ${need} more day${need!==1?'s':''} of logging).</div>
        </div>`;
    }
    const dEvents = r.eventsAfter - r.eventsBefore;
    const evWord = dEvents < 0 ? 'fewer' : dEvents > 0 ? 'more' : 'the same';
    const evLine = dEvents === 0
      ? `Symptom load is unchanged (${r.eventsBefore.toFixed(1)} a day either side).`
      : `<b>${Math.abs(dEvents).toFixed(1)} ${evWord}</b> symptom events a day
         (${r.eventsBefore.toFixed(1)} → ${r.eventsAfter.toFixed(1)}).`;

    let capLine = '';
    if(r.capBefore !== null && r.capAfter !== null){
      const dCap = r.capAfter - r.capBefore;
      capLine = dCap === 0
        ? `Capacity unchanged at ${r.capBefore.toFixed(1)}/10.`
        : `Capacity <b>${dCap > 0 ? 'up' : 'down'} ${Math.abs(dCap).toFixed(1)}</b>
           (${r.capBefore.toFixed(1)} → ${r.capAfter.toFixed(1)} out of 10).`;
    }

    return `
      <div class="tx-imp">
        <div class="tx-imp-h">${escHtml(t.label)} <span class="tx-imp-date">${fmtFull(t.date)}</span></div>
        <div class="tx-imp-body">
          <div>Since then: ${evLine}</div>
          ${capLine ? `<div>${capLine}</div>` : ''}
          <div class="tx-imp-n">${r.beforeDays} days logged before · ${r.afterDays} after</div>
        </div>
      </div>`;
  }).join('');

  body.innerHTML = blocks + `
    <p class="tx-note">These are before-and-after comparisons of your own logs.
    Plenty of other things change over a month, so this shows what shifted —
    not what caused it. Bring it to your doctor; don't treat it as an answer.</p>`;
}
