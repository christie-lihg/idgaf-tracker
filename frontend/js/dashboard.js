/* eslint-disable no-undef, emergent/no-undef */
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

  // Wellness chart — all 6 series, capacity uses the new --chart5 token.
  // Sleep is the odd one out: it is asked in the MORNING check-in, not in
  // the end-of-day sliders, so it reads morning.sleepQuality and falls back
  // to the historical wellness[2] for days logged before that slider went.
  const wellnessDatasets=[
    {label:'Energy',   color:themeColor('chart1'), read:d=>loadDay(d).wellness[0]},
    {label:'Mood',     color:themeColor('chart2'), read:d=>loadDay(d).wellness[1]},
    {label:'Sleep',    color:themeColor('chart3'), read:d=>{
      const m=loadMorning(d);
      return (m&&m.sleepQuality!==undefined&&m.sleepQuality!==null)
        ? m.sleepQuality : loadDay(d).wellness[2];
    }},
    {label:'Clarity',  color:themeColor('chart4'), read:d=>loadDay(d).wellness[3]},
    {label:'Hot flash',color:themeColor('amber'),  read:d=>loadDay(d).wellness[4]},
    {label:'Capacity', color:themeColor('chart5'), read:d=>loadDay(d).wellness[5]},
  ].map(item=>({
    label:item.label,
    data:this7.map(d=>{const v=item.read(d);return v!==undefined?v:null}),
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
        <div class="bar-track"><div class="bar-fill" style="transform:scaleX(${(x.count/maxC).toFixed(3)})"></div></div>
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

  // Capacity insight (last 30 days)
  renderCapacityInsight();

  // Symptom clustering across the menstrual cycle
  renderCycleCorrelation();

  // Symptom pairs that co-occur more than chance
  if(typeof renderSymptomCorrelations==='function') renderSymptomCorrelations();

  // One-tap daily reaction distribution
  if(typeof renderReactionChart==='function') renderReactionChart();

  // Before/after each logged treatment change
  if(typeof renderTreatmentImpact==='function') renderTreatmentImpact();

  // Trigger patterns, long-range trends, per-symptom direction, notes
  if(typeof renderTriggerInsight==='function')    renderTriggerInsight();
  if(typeof renderSixMonthTrend==='function')     renderSixMonthTrend();
  if(typeof renderSymptomDirections==='function') renderSymptomDirections();
  if(typeof renderNotesSearch==='function')       renderNotesSearch();

  // Custom rating sparklines (extras.js). Auto-hides when the user has
  // no custom ratings defined.
  if(typeof renderCustomRatingSparklines==='function') renderCustomRatingSparklines();
}

/* ── Capacity insight (last 30 days) ─────────────────────────────────
 * Compare average capacity on the top third of days by symptom count
 * against the bottom third. Requires at least 10 days with a capacity
 * rating logged; below that we say how many more are needed.
 * "Day" here = a calendar day in the last 30 with any wellness entry
 * AND a capacity value (index 5) set. */
function renderCapacityInsight(){
  const card=document.getElementById('capacityInsightCard');
  const body=document.getElementById('capacityInsightBody');
  if(!card||!body)return;

  const CAP_IDX=5;
  const days=[];
  for(let i=29;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
  }
  const rows=days.map(d=>{
    const log=loadDay(d);
    const hasWellness=Object.keys(log.wellness||{}).length>0;
    if(!hasWellness) return null;
    if(log.wellness[CAP_IDX]===undefined) return null;
    const period=(typeof loadPeriodDay==='function') ? loadPeriodDay(d) : null;
    const isPeriodFlow=!!(period && period.flow && period.flow!=='none' && period.flow!=='spotting');
    const symsOnDay=new Set(log.events.map(e=>e.sym));
    return {date:d, capacity:+log.wellness[CAP_IDX], events:log.events.length, isPeriodFlow, syms:symsOnDay};
  }).filter(Boolean);

  const MIN=10;
  if(rows.length < MIN){
    card.style.display='block';
    const need=MIN-rows.length;
    body.innerHTML=`
      <div class="cap-empty">
        <div class="cap-empty-icon">🫠</div>
        <div class="cap-empty-text">
          <strong>Log capacity ${need} more day${need!==1?'s':''}</strong> to see how it tracks with symptom load.
          <div class="cap-empty-sub">${rows.length} of ${MIN} days logged in the last 30.</div>
        </div>
      </div>`;
    return;
  }

  // Sort by symptom count, split into thirds
  const sorted=rows.slice().sort((a,b)=>a.events-b.events);
  const third=Math.floor(sorted.length/3);
  // top third = HIGHEST symptom counts (worst days)
  const worst=sorted.slice(sorted.length-third);
  // bottom third = LOWEST symptom counts (best days)
  const best=sorted.slice(0,third);

  const avg=arr=>arr.reduce((s,r)=>s+r.capacity,0)/arr.length;
  const worstAvg=avg(worst);
  const bestAvg=avg(best);
  const diff=bestAvg-worstAvg;
  const pct=bestAvg>0 ? Math.round((diff/bestAvg)*100) : 0;

  card.style.display='block';
  const dir = diff > 0 ? 'drop' : diff < 0 ? 'rise' : 'change';
  const summary = diff === 0
    ? `Your capacity holds steady across your worst and best symptom days.`
    : `On your ${worst.length} worst symptom days you had <b>${worstAvg.toFixed(1)} out of 10</b> left to give, versus <b>${bestAvg.toFixed(1)}</b> on your best days. That's a <b>${Math.abs(pct)}% ${dir}</b>.`;

  // Cycle overlay: how many of the worst-symptom days coincided with an
  // active period-flow day (excluding spotting). Hidden entirely when the
  // user tracks no period data — nothing helpful to say.
  const worstPeriod=worst.filter(r=>r.isPeriodFlow).length;
  const bestPeriod=best.filter(r=>r.isPeriodFlow).length;
  const anyPeriodTracked = rows.some(r=>r.isPeriodFlow);
  let cycleLine='';
  if(anyPeriodTracked){
    const pctWorst=Math.round((worstPeriod/worst.length)*100);
    const cycleInsight = worstPeriod>bestPeriod
      ? `Your worst days line up with your period more often than your best (<b>${worstPeriod}</b> of ${worst.length} vs <b>${bestPeriod}</b> of ${best.length}).`
      : worstPeriod<bestPeriod
        ? `Your period doesn't seem to be driving your worst days here (<b>${worstPeriod}</b> of ${worst.length} vs <b>${bestPeriod}</b> of ${best.length}).`
        : `Your worst and best days include the same number of period days (<b>${worstPeriod}</b> each) — cycle isn't the standout factor.`;
    cycleLine = `<p class="cap-cycle" data-testid="capacity-cycle-overlay">🩸 <b>${pctWorst}%</b> of your worst symptom days fell during period flow. ${cycleInsight}</p>`;
  }

  // Top 3 symptoms across the 30-day window — used to badge the worst-day
  // list so the user can see which symptoms tend to show up on capacity dips.
  const symCounts={};
  rows.forEach(r=>{
    r.syms.forEach(sIdx=>{ symCounts[sIdx]=(symCounts[sIdx]||0)+1; });
  });
  const topSyms=Object.entries(symCounts)
    .map(([sIdx,c])=>({idx:+sIdx, count:c}))
    .sort((a,b)=>b.count-a.count)
    .slice(0,3);
  const topSet=new Set(topSyms.map(s=>s.idx));

  // Mini date list marking period days AND top-symptom hits so the overlap
  // reads visually at a glance.
  const worstList = worst.slice().reverse().map(r=>{
    const hits=[...r.syms].filter(s=>topSet.has(s));
    const badges=hits.map(s=>{
      const label=SYMS[s].label.split(' ')[0];
      return `<span class="cap-day-sym" title="${SYMS[s].label}">${SYMS[s].icon} ${label}</span>`;
    }).join('');
    return `<li class="cap-day${r.isPeriodFlow?' cap-day-period':''}">
      <span class="cap-day-date">${formatShortDate(r.date)}</span>
      <span class="cap-day-events">${r.events} sym</span>
      <span class="cap-day-cap">${r.capacity}/10</span>
      ${r.isPeriodFlow?'<span class="cap-day-badge">🩸 period</span>':''}
      <span class="cap-day-syms">${badges}</span>
    </li>`;
  }).join('');

  // Legend row explaining what the badges mean, only when we actually have
  // any top-3 symptoms to show.
  const legendLine = topSyms.length>0
    ? `<p class="cap-legend" data-testid="capacity-top-symptoms">Top symptoms in this window: ${topSyms.map(s=>`<span class="cap-day-sym">${SYMS[s.idx].icon} ${SYMS[s.idx].label.split(' ')[0]} <b>×${s.count}</b></span>`).join(' ')}</p>`
    : '';

  body.innerHTML=`
    <div class="cap-grid">
      <div class="cap-stat cap-stat-worst">
        <div class="cap-stat-lbl">Worst symptom days</div>
        <div class="cap-stat-val">${worstAvg.toFixed(1)}<span>/10</span></div>
        <div class="cap-stat-sub">avg over ${worst.length} day${worst.length!==1?'s':''}</div>
      </div>
      <div class="cap-stat cap-stat-best">
        <div class="cap-stat-lbl">Best symptom days</div>
        <div class="cap-stat-val">${bestAvg.toFixed(1)}<span>/10</span></div>
        <div class="cap-stat-sub">avg over ${best.length} day${best.length!==1?'s':''}</div>
      </div>
    </div>
    <p class="cap-summary">${summary}</p>
    ${cycleLine}
    ${legendLine}
    <details class="cap-details">
      <summary>See the ${worst.length} worst days</summary>
      <ul class="cap-day-list">${worstList}</ul>
    </details>
    <p class="cap-note">Based on ${rows.length} days with capacity logged in the last 30.</p>
  `;
}

function formatShortDate(iso){
  const d=new Date(iso+'T12:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-US',{month:'short', day:'numeric'});
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
  // Prefer the morning check-in (where sleep quality is now asked); fall
  // back to the retired end-of-day slider so older weeks still report.
  const sleepSrc=agg.avgSleepQuality!==null?agg.avgSleepQuality:agg.avgWellness[2];
  const avgS=(sleepSrc!==null&&sleepSrc!==undefined)?sleepSrc.toFixed(1):'not rated';
  const avgCap=agg.avgWellness[5]!==null&&agg.avgWellness[5]!==undefined?agg.avgWellness[5].toFixed(1):'not rated';

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
  text+=`  ${WELLNESS_ITEMS[5].clinicalLabel}: ${avgCap}\n`;

  // Custom user-defined ratings — average over the same 7 days. Their labels
  // are user-supplied so we render them verbatim (no clinical alias to swap
  // in). This is intentional: providers see whatever the patient called it.
  if(typeof loadCustomRatings==='function'){
    const customs=loadCustomRatings();
    if(customs.length>0){
      const sums={}, counts={};
      days.forEach(d=>{
        const cw=(loadDay(d).customWellness)||{};
        Object.keys(cw).forEach(id=>{
          sums[id]=(sums[id]||0)+cw[id];
          counts[id]=(counts[id]||0)+1;
        });
      });
      const rendered=customs
        .filter(r=>counts[r.id]>0)
        .map(r=>`  ${r.label}: ${(sums[r.id]/counts[r.id]).toFixed(1)}`);
      if(rendered.length>0){
        text+=`\nYour custom ratings (0–10):\n`+rendered.join('\n')+'\n';
      }
    }
  }

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
  // Provider-section filter (extras.js): cache the raw copy AND write the
  // possibly-filtered version. Downstream copy/print/share all read from
  // the same element, so filtering here fans out everywhere.
  if(typeof cacheRawSummaryAndFilter==='function') cacheRawSummaryAndFilter(text);
}

function copyWeeklySummary(){
  const txt=document.getElementById('weeklySummaryText').textContent;
  navigator.clipboard.writeText(txt).then(()=>showToast("📋 Copied! Go show 'em."));
}

/* Print view for the clinician. Opens a new window with the summary text
 * rendered in a print-friendly layout (single page, no colour, uppercase
 * Fredoka heading, keeps the clinical register — the playful label never
 * appears here because #weeklySummaryText already uses `clinicalLabel`). */
function printWeeklySummary(){
  const txt=(document.getElementById('weeklySummaryText').textContent||'').trim();
  if(!txt){ showToast('Nothing to print yet — log some days first.'); return; }

  // Split the copy-summary text into a header (first line: "Week of …")
  // and the body so the printed page reads cleanly.
  const lines=txt.split('\n');
  const header=escape(lines[0]||'');
  const body=escape(lines.slice(1).join('\n').trim());

  const w=window.open('', '_blank', 'width=820,height=1000');
  if(!w){ showToast('Please allow pop-ups to print.'); return; }
  const generated=new Date().toLocaleString('en-US',{dateStyle:'medium', timeStyle:'short'});
  w.document.open();
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IDGAF Tracker — Weekly Summary</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Space+Grotesk:wght@400;500&display=swap">
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family:'Space Grotesk',system-ui,sans-serif; color:#111; line-height:1.55; margin:0; }
  .sheet { max-width: 7.2in; margin: 0 auto; padding: 0.2in 0; }
  h1 { font-family:'Fredoka',sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.02em;
        font-size:22px; margin:0 0 4px; border-bottom:2px solid #111; padding-bottom:8px; }
  .sub { font-size:11px; color:#555; margin:0 0 18px; text-transform:uppercase; letter-spacing:.08em; }
  h2 { font-family:'Fredoka',sans-serif; font-weight:600; text-transform:uppercase; letter-spacing:.02em;
        font-size:13px; margin:16px 0 6px; color:#111; }
  pre { font-family:'Space Grotesk',system-ui,sans-serif; white-space:pre-wrap; font-size:12.5px;
        margin:0; padding:0; color:#111; }
  .footer { margin-top:22px; padding-top:10px; border-top:1px solid #999; font-size:10.5px; color:#555; }
  .footer b { color:#111; }
  @media print { .no-print { display:none } }
  .no-print { text-align:right; margin:8px 0 14px; }
  .no-print button { font-family:'Space Grotesk',sans-serif; font-size:12px; padding:6px 12px;
        border:1.5px solid #111; background:#fff; cursor:pointer; margin-left:6px; }
</style>
</head>
<body>
<div class="sheet">
  <div class="no-print">
    <button onclick="window.print()">🖨 Print</button>
    <button onclick="window.close()">Close</button>
  </div>
  <h1>Weekly symptom summary</h1>
  <p class="sub">${header}</p>
  <h2>Report</h2>
  <pre>${body}</pre>
  <div class="footer">
    Generated by <b>IDGAF Tracker</b> · ${generated}<br>
    Self-reported data; all values are the patient's own scale-based ratings (0 = worst, 10 = best).
  </div>
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script>
</body>
</html>`);
  w.document.close();

  function escape(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
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

/* ── Cycle patterns ──────────────────────────────────────────────────
 * Maps every logged symptom event to its CYCLE DAY (day 1 = first day of
 * flow) and reports which symptoms cluster where.
 *
 * Deliberate constraints on what this will claim:
 *   - Needs >= 2 recorded period starts, i.e. at least one complete cycle.
 *   - A symptom needs >= MIN_EVENTS occurrences before it is reported at
 *     all, and the sample size is always shown.
 *   - A "peak" window is only reported when it holds meaningfully more
 *     than an even spread would give (PEAK_RATIO). Otherwise the symptom
 *     is flat across the cycle and calling any window a peak is noise.
 *   - The wording describes what was logged. It is not a prediction and
 *     not a medical claim — "clustered on days 21-25", never "will peak".
 */
const CYCLE_WINDOWS = [
  {lo:1,  hi:5,  label:'days 1–5'},
  {lo:6,  hi:10, label:'days 6–10'},
  {lo:11, hi:15, label:'days 11–15'},
  {lo:16, hi:20, label:'days 16–20'},
  {lo:21, hi:25, label:'days 21–25'},
  {lo:26, hi:99, label:'day 26+'},
];
const CYCLE_MIN_EVENTS = 5;
const CYCLE_PEAK_RATIO = 1.5;   // vs an even spread across windows

/* Period starts: a flow day whose previous day has no flow.
 * Spotting does not start a cycle and does not bridge one. */
function cycleStartDates(){
  const flow = allPeriodDates().filter(d=>{
    const p = loadPeriodDay(d);
    return p && p.flow && p.flow !== 'spotting' && p.flow !== 'none';
  });
  const flowSet = new Set(flow);
  return flow.filter(d=>{
    const prev = new Date(d+'T12:00:00'); prev.setDate(prev.getDate()-1);
    return !flowSet.has(prev.toISOString().split('T')[0]);
  }).sort();
}

function computeCycleCorrelations(){
  const starts = cycleStartDates();
  if(starts.length < 2) return {ok:false, starts:starts.length};

  const dayMs = 86400000;
  const startTimes = starts.map(d => new Date(d+'T12:00:00').getTime());
  const lastCycleEnd = Date.now();

  // symptom index -> array of cycle days
  const bySym = new Map();
  let mapped = 0;

  for(const day of allDays()){
    const t = new Date(day.date+'T12:00:00').getTime();
    // which cycle does this day fall in? the latest start at or before it
    let si = -1;
    for(let i=0;i<startTimes.length;i++){ if(startTimes[i] <= t) si = i; else break; }
    if(si < 0) continue;                       // before the first recorded cycle
    const cycleEnd = (si+1 < startTimes.length) ? startTimes[si+1] : lastCycleEnd;
    if(t >= cycleEnd) continue;
    const cycleDay = Math.floor((t - startTimes[si]) / dayMs) + 1;
    if(cycleDay < 1 || cycleDay > 60) continue;  // guard against bad data

    for(const ev of (day.events||[])){
      if(!bySym.has(ev.sym)) bySym.set(ev.sym, []);
      bySym.get(ev.sym).push(cycleDay);
      mapped++;
    }
  }

  const evenShare = 1 / CYCLE_WINDOWS.length;
  const findings = [];

  for(const [sym, days] of bySym){
    if(days.length < CYCLE_MIN_EVENTS) continue;
    const counts = CYCLE_WINDOWS.map(w => days.filter(d => d >= w.lo && d <= w.hi).length);
    const total = counts.reduce((a,b)=>a+b,0);
    if(!total) continue;
    let bi = 0;
    for(let i=1;i<counts.length;i++) if(counts[i] > counts[bi]) bi = i;
    const share = counts[bi] / total;
    if(share < evenShare * CYCLE_PEAK_RATIO) continue;   // too flat to call
    findings.push({
      sym,
      label: (SYMS[sym]||{}).label || 'Unknown',
      icon:  (SYMS[sym]||{}).icon  || '•',
      window: CYCLE_WINDOWS[bi].label,
      inWindow: counts[bi],
      total,
      share,
    });
  }

  findings.sort((a,b)=> (b.share - a.share) || (b.total - a.total));
  return {ok:true, cycles: starts.length - 1, mapped, findings};
}

function renderCycleCorrelation(){
  const card = document.getElementById('cyclePatternsCard');
  const body = document.getElementById('cyclePatternsBody');
  if(!card || !body) return;
  if(typeof allPeriodDates !== 'function'){ card.style.display='none'; return; }

  const res = computeCycleCorrelations();
  card.style.display = 'block';

  if(!res.ok){
    const need = 2 - res.starts;
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🩸</div>
        <div class="cap-empty-text">
          <strong>Log ${need} more period start${need!==1?'s':''}</strong> to see how your symptoms line up with your cycle.
          <div class="cap-empty-sub">Needs at least two recorded periods — patterns are measured between one start and the next.</div>
        </div>
      </div>`;
    return;
  }

  if(!res.findings.length){
    body.innerHTML = `
      <div class="cap-empty">
        <div class="cap-empty-icon">🔍</div>
        <div class="cap-empty-text">
          <strong>No clear pattern yet.</strong>
          <div class="cap-empty-sub">Across ${res.cycles} cycle${res.cycles!==1?'s':''} and ${res.mapped} logged event${res.mapped!==1?'s':''}, nothing clusters strongly enough to call. Keep logging — this fills in on its own.</div>
        </div>
      </div>`;
    return;
  }

  const rows = res.findings.slice(0,5).map(f=>`
    <div class="cyc-row">
      <div class="cyc-sym">${f.icon} ${escHtml(f.label)}</div>
      <div class="cyc-detail">
        clustered on <b>${f.window}</b>
        <span class="cyc-n">${f.inWindow} of ${f.total} logged</span>
      </div>
    </div>`).join('');

  body.innerHTML = rows + `
    <p class="cyc-note">Based on ${res.cycles} recorded cycle${res.cycles!==1?'s':''}.
    This describes what you logged — not a forecast, and not medical advice.</p>`;
}

function escHtml(s){
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
