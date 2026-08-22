/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// APPLE HEALTH IMPORT — menstrual flow history
//
// Replaces a previous version of this file that contained one specific
// person's cycle history hardcoded into the source, auto-loaded on first
// run. That shipped their real menstrual data to every user of the app
// and, since the repo is public, to anyone reading it. Never put real
// health data in source. If you need sample data, generate it.
//
// HOW A USER GETS THE FILE
//   iPhone → Health → tap your photo (top right) → Export All Health Data
//   → produces export.zip → unzip it → export.xml is inside.
//
// WHAT WE READ
//   <Record type="HKCategoryTypeIdentifierMenstrualFlow"
//           startDate="2025-07-04 08:00:00 -0500"
//           value="HKCategoryValueMenstrualFlowLight" />
//   and HKCategoryTypeIdentifierIntermenstrualBleeding for spotting.
//
// WHY IT IS PARSED IN CHUNKS
//   export.xml routinely runs to hundreds of megabytes because it holds
//   every step count and heart-rate sample ever recorded. Reading it into
//   one string can hang or crash the tab. We stream it through in slices
//   and keep only the menstrual records, so memory stays flat regardless
//   of file size.
//
// The file never leaves the device — it is read locally via the File API.
// Nothing here makes a network request.
// ═══════════════════════════════════════════════════════════════════════

const HK_FLOW_MAP = {
  'HKCategoryValueMenstrualFlowLight':  'light',
  'HKCategoryValueMenstrualFlowMedium': 'medium',
  'HKCategoryValueMenstrualFlowHeavy':  'heavy',
  // "Unspecified" means flow was recorded without a level. Treat as light
  // rather than dropping it — the DAY is the signal cycle stats need.
  'HKCategoryValueMenstrualFlowUnspecified': 'light',
  // "None" is an explicit not-bleeding marker. Skip it entirely.
  'HKCategoryValueMenstrualFlowNone': null,
};

const CHUNK_BYTES = 4 * 1024 * 1024;   // 4MB slices
let _healthParsed = null;              // holds parsed results between preview and confirm

function triggerHealthImport(){
  const input = document.getElementById('healthFile');
  if(input){ input.value = ''; input.click(); }
}

async function handleHealthFile(evt){
  const file = evt.target.files && evt.target.files[0];
  if(!file) return;

  if(/\.zip$/i.test(file.name)){
    showToast('Unzip it first — we need export.xml');
    healthStatus(`<b>That's the zip.</b> Unzip <code>${escHtml(file.name)}</code> and pick the
      <code>export.xml</code> inside it.`);
    return;
  }

  healthStatus(`Reading ${escHtml(file.name)} (${(file.size/1048576).toFixed(0)}MB)…`);
  try{
    const found = await scanHealthExport(file, pct => healthStatus(`Reading… ${pct}%`));
    _healthParsed = found;
    previewHealthImport(found, file.name);
  }catch(err){
    console.warn('[health-import]', err);
    healthStatus(`<b>Could not read that file.</b> It should be the <code>export.xml</code>
      from inside your Apple Health export zip.`);
  }
}

/* Slice through the file, matching menstrual records as we go.
 * Slices overlap by OVERLAP bytes so a record split across a boundary is
 * still matched exactly once (dedupe is by date+type below). */
async function scanHealthExport(file, onProgress){
  const OVERLAP = 4096;
  // Match the whole <Record ...> tag, then pull attributes out of it
  // individually. A single regex trying to capture type + startDate +
  // value in order is fragile: attribute order is not guaranteed, and
  // making `value` optional lets the match succeed without ever capturing
  // it — which silently drops every flow record while still "working".
  const tagRx = /<Record\b[^>]*>/g;
  const attr = (tag, name) => {
    const m = tag.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : null;
  };

  const seen = new Map();     // date -> flow
  let offset = 0;
  while(offset < file.size){
    const end = Math.min(offset + CHUNK_BYTES, file.size);
    const text = await file.slice(offset, Math.min(end + OVERLAP, file.size)).text();
    let m;
    tagRx.lastIndex = 0;
    while((m = tagRx.exec(text)) !== null){
      const tag  = m[0];
      const type = attr(tag, 'type');
      if(type !== 'HKCategoryTypeIdentifierMenstrualFlow' &&
         type !== 'HKCategoryTypeIdentifierIntermenstrualBleeding') continue;
      const startDate = attr(tag, 'startDate');
      if(!startDate) continue;
      const date = startDate.slice(0, 10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const value = attr(tag, 'value');

      let flow;
      if(type === 'HKCategoryTypeIdentifierIntermenstrualBleeding') flow = 'spotting';
      else {
        flow = HK_FLOW_MAP[value];
        if(flow === null || flow === undefined) continue;
      }
      // Real flow beats spotting if both were logged on one day.
      const prev = seen.get(date);
      if(prev && prev !== 'spotting') continue;
      seen.set(date, flow);
    }
    offset = end;
    if(onProgress) onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
    await new Promise(r => setTimeout(r, 0));   // let the UI breathe
  }
  return [...seen.entries()]
    .map(([date, flow]) => ({date, flow}))
    .sort((a,b) => a.date.localeCompare(b.date));
}

function previewHealthImport(found, filename){
  if(!found.length){
    healthStatus(`<b>No period data found in ${escHtml(filename)}.</b>
      That file parsed fine, it just has no menstrual records — check the export
      came from the Health app on a phone where you tracked your cycle.`);
    return;
  }
  const today = todayStr();
  const usable = found.filter(f => f.date <= today);
  const existing = usable.filter(f => loadPeriodDay(f.date)).length;
  const fresh = usable.length - existing;
  const counts = usable.reduce((a,f) => (a[f.flow] = (a[f.flow]||0)+1, a), {});

  healthStatus(`
    <div class="hi-preview">
      <b>Found ${usable.length} logged day${usable.length!==1?'s':''}</b>
      from ${fmtFull(usable[0].date)} to ${fmtFull(usable[usable.length-1].date)}.
      <div class="hi-breakdown">${
        Object.entries(counts).map(([k,v]) => `${v} ${k}`).join(' · ')
      }</div>
      <div class="hi-warn">${fresh} new day${fresh!==1?'s':''} will be added.${
        existing ? ` ${existing} day${existing!==1?'s':''} you've already logged will be left alone.` : ''
      }</div>
      <button class="btn btn-primary" onclick="confirmHealthImport()">Import ${fresh} day${fresh!==1?'s':''}</button>
      <button class="btn btn-ghost" onclick="cancelHealthImport()">Cancel</button>
    </div>`);
}

function confirmHealthImport(){
  if(!_healthParsed) return;
  const today = todayStr();
  let added = 0;
  for(const {date, flow} of _healthParsed){
    if(date > today) continue;
    if(loadPeriodDay(date)) continue;          // never overwrite what the user logged
    savePeriodDayData(date, {flow, note:'(from Apple Health)'});
    added++;
  }
  _healthParsed = null;
  healthStatus(`<b>Imported ${added} day${added!==1?'s':''}.</b> Your cycle stats have been recalculated.`);
  if(typeof renderPeriodView === 'function') renderPeriodView();
  showToast(`🩸 ${added} days in. Word.`);
}

function cancelHealthImport(){
  _healthParsed = null;
  healthStatus('Cancelled. Nothing was changed.');
}

function healthStatus(html){
  const el = document.getElementById('healthImportStatus');
  if(el) el.innerHTML = html;
}
