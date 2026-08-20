// DATA I/O — JSON export & import for every `idgaf_*` key in localStorage.
// ═══════════════════════════════════════════════════════════════════════
// Local-only by design. Nothing here touches the network. The exported
// file is a portable backup the user can move between devices themselves.
//
// The schema is versioned so future imports can be migrated. Bump
// DATA_SCHEMA_VERSION whenever the shape of exported records changes.
//
// Import UX:
//   1. User picks a JSON file.
//   2. We parse it, validate the shape, and count days to ADD vs OVERWRITE.
//   3. We open the #importModal listing the exact dates in each bucket and
//      offering a merge-mode choice ("overwrite" | "add-only").
//   4. Nothing is written until the user clicks Confirm.
// ═══════════════════════════════════════════════════════════════════════

const DATA_SCHEMA_VERSION = 1;

// Day-scoped keys the confirm dialog surfaces to the user. Migration flags
// and other non-day keys are still written, just not listed — users think
// about their data in days, not internal keys.
const IMPORT_DAY_FAMILIES = [
  {prefix:'day_',     label:'log'},
  {prefix:'morning_', label:'morning'},
  {prefix:'period_',  label:'period'},
];

// Buffer holding the parsed & filtered payload between the file pick and
// the modal Confirm click. Cleared on cancel/confirm.
let _pendingImport = null;

/* ──────────────────────────────────────────────────────────────────────
   EXPORT
   ────────────────────────────────────────────────────────────────────── */

function collectIdgafKeys(){
  const out={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && k.startsWith(STORE_PREFIX)) out[k]=localStorage.getItem(k);
  }
  return out;
}

function exportAllData(){
  const data=collectIdgafKeys();
  const keyCount=Object.keys(data).length;
  if(keyCount===0){ showToast('Nothing to export yet.'); return; }

  const now=new Date();
  const stamp=now.toISOString().split('T')[0]; // YYYY-MM-DD
  const payload={
    app:'idgaf-tracker',
    schemaVersion:DATA_SCHEMA_VERSION,
    exportDate:now.toISOString(),
    data
  };

  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`idgaf-tracker-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);

  showToast(`💾 Exported ${keyCount} record${keyCount!==1?'s':''}.`);
}

/* ──────────────────────────────────────────────────────────────────────
   IMPORT — file pick + parse
   ────────────────────────────────────────────────────────────────────── */

function triggerImportData(){
  const input=document.getElementById('importFileInput');
  if(!input)return;
  input.value=''; // allow re-selecting the same file
  input.click();
}

function handleImportFile(evt){
  const file=evt.target.files&&evt.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onerror=()=>{ alert('Could not read that file. Try again?'); };
  reader.onload=()=>{
    let payload;
    try{
      payload=JSON.parse(reader.result);
    }catch(err){
      alert("That doesn't look like a valid IDGAF Tracker export.\n\nThe file isn't valid JSON.");
      return;
    }
    if(!payload || typeof payload!=='object' || !payload.data || typeof payload.data!=='object'){
      alert("That doesn't look like a valid IDGAF Tracker export.\n\nExpected a JSON file with a top-level \"data\" object.");
      return;
    }
    // Filter to this app's prefix — never write foreign keys.
    const filtered={};
    Object.keys(payload.data).forEach(k=>{
      if(k.startsWith(STORE_PREFIX)) filtered[k]=payload.data[k];
    });
    if(Object.keys(filtered).length===0){
      alert("That file has no idgaf_* records to import.");
      return;
    }
    openImportModal({
      filename: file.name,
      exportDate: payload.exportDate || null,
      schemaVersion: payload.schemaVersion || null,
      data: filtered
    });
  };
  reader.readAsText(file);
}

/* Split incoming keys into two disjoint sets keyed by DATE (YYYY-MM-DD):
   `addDates` (nothing exists for that day yet) and `overwriteDates` (at
   least one day-family key exists for that day). Non-day keys are put in
   `nonDayKeys` — written silently, not surfaced to the user. */
function analyzeIncoming(incoming){
  const incomingDates=new Set();
  const existingDates=new Set();
  const nonDayKeys=[];

  const familyFor=k=>IMPORT_DAY_FAMILIES.find(f=>k.startsWith(STORE_PREFIX+f.prefix));

  Object.keys(incoming).forEach(k=>{
    const fam=familyFor(k);
    if(fam) incomingDates.add(k.slice((STORE_PREFIX+fam.prefix).length));
    else nonDayKeys.push(k);
  });
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k) continue;
    const fam=familyFor(k);
    if(fam) existingDates.add(k.slice((STORE_PREFIX+fam.prefix).length));
  }

  const addDates=[], overwriteDates=[];
  incomingDates.forEach(d=>{
    (existingDates.has(d) ? overwriteDates : addDates).push(d);
  });
  addDates.sort(); overwriteDates.sort();
  return {addDates, overwriteDates, nonDayKeys};
}

/* ──────────────────────────────────────────────────────────────────────
   IMPORT MODAL
   ────────────────────────────────────────────────────────────────────── */

function openImportModal({filename, exportDate, schemaVersion, data}){
  const {addDates, overwriteDates, nonDayKeys}=analyzeIncoming(data);
  _pendingImport={data, addDates, overwriteDates, nonDayKeys};

  // Meta line — filename + when it was exported.
  const metaBits=[];
  metaBits.push(`<b>${escapeText(filename)}</b>`);
  if(exportDate){
    try{
      const when=new Date(exportDate);
      if(!isNaN(when)) metaBits.push(`exported ${when.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`);
    }catch{ /* ignore invalid dates */ }
  }
  if(schemaVersion) metaBits.push(`schema v${schemaVersion}`);
  document.getElementById('importFileMeta').innerHTML=metaBits.join(' · ');

  // Preview lists — render the actual dates, not just counts.
  renderDateList('importAddList', addDates, 'No new days in this file.');
  renderDateList('importOverwriteList', overwriteDates, 'No existing days would be overwritten.');
  document.querySelector('[data-testid=import-add-count]').textContent=String(addDates.length);
  document.querySelector('[data-testid=import-overwrite-count]').textContent=String(overwriteDates.length);

  // Show/hide the "skipped in add-only mode" hint depending on overlap.
  const hint=document.getElementById('importOverwriteHint');
  hint.style.display = overwriteDates.length>0 ? 'block' : 'none';

  // Default merge mode: "overwrite" (matches the app's confirmed behaviour).
  const overwriteRadio=document.querySelector('input[name=importMode][value=overwrite]');
  if(overwriteRadio) overwriteRadio.checked=true;

  document.getElementById('importModal').classList.add('open');
}

function renderDateList(id, dates, emptyText){
  const el=document.getElementById(id);
  if(!el) return;
  if(dates.length===0){
    el.innerHTML=`<li class="import-empty">${emptyText}</li>`;
    return;
  }
  el.innerHTML=dates.map(d=>`<li>${formatDateForList(d)}</li>`).join('');
}

/* Full "Mon, Jan 5 2026" format so users can spot mistakes. Falls back to
   the raw ISO date if parsing fails (unusual). */
function formatDateForList(iso){
  const d=new Date(iso+'T12:00:00');
  if(isNaN(d)) return escapeText(iso);
  return d.toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric', year:'numeric'});
}

function escapeText(s){
  const div=document.createElement('div');
  div.textContent=String(s);
  return div.innerHTML;
}

function cancelImport(){
  _pendingImport=null;
  document.getElementById('importModal').classList.remove('open');
}

function confirmImport(){
  if(!_pendingImport){ cancelImport(); return; }
  const {data, overwriteDates}=_pendingImport;
  const mode=(document.querySelector('input[name=importMode]:checked')||{}).value || 'overwrite';

  // In "add-only" mode, drop every key whose date is already present.
  const overwriteSet=new Set(overwriteDates);
  const familyFor=k=>IMPORT_DAY_FAMILIES.find(f=>k.startsWith(STORE_PREFIX+f.prefix));
  let written=0, skipped=0;

  Object.keys(data).forEach(k=>{
    const fam=familyFor(k);
    if(mode==='add-only' && fam){
      const dateStr=k.slice((STORE_PREFIX+fam.prefix).length);
      if(overwriteSet.has(dateStr)){ skipped++; return; }
    }
    const v=data[k];
    if(typeof v==='string'){ localStorage.setItem(k, v); written++; }
    else if(v!==null && v!==undefined){ localStorage.setItem(k, JSON.stringify(v)); written++; }
  });

  document.getElementById('importModal').classList.remove('open');
  _pendingImport=null;

  const msg = skipped>0
    ? `📥 Imported ${written} record${written!==1?'s':''} · skipped ${skipped} conflict${skipped!==1?'s':''}.`
    : `📥 Imported ${written} record${written!==1?'s':''}.`;
  showToast(msg);

  // Re-render whatever view is showing.
  renderHistory();
  if(typeof renderToday==='function') renderToday();
  if(typeof renderDashboard==='function') renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
