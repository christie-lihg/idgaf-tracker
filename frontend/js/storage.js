/* eslint-disable no-undef, emergent/no-undef */
/* Storage keys are prefixed `idgaf_`.
 *
 * They were originally `vv_` — a prefix inherited from the single-file
 * version of this app, unrelated to anything here. Renaming storage keys
 * normally orphans existing data, so the rename ships with a migration.
 *
 * migrateLegacyKeys() is deliberately NON-DESTRUCTIVE: it copies the legacy
 * keys to `idgaf_*` and leaves the originals untouched as a backup. For a
 * health record, a migration bug that loses history is far worse than a few
 * stale keys, and entries this small cost nothing to keep. It never
 * overwrites an existing `idgaf_*` key, so re-running cannot clobber newer
 * data, and it is idempotent via a completion marker.
 *
 * It migrates ONLY the three key families this app owns. `vv_` came from an
 * unrelated project, so a blanket `vv_*` copy could pull that project's keys
 * into this app's storage if the two ever shared an origin. Enumerate what
 * you own; never migrate by prefix alone.
 *
 * Called once from js/init.js before the first render.
 */
const STORE_PREFIX  = 'idgaf_';
const LEGACY_PREFIX = 'vv_';
const MIGRATION_FLAG = 'idgaf_migrated_v1';

function migrateLegacyKeys(){
  if(localStorage.getItem(MIGRATION_FLAG)) return {migrated:0, skipped:0, alreadyDone:true};
  const OWNED = ['day_', 'morning_', 'period_'];   // this app's key families only
  const legacy=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && OWNED.some(f => k.startsWith(LEGACY_PREFIX + f))) legacy.push(k);
  }
  let migrated=0, skipped=0;
  for(const oldKey of legacy){
    const newKey = STORE_PREFIX + oldKey.slice(LEGACY_PREFIX.length);
    if(localStorage.getItem(newKey) !== null){ skipped++; continue; }  // never clobber
    localStorage.setItem(newKey, localStorage.getItem(oldKey));
    migrated++;
  }
  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  if(migrated) console.info(`[storage] migrated ${migrated} legacy vv_ keys to idgaf_ (originals kept as backup)`);
  return {migrated, skipped, alreadyDone:false};
}

// STORAGE
// ═══════════════════════════════════════════════════════════════
function dayKey(d){ return STORE_PREFIX+'day_'+(d||todayStr()) }
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
    if(k&&k.startsWith(STORE_PREFIX+'day_'))keySet.add(k.replace(STORE_PREFIX+'day_',''));
    if(k&&k.startsWith(STORE_PREFIX+'morning_'))keySet.add(k.replace(STORE_PREFIX+'morning_',''));
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
