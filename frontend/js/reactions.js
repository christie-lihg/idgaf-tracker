/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// DAY REACTIONS — one tap for "how was today, overall?"
//
// The lowest-friction thing in the app. Every other input asks you to
// classify something; this asks how it felt. Some people will log this
// and nothing else on a bad day, and that is a success, not a shortfall —
// a day with one tap is a day that still appears in the record, and a
// user who logged something is far likelier to come back than one who
// opened the app, saw six sliders, and closed it.
//
// Stored on the existing day object as `day.reaction` (an id string), so
// JSON export/import carries it with no extra work.
//
// Note the ordering runs rough → unstoppable, and the stored value is an
// ID rather than an index. Positional storage is what makes SYMS and
// WELLNESS_ITEMS append-only forever; there is no reason to inherit that
// constraint in a new field.
// ═══════════════════════════════════════════════════════════════════════

const REACTIONS = [
  { id:'rough',       icon:'🫠', label:'Rough',       score:1 },
  { id:'meh',         icon:'🫥', label:'Meh',         score:2 },
  { id:'fine',        icon:'🙂', label:'Fine',        score:3 },
  { id:'chill',       icon:'😌', label:'Chill',       score:4 },
  { id:'rad',         icon:'🤩', label:'Rad',         score:5 },
  { id:'unstoppable', icon:'🔥', label:'Unstoppable', score:6 },
];

function setReaction(id){
  const today = todayStr();
  const log = loadDay(today);
  // tapping the current one clears it — no way to get stuck on a mis-tap
  log.reaction = (log.reaction === id) ? null : id;
  saveDay(today, log);
  renderReactionRow();
  showToast(log.reaction
    ? (REACTIONS.find(r => r.id === id).icon + ' Noted.')
    : 'Cleared.');
}

function renderReactionRow(){
  const el = document.getElementById('reactionRow');
  if(!el) return;
  const cur = loadDay(todayStr()).reaction || null;
  el.innerHTML = REACTIONS.map(r => `
    <button class="rx-tile${cur === r.id ? ' on' : ''}"
            onclick="setReaction('${r.id}')"
            data-testid="reaction-${r.id}"
            aria-pressed="${cur === r.id}"
            title="${r.label}">
      <span class="rx-ico">${r.icon}</span>
      <span class="rx-lbl">${r.label}</span>
    </button>`).join('');
}

/* ── Dashboard: how the last 30 days felt ────────────────────────────
 * A simple distribution — how many days landed on each reaction. Shows
 * the shape of a month at a glance in a way no average can. */
function renderReactionChart(){
  const card = document.getElementById('reactionCard');
  const body = document.getElementById('reactionBody');
  if(!card || !body) return;

  const dayMs = 86400000, now = Date.now();
  const counts = new Map(REACTIONS.map(r => [r.id, 0]));
  let total = 0;
  for(const day of allDays()){
    const age = Math.floor((now - new Date(day.date+'T12:00:00').getTime()) / dayMs);
    if(age < 0 || age >= 30) continue;
    if(!day.reaction || !counts.has(day.reaction)) continue;
    counts.set(day.reaction, counts.get(day.reaction) + 1);
    total++;
  }

  card.style.display = 'block';
  if(!total){
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🫠</div>
        <div class="cap-empty-text">
          <strong>Tap how today went</strong>
          <div class="cap-empty-sub">One tap on the Today tab, above the symptom grid. A month of those shows the shape of things better than any average.</div>
        </div>
      </div>`;
    return;
  }

  const max = Math.max(...counts.values());
  body.innerHTML = REACTIONS.map(r => {
    const n = counts.get(r.id);
    const pct = max ? Math.round((n / max) * 100) : 0;
    return `
      <div class="rx-row">
        <div class="rx-row-lbl">${r.icon} ${r.label}</div>
        <div class="rx-bar-track"><div class="rx-bar rx-bar-${r.id}" style="width:${pct}%"></div></div>
        <div class="rx-row-n">${n}</div>
      </div>`;
  }).join('') + `<p class="cyc-note">${total} day${total!==1?'s':''} rated in the last 30.</p>`;
}
