/* eslint-disable no-undef, emergent/no-undef */
// MORNING SUMMARY
// ═══════════════════════════════════════════════════════════════

const OVERNIGHT_ITEMS = [
  {icon:'💧', label:'Night sweats'},
  {icon:'🔥', label:'Hot flash(es)'},
  {icon:'💤', label:'Trouble falling asleep'},
  {icon:'🌙', label:'Woke up multiple times'},
  {icon:'💓', label:'Heart racing / pounding'},
  {icon:'😰', label:'Anxiety / restlessness'},
  {icon:'🥵', label:'Overheated / kicked off covers'},
  {icon:'🤕', label:'Headache upon waking'},
  {icon:'😩', label:'Woke up exhausted'},
  {icon:'🦴', label:'Joint / muscle discomfort'},
  {icon:'🧠', label:'Racing thoughts / couldn\'t quiet mind'},
  {icon:'🚽', label:'Had to get up to use bathroom'},
];

function loadMorning(d){
  try{ return JSON.parse(localStorage.getItem(STORE_PREFIX+'morning_'+(d||todayStr()))||'null') }
  catch{ return null }
}
function saveMorningData(d,data){ localStorage.setItem(STORE_PREFIX+'morning_'+(d||todayStr()),JSON.stringify(data)) }

function buildMorningCard(){
  const today=todayStr();
  const saved=loadMorning(today);

  // Build overnight checkbox grid
  const grid=document.getElementById('overnightGrid');
  if(grid){
    grid.innerHTML='';
    OVERNIGHT_ITEMS.forEach((item,i)=>{
      const checked=saved&&saved.checked&&saved.checked.includes(i);
      const el=document.createElement('div');
      el.className='on-item'+(checked?' checked':'');
      el.id='on_'+i;
      // it behaves like a toggle button, so announce it as one — the
      // selected state is otherwise carried only by colour, which a
      // screen reader cannot see and some users cannot distinguish
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-pressed', checked ? 'true' : 'false');
      el.onclick=()=>toggleOvernightItem(i);
      el.onkeydown=(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleOvernightItem(i); } };
      el.innerHTML=`<div class="on-check">${checked?'✓':''}</div><div class="on-icon">${item.icon}</div><div class="on-label">${item.label}</div>`;
      grid.appendChild(el);
    });
  }

  // Sleep hours bubbles
  const hoursRow=document.getElementById('sleepHoursRow');
  if(hoursRow){
    hoursRow.innerHTML='';
    ['<4','4','5','6','7','8','9','10+'].forEach(h=>{
      const btn=document.createElement('button');
      btn.type='button';
      const on=!!(saved&&saved.sleepHours===h);
      btn.className='sh-btn'+(on?' on':'');
      btn.textContent=h;
      btn.setAttribute('aria-pressed', on?'true':'false');
      btn.setAttribute('aria-label', (h==='<4'?'Under 4':h==='10+'?'10 or more':h)+' hours of sleep');
      btn.onclick=()=>selectSleepHours(h);
      hoursRow.appendChild(btn);
    });
  }

  // Sleep quality slider
  const sq=document.getElementById('sleepQualSlider');
  const sqv=document.getElementById('sleepQualVal');
  if(sq&&saved&&saved.sleepQuality!==undefined){
    sq.value=saved.sleepQuality;
    if(sqv)sqv.textContent=saved.sleepQuality+'/10';
  } else if(sqv){
    sqv.textContent='5/10';
  }

  // Note
  const noteEl=document.getElementById('morningNote');
  if(noteEl&&saved&&saved.note)noteEl.value=saved.note;

  // Card state
  updateMorningCardState(saved);
}

// track checked items in memory while editing
let _overnightChecked=new Set();

function toggleOvernightItem(i){
  const el=document.getElementById('on_'+i);
  if(!el)return;
  const isChecked=el.classList.contains('checked');
  el.classList.toggle('checked',!isChecked);
  el.querySelector('.on-check').textContent=!isChecked?'✓':'';
}

function selectSleepHours(h){
  document.querySelectorAll('.sh-btn').forEach(b=>{
    const on = b.textContent===h;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on?'true':'false');
  });
}

function saveMorning(){
  const today=todayStr();

  // collect checked items
  const checked=[];
  OVERNIGHT_ITEMS.forEach((_,i)=>{
    if(document.getElementById('on_'+i)?.classList.contains('checked'))checked.push(i);
  });

  // sleep hours
  let sleepHours=null;
  document.querySelectorAll('.sh-btn').forEach(b=>{ if(b.classList.contains('on'))sleepHours=b.textContent; });

  // sleep quality
  const sleepQuality=+(document.getElementById('sleepQualSlider')?.value||5);

  // note
  const note=document.getElementById('morningNote')?.value||'';

  const data={checked,sleepHours,sleepQuality,note,savedAt:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})};
  saveMorningData(today,data);
  updateMorningCardState(data);
  showToast(MORNING_SAVED());
  const log=loadDay(today);
  buildTimeline(log,today);
}

function updateMorningCardState(saved){
  const card=document.getElementById('morningCard');
  const status=document.getElementById('mhStatus');
  const sub=document.getElementById('mhSub');
  const icon=document.getElementById('mhIcon');
  const saveNote=document.getElementById('morningSaveNote');
  if(!card)return;

  if(saved){
    card.className='morning-card done';
    if(status){status.textContent='✓ Done';status.style.color=''}
    if(icon)icon.textContent='☀️';
    const checkedCount=saved.checked?.length||0;
    const parts=[];
    if(saved.sleepHours)parts.push(saved.sleepHours+'h sleep');
    if(checkedCount>0)parts.push(checkedCount+' overnight item'+(checkedCount!==1?'s':''));
    if(sub)sub.textContent=parts.length?parts.join(' · '):'Completed at '+saved.savedAt;
    if(saveNote)saveNote.textContent='Saved at '+saved.savedAt+' — tap to edit';
    // collapse after save
    const body=document.getElementById('morningBody');
    const chev=document.getElementById('mhChevron');
    if(body)body.classList.remove('open');
    if(chev)chev.classList.remove('open');
  } else {
    card.className='morning-card pending';
    if(status)status.textContent='Not done';
    if(icon)icon.textContent='🌅';
    if(sub)sub.textContent="How you doin'? Takes 30 seconds, tops.";
  }
}

function toggleMorning(){
  const body=document.getElementById('morningBody');
  const chev=document.getElementById('mhChevron');
  if(!body)return;
  const isOpen=body.classList.contains('open');
  body.classList.toggle('open',!isOpen);
  chev.classList.toggle('open',!isOpen);
  const head=document.querySelector('.morning-header');
  if(head) head.setAttribute('aria-expanded', String(!isOpen));
}

/* The 20 collapsible card headers were built to match this one and all got
   role/tabindex/keyboard handling. This, the original, never did. */
function initMorningHeader(){
  const head=document.querySelector('.morning-header');
  if(!head||head.dataset.wired) return;
  head.dataset.wired='1';
  head.setAttribute('role','button');
  head.setAttribute('tabindex','0');
  head.setAttribute('aria-controls','morningBody');
  head.setAttribute('aria-expanded',
    String(!!document.getElementById('morningBody')?.classList.contains('open')));
  head.addEventListener('keydown', e=>{
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleMorning(); }
  });
}

// ═══════════════════════════════════════════════════════════════
