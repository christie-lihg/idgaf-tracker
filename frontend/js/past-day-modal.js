/* eslint-disable no-undef, emergent/no-undef */
// PAST DAY MODAL
// ═══════════════════════════════════════════════════════════════
function openPastModal(date){
  const modal=document.getElementById('pastModal');

  // default to yesterday
  const d=date||new Date();
  if(!date){d.setDate(d.getDate()-1);}
  document.getElementById('pastDate').value=typeof date==='string'?date:d.toISOString().split('T')[0];

  // build overnight grid
  const og=document.getElementById('pastOvernightGrid');
  og.innerHTML='';
  OVERNIGHT_ITEMS.forEach((item,i)=>{
    const el=document.createElement('div');
    el.className='past-sym-tile';
    el.id='pon_'+i;
    el.onclick=()=>el.classList.toggle('on')&&el.querySelector('.pst-check')||togglePastOn(el);
    el.innerHTML=`<div class="pst-check"></div><div class="pst-icon">${item.icon}</div><div class="pst-label">${item.label}</div>`;
    og.appendChild(el);
  });

  // sleep hours
  const sh=document.getElementById('pastSleepHours');
  sh.innerHTML='';
  ['<4','4','5','6','7','8','9','10+'].forEach(h=>{
    const b=document.createElement('div');
    b.className='sh-btn';b.textContent=h;
    b.onclick=()=>{document.querySelectorAll('#pastSleepHours .sh-btn').forEach(x=>x.classList.remove('on'));b.classList.add('on')};
    sh.appendChild(b);
  });

  // daytime syms
  const sg=document.getElementById('pastSymGrid');
  sg.innerHTML='';
  SYMS.forEach((s,i)=>{
    const el=document.createElement('div');
    el.className='past-sym-tile';
    el.id='psym_'+i;
    el.onclick=()=>togglePastOn(el);
    el.innerHTML=`<div class="pst-check"></div><div class="pst-icon">${s.icon}</div><div class="pst-label">${s.label}</div>`;
    sg.appendChild(el);
  });

  // wellness sliders
  const ws=document.getElementById('pastWellnessSliders');
  // Retired items are skipped, not dropped: the index still has to match
  // the stored array position, so filter AFTER mapping, never before.
  ws.innerHTML=WELLNESS_ITEMS.map((item,i)=>item.retired?'':`
    <div class="sli-row" style="margin-bottom:8px">
      <div class="sli-lbl">${item.icon} ${item.label}</div>
      <input type="range" class="sli" id="pw${i}" min="0" max="10" value="5" oninput="document.getElementById('pwv${i}').textContent=this.value">
      <div class="sli-val" id="pwv${i}">5</div>
    </div>`).join('');

  // Custom ratings (user-defined). Rendered into #pastCustomRatings which sits
  // just below the default sliders in the modal body.
  if(typeof renderCustomRatingsInModal==='function') renderCustomRatingsInModal({customWellness:{}});

  document.getElementById('pastNote').value='';
  document.getElementById('pastSleepQual').value=5;
  document.getElementById('pastSQVal').textContent='5';

  // pre-fill if date already has data
  if(typeof date==='string'){
    const log=loadDay(date);
    const morning=loadMorning(date);
    if(morning){
      (morning.checked||[]).forEach(i=>{
        const el=document.getElementById('pon_'+i);
        if(el){el.classList.add('on');el.querySelector('.pst-check').textContent='✓';}
      });
      if(morning.sleepHours){
        document.querySelectorAll('#pastSleepHours .sh-btn').forEach(b=>{if(b.textContent===morning.sleepHours)b.classList.add('on');});
      }
      if(morning.sleepQuality!==undefined){
        document.getElementById('pastSleepQual').value=morning.sleepQuality;
        document.getElementById('pastSQVal').textContent=morning.sleepQuality;
      }
    }
    // mark syms that were logged that day (unique syms only)
    const logged=new Set(log.events.filter(e=>!e.overnight).map(e=>e.sym));
    logged.forEach(i=>{
      const el=document.getElementById('psym_'+i);
      if(el){el.classList.add('on');el.querySelector('.pst-check').textContent='✓';}
    });
    WELLNESS_ITEMS.forEach((_,i)=>{
      if(log.wellness[i]!==undefined){
        document.getElementById('pw'+i).value=log.wellness[i];
        document.getElementById('pwv'+i).textContent=log.wellness[i];
      }
    });
    if(typeof renderCustomRatingsInModal==='function') renderCustomRatingsInModal(log);
    document.getElementById('pastNote').value=log.note||'';
  }

  modal.classList.add('open');
}

function togglePastOn(el){
  const on=el.classList.toggle('on');
  el.querySelector('.pst-check').textContent=on?'✓':'';
}

function closePastModal(){
  document.getElementById('pastModal').classList.remove('open');
}

function savePastDay(){
  const date=document.getElementById('pastDate').value;
  if(!date){showToast('Pick a date first. Duh.');return;}

  // overnight
  const checked=[];
  OVERNIGHT_ITEMS.forEach((_,i)=>{
    if(document.getElementById('pon_'+i)?.classList.contains('on'))checked.push(i);
  });
  let sleepHours=null;
  document.querySelectorAll('#pastSleepHours .sh-btn').forEach(b=>{if(b.classList.contains('on'))sleepHours=b.textContent;});
  const sleepQuality=+(document.getElementById('pastSleepQual')?.value||5);
  saveMorningData(date,{checked,sleepHours,sleepQuality,note:'',savedAt:'(past)'});

  // daytime syms — create one event per checked sym at noon
  const noon=new Date(date+'T12:00:00').getTime();
  const events=[];
  SYMS.forEach((_,i)=>{
    if(document.getElementById('psym_'+i)?.classList.contains('on')){
      events.push({sym:i,ts:noon,time:'(past)',intensity:null});
    }
  });

  // wellness
  const wellness={};
  WELLNESS_ITEMS.forEach((_,i)=>{
    wellness[i]=+(document.getElementById('pw'+i)?.value||5);
  });

  const note=document.getElementById('pastNote')?.value||'';
  const dayLog={events,wellness,note};
  if(typeof collectCustomRatingsInto==='function') collectCustomRatingsInto(dayLog, 'pcr_');
  saveDay(date,dayLog);
  closePastModal();
  renderHistory();
  showToast('✅ Backfilled. Nice save.');
}

// ═══════════════════════════════════════════════════════════════
