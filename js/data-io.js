// DATA I/O — JSON export & import for every `idgaf_*` key in localStorage.
// ═══════════════════════════════════════════════════════════════════════
// Local-only by design. Nothing here touches the network. The exported
// file is a portable backup the user can move between devices themselves.
//
// The schema is versioned so future imports can be migrated. Bump
// DATA_SCHEMA_VERSION whenever the shape of exported records changes.
// ═══════════════════════════════════════════════════════════════════════

const DATA_SCHEMA_VERSION = 1;

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
    proceedWithImport(payload);
  };
  reader.readAsText(file);
}

/* Count what the import would ADD versus OVERWRITE, restricted to day-level
 * entries (idgaf_day_*, idgaf_morning_*, idgaf_period_*). Non-day keys
 * (migration flags, etc.) are still written but not counted in the confirm
 * message — the user thinks about their data in days, not internal keys. */
function summarizeImport(incoming){
  const DAY_FAMILIES=[STORE_PREFIX+'day_', STORE_PREFIX+'morning_', STORE_PREFIX+'period_'];
  const incomingDays=new Set();
  const existingDays=new Set();
  Object.keys(incoming).forEach(k=>{
    const fam=DAY_FAMILIES.find(f=>k.startsWith(f));
    if(fam) incomingDays.add(k.slice(fam.length));
  });
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    const fam=DAY_FAMILIES.find(f=>k&&k.startsWith(f));
    if(fam) existingDays.add(k.slice(fam.length));
  }
  let toAdd=0, toOverwrite=0;
  incomingDays.forEach(d=>{ if(existingDays.has(d)) toOverwrite++; else toAdd++; });
  return {toAdd, toOverwrite, totalKeys:Object.keys(incoming).length};
}

function proceedWithImport(payload){
  const incoming=payload.data;
  // Only touch keys under this app's prefix, even if a mangled export
  // includes unrelated keys — never write foreign keys into storage.
  const filtered={};
  Object.keys(incoming).forEach(k=>{ if(k.startsWith(STORE_PREFIX)) filtered[k]=incoming[k]; });
  if(Object.keys(filtered).length===0){
    alert("That file has no idgaf_* records to import.");
    return;
  }
  const {toAdd, toOverwrite, totalKeys}=summarizeImport(filtered);

  const parts=[];
  parts.push(`Import ${totalKeys} record${totalKeys!==1?'s':''} from this file?`);
  parts.push('');
  parts.push(`• Days to ADD: ${toAdd}`);
  parts.push(`• Days that will OVERWRITE existing entries: ${toOverwrite}`);
  parts.push('');
  parts.push(toOverwrite>0
    ? 'Overwrites cannot be undone. Continue?'
    : 'Continue?');

  if(!confirm(parts.join('\n'))) return;

  let written=0;
  Object.keys(filtered).forEach(k=>{
    const v=filtered[k];
    if(typeof v==='string'){ localStorage.setItem(k, v); written++; }
    else if(v!==null && v!==undefined){ localStorage.setItem(k, JSON.stringify(v)); written++; }
  });

  showToast(`📥 Imported ${written} record${written!==1?'s':''}.`);
  // Re-render whatever view is showing
  renderHistory();
  if(typeof renderToday==='function') renderToday();
  if(typeof renderDashboard==='function') renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
