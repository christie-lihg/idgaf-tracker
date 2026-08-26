/* eslint-disable no-undef, emergent/no-undef */
// TODAY VIEW
// ═══════════════════════════════════════════════════════════════
function renderToday(){
  const today=todayStr();
  const log=loadDay(today);

  document.getElementById('todayLabel').textContent=
    new Date(today+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  // restore note
  const noteEl=document.getElementById('dayNote');
  if(noteEl&&!noteEl.matches(':focus'))noteEl.value=log.note||'';

  buildMorningCard();
  buildSymGrid(log);
  buildTimeline(log,today);
  restoreWellnessSliders(log);
  if(typeof renderCustomRatings==='function') renderCustomRatings(log);
  if(typeof maybeShowBackupReminder==='function') maybeShowBackupReminder();
  if(typeof renderStreakPill==='function') renderStreakPill();
  if(typeof renderReminderUI==='function') renderReminderUI();
  if(typeof maybeFireReminder==='function') maybeFireReminder();
}

function buildSymGrid(log){
  const grid=document.getElementById('symGrid');
  if(!grid)return;
  // count per sym
  const counts={},lastT={};
  log.events.forEach(e=>{
    counts[e.sym]=(counts[e.sym]||0)+1;
    lastT[e.sym]=e.time;
  });
  grid.innerHTML='';
  SYMS.forEach((s,i)=>{
    const c=counts[i]||0;
    // A <button>, not a div. This is the one control the whole app exists
    // for; as a div with a JS onclick it was unreachable by keyboard, switch
    // device or VoiceOver, which meant the entire product was.
    const tile=document.createElement('button');
    tile.type='button';
    tile.className='sym-tile'+(c>0?' logged':'');
    tile.id='tile_'+i;
    tile.onclick=()=>tapSym(i);
    // The count is rendered as a badge, which a screen reader would read as a
    // bare number next to a label. Say it in words instead.
    tile.setAttribute('aria-label', c>0
      ? `${s.label}. Logged ${c} time${c!==1?'s':''} today, last at ${lastT[i]}. Tap to log another.`
      : `${s.label}. Not logged today. Tap to log.`);
    tile.innerHTML=`
      <div class="tile-badge${c>0?' on':''}" id="badge_${i}" aria-hidden="true">${c}</div>
      <div class="tile-icon" aria-hidden="true">${s.icon}</div>
      <div class="tile-label">${s.label}</div>
      ${c>0?`<div class="tile-last">Last: ${lastT[i]}</div>`:''}`;
    grid.appendChild(tile);
  });
}

function tapSym(i){
  const today=todayStr();
  const log=loadDay(today);
  const now=new Date();
  log.events.push({
    sym:i,
    ts:now.getTime(),
    time:now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}),
    intensity:null
  });
  saveDay(today,log);

  // pulse tile
  const tile=document.getElementById('tile_'+i);
  if(tile){tile.classList.add('pulse');setTimeout(()=>tile.classList.remove('pulse'),350)}

  buildSymGrid(log);
  buildTimeline(log,today);
  showToast(SYMS[i].icon+' '+SYMS[i].label+' — '+hype());
}

function buildTimeline(log,today){
  const tl=document.getElementById('timeline');
  const cnt=document.getElementById('tlCount');
  if(!tl)return;

  if(log.events.length===0){
    cnt.textContent='No events yet';
    tl.innerHTML=`<div class="empty" style="padding:20px 0"><div class="ei" style="font-size:28px" aria-hidden="true">📼</div><p>Tap a symptom above to start logging.</p></div>`;
    return;
  }

  cnt.textContent=`${log.events.length} event${log.events.length!==1?'s':''} logged`;

  // sort descending
  const sorted=log.events.map((e,i)=>({...e,origIdx:i})).sort((a,b)=>b.ts-a.ts);

  // group by time-of-day — overnight events go into their own bucket
  const ORDER=['Night','Evening','Afternoon','Morning','Early morning','Overnight'];
  const groups={};
  sorted.forEach(e=>{
    let g;
    if(e.overnight){
      g='Overnight';
    } else {
      const h=new Date(e.ts).getHours();
      g=h<6?'Early morning':h<12?'Morning':h<17?'Afternoon':h<21?'Evening':'Night';
    }
    if(!groups[g])groups[g]=[];
    groups[g].push(e);
  });

  let html='';
  ORDER.forEach(g=>{
    if(!groups[g])return;
    const groupIcon=g==='Overnight'?'🌙 ':'';
    html+=`<div class="tl-group">${groupIcon}${g}</div>`;
    groups[g].forEach(e=>{
      const s=SYMS[e.sym];
      const intLabel=['','Mild','Moderate','Severe'];
      const timeDisplay=e.overnight?`<span style="font-size:10px;background:var(--mint);color:var(--forest-fg);border-radius:4px;padding:1px 5px;font-weight:600">overnight</span>`:e.time;
      const nameDisplay=e.overnight&&e.overnightLabel?`🌙 ${e.overnightLabel}`:`${s.icon} ${s.label}`;
      html+=`<div class="tl-row">
        <div class="tl-time">${timeDisplay}</div>
        <div class="tl-dot" style="${e.overnight?'background:var(--amber)':''}"></div>
        <div class="tl-body">
          <div class="tl-name">${nameDisplay}</div>
          ${!e.overnight?`<div class="tl-int">
            <span class="tl-int-lbl">Intensity:</span>
            ${[1,2,3].map(v=>`<div class="int-b${e.intensity===v?' on':''}" onclick="setInt(${e.origIdx},${v},'${today}')">${v}</div>`).join('')}
            <span class="tl-int-lbl">${e.intensity?'= '+intLabel[e.intensity]:'not set'}</span>
          </div>`:''}
        </div>
        <button class="tl-del" onclick="delEvent(${e.origIdx},'${today}')">✕</button>
      </div>`;
    });
  });

  tl.innerHTML=html;
}

function setInt(idx,val,date){
  const log=loadDay(date);
  log.events[idx].intensity=val;
  saveDay(date,log);
  buildTimeline(log,date);
  // update badge counts unchanged, no need to rebuild grid
}

function delEvent(idx,date){
  const log=loadDay(date);
  log.events.splice(idx,1);
  saveDay(date,log);
  renderToday();
}

function clearToday(){
  if(!confirm('Clear all of today\'s logged events?'))return;
  const today=todayStr();
  const log=loadDay(today);
  log.events=[];
  saveDay(today,log);
  renderToday();
  showToast('🧹 Wiped clean. Fresh start.');
}

function saveDayNote(val){
  const today=todayStr();
  const log=loadDay(today);
  log.note=val;
  saveDay(today,log);
}

function restoreWellnessSliders(log){
  for(let i=0;i<WELLNESS_ITEMS.length;i++){
    const sl=document.getElementById('w'+i);
    const vl=document.getElementById('wv'+i);
    if(!sl)continue;
    const val=log.wellness[i]!==undefined?log.wellness[i]:5;
    sl.value=val;
    if(vl)vl.textContent=val;
  }
}

function saveWellness(){
  const today=todayStr();
  const log=loadDay(today);
  for(let i=0;i<WELLNESS_ITEMS.length;i++){
    const sl=document.getElementById('w'+i);
    if(sl)log.wellness[i]=+sl.value;
  }
  if(typeof collectCustomRatingsInto==='function') collectCustomRatingsInto(log, 'cr_');
  saveDay(today,log);
  showToast(WELLNESS_SAVED());
}

// ═══════════════════════════════════════════════════════════════
