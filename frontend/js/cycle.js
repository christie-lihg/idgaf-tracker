// PERIOD / CYCLE TRACKING
// ═══════════════════════════════════════════════════════════════
function periodKey(d){ return STORE_PREFIX+'period_'+d }

function loadPeriodDay(d){
  try{ return JSON.parse(localStorage.getItem(periodKey(d))||'null') }
  catch{ return null }
}

function savePeriodDayData(d,data){
  if(!data||data.flow==='none'){localStorage.removeItem(periodKey(d));}
  else{localStorage.setItem(periodKey(d),JSON.stringify(data));}
}

function allPeriodDates(){
  const dates=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith(STORE_PREFIX+'period_'))dates.push(k.replace(STORE_PREFIX+'period_',''));
  }
  return dates.sort();
}

// compute cycle stats from period dates
function getCycleStats(){
  const dates=allPeriodDates();
  if(dates.length===0)return{avgCycle:null,avgPeriod:null,lastStart:null};

  const dateSet=new Set(dates);

  // Only flow days (not spotting) count as a real period start
  const flowDates=dates.filter(d=>{
    const p=loadPeriodDay(d);
    return p&&p.flow&&p.flow!=='spotting';
  });

  // A period start = flow day where the previous day has no flow (spotting doesn't bridge)
  const flowSet=new Set(flowDates);
  const starts=flowDates.filter(d=>{
    const prev=new Date(d+'T12:00:00');prev.setDate(prev.getDate()-1);
    return !flowSet.has(prev.toISOString().split('T')[0]);
  });

  // avg cycle length
  let avgCycle=null;
  if(starts.length>=2){
    const gaps=[];
    for(let i=1;i<starts.length;i++){
      const a=new Date(starts[i-1]+'T12:00:00'),b=new Date(starts[i]+'T12:00:00');
      gaps.push(Math.round((b-a)/(1000*60*60*24)));
    }
    avgCycle=Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
  }

  // avg period length — consecutive flow days from each start
  let avgPeriod=null;
  if(starts.length>=1){
    const lengths=starts.map(start=>{
      let len=0,cur=new Date(start+'T12:00:00');
      while(flowSet.has(cur.toISOString().split('T')[0])){len++;cur.setDate(cur.getDate()+1);}
      return len;
    });
    avgPeriod=Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length);
  }

  return{avgCycle,avgPeriod,lastStart:starts[starts.length-1]||null};
}

let cycleViewDate=new Date();

function cycleMonthNav(dir){
  cycleViewDate=new Date(cycleViewDate.getFullYear(),cycleViewDate.getMonth()+dir,1);
  renderPeriodCalendar();
}

function renderPeriodView(){
  const stats=getCycleStats();
  document.getElementById('csCycleLen').textContent=stats.avgCycle?stats.avgCycle+'d':'—';
  document.getElementById('csPeriodLen').textContent=stats.avgPeriod?stats.avgPeriod+'d':'—';
  document.getElementById('csLastPeriod').textContent=stats.lastStart?fmtShort(stats.lastStart):'—';
  renderPeriodCalendar();
}

function renderPeriodCalendar(){
  const yr=cycleViewDate.getFullYear(),mo=cycleViewDate.getMonth();
  document.getElementById('cycleMonthLabel').textContent=
    new Date(yr,mo,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const cal=document.getElementById('cycleCal');
  cal.innerHTML='';

  // day headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    const h=document.createElement('div');
    h.className='cycle-day-head';h.textContent=d;
    cal.appendChild(h);
  });

  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const today=todayStr();

  // blank cells
  for(let i=0;i<firstDay;i++){
    const b=document.createElement('div');b.className='cycle-cell other-month';cal.appendChild(b);
  }

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=new Date(yr,mo,d).toISOString().split('T')[0];
    const pdata=loadPeriodDay(dateStr);
    const cell=document.createElement('div');
    cell.className='cycle-cell';
    if(dateStr===today)cell.classList.add('today');
    if(pdata){
      if(pdata.flow==='spotting')cell.classList.add('spotting');
      else if(pdata.flow==='heavy')cell.classList.add('period','heavy');
      else if(pdata.flow)cell.classList.add('period');
    }
    cell.innerHTML=`<div class="cd-num">${d}</div>`;
    if(pdata&&pdata.flow){
      const dot=document.createElement('div');
      dot.className='cd-dot';
      dot.style.background=pdata.flow==='spotting'?themeColor('flow-spot'):pdata.flow==='light'?themeColor('flow-light'):pdata.flow==='medium'?themeColor('flow-med'):themeColor('flow-heavy');
      cell.appendChild(dot);
    }
    cell.onclick=()=>openPeriodModal(dateStr,pdata);
    cal.appendChild(cell);
  }
}

let _periodModalDate=null;

function openPeriodModal(date,existing){
  _periodModalDate=date;
  document.getElementById('periodModalTitle').textContent=
    new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  document.getElementById('periodNote').value=existing?.note||'';
  // set flow buttons
  const current=existing?.flow||'none';
  document.querySelectorAll('.flow-btn').forEach(b=>{
    b.classList.toggle('on',b.dataset.f===current);
  });
  document.getElementById('periodModal').classList.add('open');
}

function closePeriodModal(){
  document.getElementById('periodModal').classList.remove('open');
  _periodModalDate=null;
}

function selectFlow(f){
  document.querySelectorAll('.flow-btn').forEach(b=>b.classList.toggle('on',b.dataset.f===f));
}

function savePeriodDay(){
  if(!_periodModalDate)return;
  let flow='none';
  document.querySelectorAll('.flow-btn').forEach(b=>{if(b.classList.contains('on'))flow=b.dataset.f;});
  const note=document.getElementById('periodNote').value;
  savePeriodDayData(_periodModalDate,{flow,note});
  closePeriodModal();
  renderPeriodCalendar();
  // refresh stats
  const stats=getCycleStats();
  document.getElementById('csCycleLen').textContent=stats.avgCycle?stats.avgCycle+'d':'—';
  document.getElementById('csPeriodLen').textContent=stats.avgPeriod?stats.avgPeriod+'d':'—';
  document.getElementById('csLastPeriod').textContent=stats.lastStart?fmtShort(stats.lastStart):'—';
  showToast('🩸 On the calendar.');
}

// Dashboard cycle strip for current week
function renderDashCycleStrip(days){
  const hasPeriodData=days.some(d=>loadPeriodDay(d));
  const card=document.getElementById('dashCycleCard');
  if(!card)return;
  if(!hasPeriodData){card.style.display='none';return;}
  card.style.display='block';

  const strip=document.getElementById('dashCycleStrip');
  strip.innerHTML=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
    ${days.map(d=>{
      const pdata=loadPeriodDay(d);
      const dayLabel=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});
      const dayNum=new Date(d+'T12:00:00').getDate();
      const isToday=d===todayStr();
      let bg='var(--surface2)',border='var(--border)',dot='';
      if(pdata){
        if(pdata.flow==='spotting'){bg=themeColor('flow-spot',.22);border=themeColor('flow-spot');dot='🟡';}
        else if(pdata.flow==='light'){bg=themeColor('flow-light',.28);border=themeColor('flow-light');dot='🔴';}
        else if(pdata.flow==='medium'){bg=themeColor('flow-med',.28);border=themeColor('flow-med');dot='🔴🔴';}
        else if(pdata.flow==='heavy'){bg=themeColor('flow-heavy',.30);border=themeColor('flow-heavy');dot='🔴🔴🔴';}
      }
      return `<div style="background:${bg};border:1.5px solid ${border};border-radius:8px;padding:8px 4px;text-align:center;${isToday?'font-weight:700':''}">
        <div style="font-size:10px;color:var(--muted)">${dayLabel}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${dayNum}</div>
        <div style="font-size:12px;min-height:16px">${dot}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
