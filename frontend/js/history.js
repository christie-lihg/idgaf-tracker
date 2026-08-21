/* eslint-disable no-undef, emergent/no-undef */
// HISTORY
// ═══════════════════════════════════════════════════════════════
function renderHistory(){
  const container=document.getElementById('historyList');
  const days=allDays().reverse();

  if(days.length===0){
    container.innerHTML=`<div class="empty"><div class="ei">📂</div><h3>No logs yet</h3><p>Your daily logs will appear here.</p></div>`;
    return;
  }

  container.innerHTML='';
  const list=document.createElement('div');
  list.className='history-list';

  days.forEach(day=>{
    const topSym=SYMS.map((_,i)=>({i,c:day.events.filter(e=>e.sym===i).length}))
      .filter(x=>x.c>0).sort((a,b)=>b.c-a.c)[0];
    const m=day.morning;
    const item=document.createElement('div');
    item.className='hi';
    // haystack for the search box: notes + every symptom label logged
    const symLabels=[...new Set(day.events.map(e=>SYMS[e.sym]?.label).filter(Boolean))].join(' ');
    const hay=`${fmtFull(day.date)} ${day.note||''} ${symLabels}`;
    item.setAttribute('data-search', hay);
    item.innerHTML=`
      <div class="hi-date">📅 ${fmtFull(day.date)}</div>
      <div class="hi-scores">
        ${day.events.length>0?`<div class="hsc">${day.events.length} event${day.events.length!==1?'s':''}</div>`:''}
        ${topSym?`<div class="hsc">Top: ${SYMS[topSym.i].icon} ${SYMS[topSym.i].label} ×${topSym.c}</div>`:''}
        ${m&&m.sleepHours?`<div class="hsc">😴 ${m.sleepHours}h sleep</div>`:''}
        ${m&&m.sleepQuality!==undefined?`<div class="hsc">Sleep quality: ${m.sleepQuality}/10</div>`:''}
        ${m&&m.checked&&m.checked.length>0?`<div class="hsc">🌙 ${m.checked.length} overnight item${m.checked.length!==1?'s':''}</div>`:''}
        ${day.wellness[0]!==undefined?`<div class="hsc">Energy: ${day.wellness[0]}/10</div>`:''}
        ${day.note?`<div class="hsc">📝 Note</div>`:''}
      </div>
      <button class="hi-del" title="Delete day" onclick="deleteDay('${day.date}',event)">🗑</button>`;
    list.appendChild(item);
  });

  container.appendChild(list);
  if(typeof filterHistory==='function') filterHistory();
}

function deleteDay(date,e){
  e.stopPropagation();
  if(!confirm(`Delete the log for ${fmtFull(date)}?`))return;
  localStorage.removeItem(dayKey(date));
  localStorage.removeItem(STORE_PREFIX+'morning_'+date);
  renderHistory();
  showToast('🗑 Gone. Buh-bye.');
}

// ═══════════════════════════════════════════════════════════════
