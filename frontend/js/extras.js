/* eslint-disable no-undef, emergent/no-undef */
// EXTRAS — Streak, Reminder, Search, Sparklines, Provider Sections
// ═══════════════════════════════════════════════════════════════════════
// A grab-bag of user-facing features that don't warrant their own file.
// Everything is local-only. Nothing here touches the network.
// ═══════════════════════════════════════════════════════════════════════

/* ───── STREAK NUDGE ─────────────────────────────────────────────────
   Counts consecutive days ending TODAY that have at least one events entry
   OR wellness rating OR morning check-in. Shown as a pill in the Today
   header when ≥3. */
function computeCurrentStreak(){
  let n=0;
  const d=new Date();
  // Start from today; walk backwards as long as the day has ANY log signal.
  while(true){
    const pad=x=>String(x).padStart(2,'0');
    const key=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const log=loadDay(key);
    const morning=(typeof loadMorning==='function') ? loadMorning(key) : null;
    const hasSignal =
      (log.events && log.events.length>0) ||
      (log.wellness && Object.keys(log.wellness).length>0) ||
      (log.customWellness && Object.keys(log.customWellness).length>0) ||
      !!morning;
    if(!hasSignal) break;
    n++;
    d.setDate(d.getDate()-1);
  }
  return n;
}

function renderStreakPill(){
  const el=document.getElementById('streakPill');
  if(!el) return;
  const n=computeCurrentStreak();
  if(n<3){ el.style.display='none'; return; }
  el.textContent=`🔥 ${n} day streak — you got this`;
  el.style.display='inline-flex';
}

/* ───── REMINDER TO LOG ──────────────────────────────────────────────
   Uses the browser Notifications API when the user opts in. Reminder is a
   simple daily local check: on any renderToday(), if the local time is past
   the chosen HH:mm AND today's log has no events/wellness yet AND we
   haven't already fired today, we fire the notification.

   State keys:
     idgaf_reminder_enabled   ('1' | undefined)
     idgaf_reminder_time_hhmm ('20:00' etc, default '20:00')
     idgaf_reminder_last_fired ('YYYY-MM-DD') */
const REMINDER_KEY_ENABLED = STORE_PREFIX + 'reminder_enabled';
const REMINDER_KEY_TIME    = STORE_PREFIX + 'reminder_time_hhmm';
const REMINDER_KEY_FIRED   = STORE_PREFIX + 'reminder_last_fired';

function reminderStatus(){
  return {
    enabled: localStorage.getItem(REMINDER_KEY_ENABLED)==='1',
    time:    localStorage.getItem(REMINDER_KEY_TIME) || '20:00',
    perm:    (typeof Notification!=='undefined') ? Notification.permission : 'unsupported',
  };
}

function renderReminderUI(){
  const st=reminderStatus();
  const tog=document.getElementById('reminderToggle');
  const time=document.getElementById('reminderTime');
  const stat=document.getElementById('reminderPermMsg');
  if(!tog||!time||!stat) return;
  tog.checked=st.enabled;
  time.value=st.time;
  time.disabled=!st.enabled;
  if(st.perm==='unsupported'){
    stat.textContent='This browser does not support notifications.';
  } else if(!st.enabled){
    stat.textContent='Off. Tap the toggle to switch on a daily nudge.';
  } else if(st.perm==='granted'){
    stat.textContent=`On. We'll ping you at ${st.time} if the log is still empty.`;
  } else if(st.perm==='denied'){
    stat.textContent="Notifications are blocked in your browser settings. Turn them on there, then flip this back on.";
  } else {
    stat.textContent='We\'ll ask for notification permission when you visit next.';
  }
}

async function toggleReminder(evt){
  const on=evt.target.checked;
  if(on && typeof Notification!=='undefined' && Notification.permission==='default'){
    try{ await Notification.requestPermission(); }catch{ /* Safari resolves via callback */ }
  }
  localStorage.setItem(REMINDER_KEY_ENABLED, on ? '1' : '0');
  if(on) localStorage.removeItem(REMINDER_KEY_FIRED);
  renderReminderUI();
}

function saveReminderTime(evt){
  const v=(evt.target.value||'').trim();
  if(/^\d\d:\d\d$/.test(v)) localStorage.setItem(REMINDER_KEY_TIME, v);
  renderReminderUI();
}

/* Fire when: reminder on + past reminder time locally + today log is still
   empty of user activity + we haven't already fired today.
   Called from renderToday(). Silent on any failure. */
function maybeFireReminder(){
  try{
    const st=reminderStatus();
    if(!st.enabled) return;
    if(typeof Notification==='undefined' || Notification.permission!=='granted') return;

    const pad=n=>String(n).padStart(2,'0');
    const now=new Date();
    const todayKey=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    if(localStorage.getItem(REMINDER_KEY_FIRED)===todayKey) return;

    const [hh,mm]=st.time.split(':').map(x=>+x);
    if(now.getHours()<hh || (now.getHours()===hh && now.getMinutes()<mm)) return;

    const log=loadDay(todayKey);
    const anythingToday=
      (log.events && log.events.length>0) ||
      (log.wellness && Object.keys(log.wellness).length>0);
    if(anythingToday) return; // already logged today, no need to nag

    new Notification("IDGAF Tracker", {
      body: "Yo, how you doin'? Log today's symptoms before bed.",
      tag: 'idgaf-daily-reminder',
      silent: false,
    });
    localStorage.setItem(REMINDER_KEY_FIRED, todayKey);
  }catch{ /* notifications can throw on some browsers; ignore */ }
}

/* ───── SEARCH HISTORY ───────────────────────────────────────────────
   Filters the #historyList by note text and by symptom name. Called on
   input from the search box. */
function filterHistory(){
  const q=(document.getElementById('historySearch')?.value||'').toLowerCase().trim();
  const rows=document.querySelectorAll('#historyList .hi');
  if(!q){ rows.forEach(r=>r.style.display=''); return; }
  rows.forEach(r=>{
    const hay=(r.getAttribute('data-search')||r.textContent||'').toLowerCase();
    r.style.display = hay.includes(q) ? '' : 'none';
  });
}

/* ───── CUSTOM RATING SPARKLINES ─────────────────────────────────────
   Renders one small Chart line per custom rating showing last 14 days of
   values. Called from renderDashboard() after the wellness chart is drawn. */
const _customSparks = {};
function renderCustomRatingSparklines(){
  const container=document.getElementById('customSparklinesContainer');
  if(!container) return;
  const ratings=(typeof loadCustomRatings==='function') ? loadCustomRatings() : [];
  if(ratings.length===0){ container.innerHTML=''; return; }

  const pad=n=>String(n).padStart(2,'0');
  const days=[];
  for(let i=13;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }
  const dayLabels=days.map(d=>{
    const dd=new Date(d+'T12:00:00');
    return dd.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  });

  container.innerHTML=ratings.map((r,i)=>`
    <div class="spark-card">
      <div class="spark-head">
        <span class="spark-icon">${r.icon||'⭐'}</span>
        <span class="spark-label">${escapeHtml(r.label)}</span>
        <span class="spark-latest" id="sparkLatest_${r.id}">—</span>
      </div>
      <div class="spark-canvas-wrap"><canvas id="sparkCanvas_${i}" data-testid="custom-spark-${r.id}"></canvas></div>
    </div>
  `).join('');

  // Draw each sparkline
  ratings.forEach((r,i)=>{
    const values=days.map(d=>{
      const cw=(loadDay(d).customWellness)||{};
      return cw[r.id]!==undefined ? cw[r.id] : null;
    });
    const last=[...values].reverse().find(v=>v!==null);
    const latestEl=document.getElementById('sparkLatest_'+r.id);
    if(latestEl) latestEl.textContent = last!==undefined && last!==null ? `${last}/10` : 'not yet';

    const canvas=document.getElementById('sparkCanvas_'+i);
    if(!canvas || typeof Chart==='undefined') return;
    // destroy previous instance if any (Chart re-render on dashboard revisit)
    const existing=Chart.getChart(canvas); if(existing) existing.destroy();
    _customSparks[r.id]=new Chart(canvas,{
      type:'line',
      data:{
        labels:dayLabels,
        datasets:[{
          data:values,
          borderColor:themeColor('chart5'),
          backgroundColor:themeColor('chart5', .15),
          borderWidth:2, tension:.35, pointRadius:2.5, spanGaps:true, fill:true,
        }]
      },
      options:{
        plugins:{legend:{display:false},tooltip:{enabled:true}},
        scales:{
          y:{min:0,max:10,ticks:{display:false},grid:{color:themeColor('mint')}},
          x:{ticks:{font:{size:9}, maxRotation:0, autoSkip:true, maxTicksLimit:7},grid:{display:false}}
        },
        animation:{duration:400}, responsive:true, maintainAspectRatio:false
      }
    });
  });
}

/* ───── PROVIDER SECTION TEMPLATES ───────────────────────────────────
   Optional filter on what the share/print summary includes. Users pick
   which sections show up; default = everything. Selection stored in
   localStorage so it persists between sessions.

   Section IDs match the buildWeeklySummary() output blocks. When a section
   is disabled, its lines are stripped from #weeklySummaryText JUST for the
   next share/print/copy — we regenerate the summary text in place. */
const PROVIDER_KEY = STORE_PREFIX + 'provider_sections';
const PROVIDER_SECTIONS = [
  {id:'symptoms', label:'Top symptoms', matcher:/^Most frequent symptoms:/},
  {id:'wellness', label:'Wellness averages', matcher:/^Average wellness ratings/},
  {id:'custom',   label:'Custom ratings',    matcher:/^Your custom ratings/},
  {id:'notes',    label:'Daily notes',       matcher:/^Notes:/},
  {id:'overnight',label:'Overnight reports', matcher:/^Overnight reports/},
];

function loadProviderSections(){
  try{
    const raw=localStorage.getItem(PROVIDER_KEY);
    if(!raw) return null;
    const arr=JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  }catch{ return null; }
}
function saveProviderSections(list){
  localStorage.setItem(PROVIDER_KEY, JSON.stringify(list));
}
/* Enabled = every section unless user explicitly disabled one. */
function isSectionEnabled(id){
  const list=loadProviderSections();
  if(!list) return true;
  return list.includes(id);
}

/* Render section checkboxes into the share modal's #providerSectionsUI. */
function renderProviderSectionsUI(){
  const container=document.getElementById('providerSectionsUI');
  if(!container) return;
  container.innerHTML=PROVIDER_SECTIONS.map(s=>{
    const on=isSectionEnabled(s.id);
    return `<label class="provider-section">
      <input type="checkbox" data-testid="provider-section-${s.id}" ${on?'checked':''}
        onchange="toggleProviderSection('${s.id}', this.checked)">
      <span>${escapeHtml(s.label)}</span>
    </label>`;
  }).join('');
}

function toggleProviderSection(id, on){
  const list=loadProviderSections() || PROVIDER_SECTIONS.map(s=>s.id);
  const next=on ? [...new Set([...list, id])] : list.filter(x=>x!==id);
  saveProviderSections(next);
  // Rebuild the summary payload so subsequent share/copy/print picks the
  // filter up immediately.
  if(typeof rebuildFilteredSummary==='function') rebuildFilteredSummary();
  // If the share modal is open, re-encrypt with the new payload so the QR
  // matches what the user sees checked. Small debounce absorbs rapid toggles.
  const shareOpen=document.getElementById('shareQrModal')?.classList.contains('open');
  if(shareOpen && typeof openShareQrModal==='function'){
    clearTimeout(toggleProviderSection._t);
    toggleProviderSection._t=setTimeout(()=>openShareQrModal(), 250);
  }
}

/* Strips disabled sections from the raw weekly summary text. Blocks are
   separated by blank lines, headers are matched via PROVIDER_SECTIONS.matcher.
   The intro (Week of …, Days tracked, Total events) always survives. */
function filterSummaryText(rawText){
  const list=loadProviderSections();
  if(!list) return rawText;
  const disabled=PROVIDER_SECTIONS.filter(s=>!list.includes(s.id));
  if(disabled.length===0) return rawText;

  // Split into blocks by blank line.
  const blocks=rawText.split(/\n\s*\n/);
  const kept=blocks.filter(b=>!disabled.some(s=>s.matcher.test(b)));
  return kept.join('\n\n');
}

/* Rebuilds #weeklySummaryText from the current data using the section
   filter. Ties together the dashboard summary with the share modal
   filter so all downstream flows (copy/print/share QR) see the same text. */
function rebuildFilteredSummary(){
  const el=document.getElementById('weeklySummaryText');
  if(!el) return;
  const raw=el.dataset.raw || el.textContent;
  if(!el.dataset.raw) el.dataset.raw=raw; // keep the unfiltered original
  el.textContent=filterSummaryText(raw);
}

/* Called from buildWeeklySummary() after it writes the raw text. Stores
   the raw copy and applies the current filter. */
function cacheRawSummaryAndFilter(rawText){
  const el=document.getElementById('weeklySummaryText');
  if(!el) return;
  el.dataset.raw=rawText;
  el.textContent=filterSummaryText(rawText);
}

function escapeHtml(s){
  const d=document.createElement('div'); d.textContent=String(s);
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
