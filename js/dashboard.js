// DASHBOARD
// ═══════════════════════════════════════════════════════════════
let charts={};

function renderDashboard(){
  const this7=last7Days();
  const prev7=prev7Days();

  // Aggregate current week
  const cur=aggregateWeek(this7);
  const prv=aggregateWeek(prev7);

  const hasCur=cur.totalEvents>0||cur.daysLogged>0;

  document.getElementById('dashSub').textContent=hasCur
    ?`${cur.daysLogged} of 7 days logged this week · ${cur.totalEvents} total events`
    :'Log symptoms daily — the dashboard builds automatically.';

  if(!hasCur){
    document.getElementById('dashEmpty').style.display='block';
    document.getElementById('dashContent').style.display='none';
    return;
  }
  document.getElementById('dashEmpty').style.display='none';
  document.getElementById('dashContent').style.display='block';

  // Cycle strip
  renderDashCycleStrip(this7);

  // KPIs
  setKpi('kpiEvents',cur.totalEvents,'kpiEventsTrend',cur.totalEvents,prv.totalEvents,true);
  setKpi('kpiHF',cur.symCounts[0]||0,'kpiHFTrend',cur.symCounts[0]||0,prv.symCounts[0]||0,true);

  const avgEnergy=cur.avgWellness[0]!==null?cur.avgWellness[0].toFixed(1):'—';
  document.getElementById('kpiEnergy').textContent=avgEnergy;
  if(cur.avgWellness[0]!==null&&prv.avgWellness[0]!==null){
    setTrend('kpiEnergyTrend',cur.avgWellness[0],prv.avgWellness[0],false);
  } else {
    document.getElementById('kpiEnergyTrend').textContent='—';
    document.getElementById('kpiEnergyTrend').className='kpi-trend neutral';
  }

  document.getElementById('kpiDays').textContent=cur.daysLogged;
  document.getElementById('kpiDaysTrend').textContent=prv.daysLogged>0?`vs ${prv.daysLogged} last week`:'First week!';
  document.getElementById('kpiDaysTrend').className='kpi-trend neutral';

  // Heatmap
  buildHeatmap(this7);

  // Event count chart
  const dayLabels=this7.map(d=>fmtShort(d));
  const dayCounts=this7.map(d=>loadDay(d).events.length);
  dc('chartEvents');
  charts.events=new Chart(document.getElementById('chartEvents'),{
    type:'bar',
    data:{
      labels:dayLabels,
      datasets:[{
        label:'Events',data:dayCounts,
        backgroundColor:dayCounts.map(v=>v===0?themeColor('mint',.9):v<3?themeColor('leaf',.75):v<6?themeColor('sage',.85):themeColor('forest',.9)),
        borderRadius:5
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{
        y:{min:0,suggestedMax:8,grid:{color:themeColor('mint')},ticks:{font:{size:10}}},
        x:{grid:{display:false},ticks:{font:{size:11}}}
      },
      animation:{duration:500},responsive:true,maintainAspectRatio:false
    }
  });

  // Wellness chart
  const wellnessDatasets=[
    {label:'Energy',color:themeColor('chart1')},
    {label:'Mood',color:themeColor('chart2')},
    {label:'Sleep',color:themeColor('chart3')},
    {label:'Clarity',color:themeColor('chart4')},
  ].map((item,i)=>({
    label:item.label,
    data:this7.map(d=>{const w=loadDay(d).wellness;return w[i]!==undefined?w[i]:null}),
    borderColor:item.color,backgroundColor:'transparent',
    borderWidth:2,tension:.35,pointRadius:4,
    spanGaps:true,fill:false
  }));
  dc('chartWellness');
  charts.wellness=new Chart(document.getElementById('chartWellness'),{
    type:'line',
    data:{labels:dayLabels,datasets:wellnessDatasets},
    options:{
      plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
      scales:{
        y:{min:0,max:10,grid:{color:themeColor('mint')},ticks:{font:{size:10}}},
        x:{grid:{display:false},ticks:{font:{size:11}}}
      },
      animation:{duration:500},responsive:true,maintainAspectRatio:false
    }
  });

  // Top symptoms this week
  const symTotals=SYMS.map((_,i)=>({
    sym:i,count:this7.reduce((sum,d)=>sum+(loadDay(d).events.filter(e=>e.sym===i).length),0)
  })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,8);

  const topDiv=document.getElementById('topSymptoms');
  if(symTotals.length===0){
    topDiv.innerHTML='<p style="font-size:13px;color:var(--muted)">No events logged this week.</p>';
  } else {
    const maxC=symTotals[0].count;
    topDiv.innerHTML=symTotals.map(x=>`
      <div class="db-row">
        <div class="db-name">${SYMS[x.sym].icon} ${SYMS[x.sym].label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((x.count/maxC)*100)}%"></div></div>
        <div class="db-score">${x.count}</div>
        <div class="db-max">events</div>
      </div>`).join('');
  }

  // Time-of-day chart
  const hourBuckets=new Array(24).fill(0);
  this7.forEach(d=>loadDay(d).events.forEach(e=>{ hourBuckets[new Date(e.ts).getHours()]++; }));
  const todLabels=['12am','1','2','3','4','5','6','7','8','9','10','11','12pm','1','2','3','4','5','6','7','8','9','10','11'];
  dc('chartTOD');
  charts.tod=new Chart(document.getElementById('chartTOD'),{
    type:'bar',
    data:{labels:todLabels,datasets:[{label:'Events',data:hourBuckets,backgroundColor:themeColor('sage',.75),borderRadius:3}]},
    options:{
      plugins:{legend:{display:false}},
      scales:{
        y:{min:0,grid:{color:themeColor('mint')},ticks:{font:{size:9}}},
        x:{grid:{display:false},ticks:{font:{size:9}}}
      },
      animation:{duration:500},responsive:true,maintainAspectRatio:false
    }
  });

  // Auto-generated summary
  buildWeeklySummary(this7,cur);
}

function aggregateWeek(days){
  let totalEvents=0,daysLogged=0;
  const symCounts={};
  const wellnessSum={},wellnessCnt={};
  const overnightCounts={};
  let sleepQualSum=0,sleepQualCnt=0;

  days.forEach(d=>{
    const log=loadDay(d);
    const morning=loadMorning(d);
    if(log.events.length>0||Object.keys(log.wellness).length>0||morning)daysLogged++;
    totalEvents+=log.events.length;
    log.events.forEach(e=>{ symCounts[e.sym]=(symCounts[e.sym]||0)+1; });
    WELLNESS_ITEMS.forEach((_,i)=>{
      if(log.wellness[i]!==undefined){
        wellnessSum[i]=(wellnessSum[i]||0)+log.wellness[i];
        wellnessCnt[i]=(wellnessCnt[i]||0)+1;
      }
    });
    if(morning){
      (morning.checked||[]).forEach(i=>{ overnightCounts[i]=(overnightCounts[i]||0)+1; });
      if(morning.sleepQuality!==undefined){ sleepQualSum+=morning.sleepQuality; sleepQualCnt++; }
    }
  });

  const avgWellness=WELLNESS_ITEMS.map((_,i)=>wellnessCnt[i]?wellnessSum[i]/wellnessCnt[i]:null);
  const avgSleepQuality=sleepQualCnt?sleepQualSum/sleepQualCnt:null;
  return {totalEvents,daysLogged,symCounts,avgWellness,overnightCounts,avgSleepQuality};
}

function buildHeatmap(days){
  const container=document.getElementById('heatmap');
  if(!container)return;

  // top 6 most-logged syms this week (for rows)
  const totals=SYMS.map((_,i)=>({i,c:days.reduce((s,d)=>s+loadDay(d).events.filter(e=>e.sym===i).length,0)}))
    .filter(x=>x.c>0).sort((a,b)=>b.c-a.c).slice(0,6);

  if(totals.length===0){container.innerHTML='<p style="font-size:13px;color:var(--muted)">No events this week.</p>';return;}

  const dayNames=days.map(d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'}));
  const maxPerCell=Math.max(...totals.map(({i})=>Math.max(...days.map(d=>loadDay(d).events.filter(e=>e.sym===i).length))),1);

  let html=`<div class="week-row">`+
    `<div class="week-label"></div>`+
    dayNames.map(n=>`<div class="week-day-head">${n}</div>`).join('')+
    `</div>`;

  totals.forEach(({i})=>{
    html+=`<div class="week-row"><div class="week-label">${SYMS[i].icon} ${SYMS[i].label.split(' ')[0]}</div>`;
    days.forEach(d=>{
      const c=loadDay(d).events.filter(e=>e.sym===i).length;
      const lvl=c===0?0:c<=1?1:c<=2?2:3;
      html+=`<div class="heat-cell h${lvl}" title="${c} event${c!==1?'s':''}">${c>0?c:''}</div>`;
    });
    html+=`</div>`;
  });

  container.innerHTML=html;
}

function buildWeeklySummary(days,agg){
  const el=document.getElementById('weeklySummaryText');
  if(!el)return;

  const weekStart=fmtFull(days[0]);
  const weekEnd=fmtFull(days[6]);

  const topSyms=SYMS.map((_,i)=>({name:SYMS[i].label,count:agg.symCounts[i]||0}))
    .filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,5);

  const avgE=agg.avgWellness[0]!==null?agg.avgWellness[0].toFixed(1):'not rated';
  const avgM=agg.avgWellness[1]!==null?agg.avgWellness[1].toFixed(1):'not rated';
  const avgS=agg.avgWellness[2]!==null?agg.avgWellness[2].toFixed(1):'not rated';

  let text=`Week of ${weekStart} – ${weekEnd}\n\n`;
  text+=`Days tracked: ${agg.daysLogged}/7\n`;
  text+=`Total symptom events: ${agg.totalEvents}\n\n`;

  if(topSyms.length>0){
    text+=`Most frequent symptoms:\n`;
    topSyms.forEach((s,i)=>{ text+=`  ${i+1}. ${s.name} — ${s.count} occurrence${s.count!==1?'s':''}\n`; });
    text+='\n';
  }

  text+=`Average wellness ratings (0–10):\n`;
  text+=`  Energy: ${avgE}\n`;
  text+=`  Mood: ${avgM}\n`;
  text+=`  Sleep quality: ${avgS}\n`;

  // notes from the week
  const notes=days.map(d=>({date:d,note:loadDay(d).note})).filter(x=>x.note&&x.note.trim());
  if(notes.length>0){
    text+=`\nNotes:\n`;
    notes.forEach(n=>{ text+=`  ${fmtShort(n.date)}: ${n.note.trim()}\n`; });
  }

  // overnight / morning summary data
  const morningData=days.map(d=>({date:d,m:loadMorning(d)})).filter(x=>x.m);
  if(morningData.length>0){
    text+=`\nOvernight reports (${morningData.length} day${morningData.length!==1?'s':''}):\n`;
    const sorted=Object.entries(agg.overnightCounts).sort((a,b)=>b[1]-a[1]);
    sorted.forEach(([i,c])=>{
      text+=`  ${OVERNIGHT_ITEMS[+i].label}: ${c} night${c!==1?'s':''}\n`;
    });
    if(agg.avgSleepQuality!==null){
      text+=`  Avg sleep quality: ${agg.avgSleepQuality.toFixed(1)}/10\n`;
    }
  }

  el.textContent=text;
}

function copyWeeklySummary(){
  const txt=document.getElementById('weeklySummaryText').textContent;
  navigator.clipboard.writeText(txt).then(()=>showToast("📋 Copied! Go show 'em."));
}

function setKpi(valId,val,trendId,cur,prv,lowerBetter){
  document.getElementById(valId).textContent=val;
  if(prv>0||cur>0)setTrend(trendId,cur,prv,lowerBetter);
  else { document.getElementById(trendId).textContent='No prior week'; document.getElementById(trendId).className='kpi-trend neutral'; }
}

function setTrend(id,cur,prv,lowerBetter){
  const el=document.getElementById(id);
  if(prv===null||prv===undefined){el.textContent='—';el.className='kpi-trend neutral';return}
  const diff=cur-prv;
  // Averages (energy, mood, sleep) are floats, so round for display AND for the
  // no-change test — otherwise 1e-15 of float noise renders as "↑ 0 vs last week".
  const shown=Number(Math.abs(diff).toFixed(1));
  if(shown===0){el.textContent='→ No change';el.className='kpi-trend neutral';return}
  const improved=lowerBetter?diff<0:diff>0;
  el.textContent=(improved?'↑ ':'↓ ')+shown+' vs last week';
  el.className='kpi-trend '+(improved?'up':'down');
}

// ═══════════════════════════════════════════════════════════════
