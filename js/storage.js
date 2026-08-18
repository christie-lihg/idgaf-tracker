// STORAGE
// ═══════════════════════════════════════════════════════════════
function dayKey(d){ return 'vv_day_'+(d||todayStr()) }
function todayStr(){ return new Date().toISOString().split('T')[0] }

function loadDay(d){
  try{
    const data=JSON.parse(localStorage.getItem(dayKey(d))||'{"events":[],"wellness":{},"note":""}');
    // strip any previously auto-logged overnight events from old builds
    data.events=data.events.filter(e=>!e.overnight);
    return data;
  }
  catch{ return {events:[],wellness:{},note:''} }
}
function saveDay(d,data){ localStorage.setItem(dayKey(d),JSON.stringify(data)) }

function allDayKeys(){
  const keySet=new Set();
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith('vv_day_'))keySet.add(k.replace('vv_day_',''));
    if(k&&k.startsWith('vv_morning_'))keySet.add(k.replace('vv_morning_',''));
  }
  return [...keySet].sort();
}

function allDays(){
  return allDayKeys().map(d=>{
    const day=loadDay(d);
    const morning=loadMorning(d);
    return {date:d,...day,morning};
  }).filter(d=>d.events.length>0||Object.keys(d.wellness).length>0||d.morning);
}

function last7Days(){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function prev7Days(){
  const days=[];
  for(let i=13;i>=7;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ═══════════════════════════════════════════════════════════════
