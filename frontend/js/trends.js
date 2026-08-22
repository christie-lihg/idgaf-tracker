/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// LONG-RANGE TRENDS
//
// Everything else on the dashboard answers "this week". Perimenopause
// does not move on a weekly timescale — it plays out over a year or more,
// and the question people actually carry into an appointment is "is this
// getting worse?", which a seven-day view structurally cannot answer.
//
// Two views here:
//   1. Six-month shape — symptom load and capacity, month by month.
//   2. Per-symptom direction — which individual symptoms are rising or
//      falling, comparing the last 30 days against the 30 before them.
// ═══════════════════════════════════════════════════════════════════════

function monthKey(dateStr){ return dateStr.slice(0,7); }          // YYYY-MM
function monthLabel(mk){
  const [y,m] = mk.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString('en-US',{month:'short'});
}

/* Last N calendar months including the current one, oldest first. */
function recentMonthKeys(n){
  const out = [];
  const d = new Date(); d.setDate(1);
  for(let i=n-1;i>=0;i--){
    const t = new Date(d); t.setMonth(t.getMonth()-i);
    out.push(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`);
  }
  return out;
}

let _sixMonthChart = null;

function renderSixMonthTrend(){
  const card = document.getElementById('sixMonthCard');
  const body = document.getElementById('sixMonthBody');
  const cv   = document.getElementById('chartSixMonth');
  if(!card || !body || !cv) return;

  const months = recentMonthKeys(6);
  const buckets = new Map(months.map(m => [m, {events:0, days:0, capSum:0, capN:0}]));

  for(const day of allDays()){
    const b = buckets.get(monthKey(day.date));
    if(!b) continue;
    b.events += (day.events||[]).length;
    b.days   += 1;
    const cap = (day.wellness||{})[5];
    if(cap !== undefined){ b.capSum += +cap; b.capN += 1; }
  }

  const monthsWithData = months.filter(m => buckets.get(m).days > 0);
  card.style.display = 'block';

  if(monthsWithData.length < 2){
    cv.style.display = 'none';
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">📈</div>
        <div class="cap-empty-text">
          <strong>Needs a second month of logs</strong>
          <div class="cap-empty-sub">Perimenopause moves over months, not weeks. Once there are two months to compare, this shows the shape of it.</div>
        </div>
      </div>`;
    return;
  }
  cv.style.display = '';
  body.innerHTML = '';

  // events per LOGGED day, so a sparsely-logged month isn't misread as a good one
  const perDay = months.map(m => {
    const b = buckets.get(m);
    return b.days ? +(b.events / b.days).toFixed(2) : null;
  });
  const capAvg = months.map(m => {
    const b = buckets.get(m);
    return b.capN ? +(b.capSum / b.capN).toFixed(2) : null;
  });

  if(_sixMonthChart) _sixMonthChart.destroy();
  _sixMonthChart = new Chart(cv, {
    type:'line',
    data:{
      labels: months.map(monthLabel),
      datasets:[
        { label:'Symptoms / logged day', data:perDay, borderColor:themeColor('rose'),
          backgroundColor:themeColor('rose',.15), tension:.3, spanGaps:true, yAxisID:'y' },
        { label:'Capacity', data:capAvg, borderColor:themeColor('chart3'),
          backgroundColor:themeColor('chart3',.15), tension:.3, spanGaps:true, yAxisID:'y1' },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ boxWidth:12, font:{size:11} } } },
      scales:{
        y:{ position:'left', beginAtZero:true, grid:{color:themeColor('mint')},
            title:{display:true,text:'symptoms/day',font:{size:10}}, ticks:{font:{size:10}} },
        y1:{ position:'right', min:0, max:10, grid:{display:false},
            title:{display:true,text:'capacity',font:{size:10}}, ticks:{font:{size:10}} },
        x:{ grid:{display:false}, ticks:{font:{size:11}} },
      }
    }
  });
}

/* ── Which symptoms are moving ───────────────────────────────────────
 * Last 30 days vs the 30 before. Reports only symptoms with enough
 * occurrences to be worth mentioning, and always shows both counts so
 * the reader can judge the change themselves.
 */
const TREND_MIN_TOTAL = 6;

function symptomDirections(){
  const dayMs = 86400000, now = Date.now();
  const recent = new Map(), prior = new Map();
  let recentDays = 0, priorDays = 0;

  for(const day of allDays()){
    const age = Math.floor((now - new Date(day.date+'T12:00:00').getTime()) / dayMs);
    let bucket = null;
    if(age >= 0 && age < 30){ bucket = recent; recentDays++; }
    else if(age >= 30 && age < 60){ bucket = prior; priorDays++; }
    if(!bucket) continue;
    for(const ev of (day.events||[])) bucket.set(ev.sym, (bucket.get(ev.sym)||0)+1);
  }

  const rows = [];
  for(const sym of new Set([...recent.keys(), ...prior.keys()])){
    const r = recent.get(sym)||0, p = prior.get(sym)||0;
    if(r + p < TREND_MIN_TOTAL) continue;
    rows.push({ sym, label:(SYMS[sym]||{}).label||'Unknown', icon:(SYMS[sym]||{}).icon||'•',
                recent:r, prior:p, diff:r-p });
  }
  rows.sort((a,b)=> Math.abs(b.diff) - Math.abs(a.diff));
  return { rows, recentDays, priorDays };
}

function renderSymptomDirections(){
  const card = document.getElementById('symDirCard');
  const body = document.getElementById('symDirBody');
  if(!card || !body) return;

  const { rows, recentDays, priorDays } = symptomDirections();
  card.style.display = 'block';

  if(priorDays < 7 || !rows.length){
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">↕️</div>
        <div class="cap-empty-text">
          <strong>Needs two months of logs to compare</strong>
          <div class="cap-empty-sub">${recentDays} day${recentDays!==1?'s':''} in the last 30, ${priorDays} in the 30 before. Once both stretches have entries, this shows which symptoms are rising and which are easing.</div>
        </div>
      </div>`;
    return;
  }

  body.innerHTML = rows.slice(0,8).map(r => {
    const up = r.diff > 0, flat = r.diff === 0;
    const cls = flat ? 'dir-flat' : up ? 'dir-up' : 'dir-down';
    const arrow = flat ? '→' : up ? '↑' : '↓';
    const word = flat ? 'no change' : `${Math.abs(r.diff)} ${up ? 'more' : 'fewer'}`;
    return `
      <div class="dir-row">
        <div class="dir-name">${r.icon} ${escHtml(r.label)}</div>
        <div class="dir-val ${cls}"><b>${arrow} ${word}</b>
          <span class="dir-n">${r.prior} → ${r.recent}</span></div>
      </div>`;
  }).join('') + `
    <p class="cyc-note">Last 30 days versus the 30 before (${priorDays} and ${recentDays} logged days).
    Counts depend on how much you logged in each stretch.</p>`;
}

/* ── Notes, searchable ───────────────────────────────────────────────
 * Notes were write-only: you could add one every day and never read one
 * back. They are often the richest thing in the record — the detail no
 * checkbox captures — so they need to be findable.
 */
function collectNotes(){
  const out = [];
  for(const day of allDays()){
    if(day.note && day.note.trim()) out.push({date:day.date, text:day.note.trim(), kind:'day'});
    const m = day.morning;
    if(m && m.note && String(m.note).trim())
      out.push({date:day.date, text:String(m.note).trim(), kind:'morning'});
  }
  return out.sort((a,b) => b.date.localeCompare(a.date));
}

function renderNotesSearch(){
  const body = document.getElementById('notesSearchBody');
  if(!body) return;
  const q = (document.getElementById('notesQuery')?.value || '').trim().toLowerCase();
  const all = collectNotes();
  const hits = q ? all.filter(n => n.text.toLowerCase().includes(q)) : all;

  if(!all.length){
    body.innerHTML = `<p class="tx-empty">No notes yet. Anything you write on the Today tab shows up here, searchable.</p>`;
    return;
  }
  if(!hits.length){
    body.innerHTML = `<p class="tx-empty">Nothing matching “${escHtml(q)}” in ${all.length} note${all.length!==1?'s':''}.</p>`;
    return;
  }

  const mark = (text) => {
    const safe = escHtml(text);
    if(!q) return safe;
    const i = safe.toLowerCase().indexOf(escHtml(q).toLowerCase());
    if(i < 0) return safe;
    return safe.slice(0,i) + '<mark>' + safe.slice(i, i+q.length) + '</mark>' + safe.slice(i+q.length);
  };

  body.innerHTML =
    `<p class="notes-count">${hits.length} of ${all.length} note${all.length!==1?'s':''}</p>` +
    hits.slice(0,60).map(n => `
      <div class="note-row">
        <div class="note-date">${fmtFull(n.date)}${n.kind==='morning'?' · morning':''}</div>
        <div class="note-text">${mark(n.text)}</div>
      </div>`).join('');
}
