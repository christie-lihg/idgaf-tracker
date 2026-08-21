/* eslint-disable no-undef, emergent/no-undef */
// CUSTOM RATINGS
// ═══════════════════════════════════════════════════════════════════════
// User-defined 0–10 daily ratings alongside the six built-in WELLNESS_ITEMS.
//
// Why a separate file: WELLNESS_ITEMS is keyed by ARRAY POSITION in stored
// entries and is append-only forever (see docs/ARCHITECTURE.md). We CANNOT
// put user-defined ratings into WELLNESS_ITEMS or we'd hand a footgun to
// every future contributor. Instead we store them out-of-band, keyed by a
// stable ID, and merge them into the UI at render time.
//
// Storage shape:
//   idgaf_custom_ratings         → JSON array of {id, label, icon, created}
//   day.customWellness = {[id]: value}  (extension of the existing day log)
//
// Everything stays under STORE_PREFIX so JSON export/import handles it for
// free. Nothing here goes over the network.
// ═══════════════════════════════════════════════════════════════════════

const CUSTOM_RATINGS_KEY = STORE_PREFIX + 'custom_ratings';

function loadCustomRatings(){
  try{
    const raw=localStorage.getItem(CUSTOM_RATINGS_KEY);
    const arr=raw?JSON.parse(raw):[];
    return Array.isArray(arr)?arr:[];
  }catch{ return []; }
}

function saveCustomRatings(list){
  localStorage.setItem(CUSTOM_RATINGS_KEY, JSON.stringify(list));
}

function newCustomRatingId(){
  // Short random id — collision-resistant enough for a single-device store.
  return 'cr_' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
}

/* Render sliders for every stored custom rating into #customRatingsContainer,
 * hydrated from the given day log. Called from renderToday(). */
function renderCustomRatings(dayLog){
  const container=document.getElementById('customRatingsContainer');
  if(!container) return;
  const ratings=loadCustomRatings();
  if(ratings.length===0){ container.innerHTML=''; return; }
  const cw=(dayLog && dayLog.customWellness) || {};
  container.innerHTML=ratings.map(r=>{
    const val=cw[r.id]!==undefined?cw[r.id]:5;
    const icon=r.icon||'⭐';
    const labelHtml=escapeText(r.label||'Rating');
    return `<div class="sli-row" data-cr-id="${r.id}">
      <div class="sli-lbl">
        ${icon} ${labelHtml}
        <button class="sli-remove" data-testid="remove-custom-rating-${r.id}"
          title="Remove this custom rating" onclick="removeCustomRating('${r.id}')">×</button>
      </div>
      <input type="range" class="sli" id="cr_${r.id}" min="0" max="10" value="${val}"
        oninput="document.getElementById('crv_${r.id}').textContent=this.value">
      <div class="sli-val" id="crv_${r.id}">${val}</div>
    </div>`;
  }).join('');
}

/* Persist every custom-rating slider's value onto the given day log. Called
 * from saveWellness() (today.js) and savePastDay() (past-day-modal.js). */
function collectCustomRatingsInto(dayLog, prefix){
  const p=prefix||'cr_';
  const ratings=loadCustomRatings();
  if(ratings.length===0) return;
  dayLog.customWellness = dayLog.customWellness || {};
  ratings.forEach(r=>{
    const sl=document.getElementById(p+r.id);
    if(sl) dayLog.customWellness[r.id] = +sl.value;
  });
}

/* Hydrate a past-day-modal's sliders. Same shape as renderCustomRatings but
 * for the modal container + prefixed slider ids so we can host both editors
 * on the same page. */
function renderCustomRatingsInModal(dayLog){
  const container=document.getElementById('pastCustomRatings');
  if(!container) return;
  const ratings=loadCustomRatings();
  if(ratings.length===0){ container.innerHTML=''; return; }
  const cw=(dayLog && dayLog.customWellness) || {};
  container.innerHTML=ratings.map(r=>{
    const val=cw[r.id]!==undefined?cw[r.id]:5;
    const icon=r.icon||'⭐';
    return `<div class="sli-row">
      <div class="sli-lbl">${icon} ${escapeText(r.label||'Rating')}</div>
      <input type="range" class="sli" id="pcr_${r.id}" min="0" max="10" value="${val}"
        oninput="document.getElementById('pcrv_${r.id}').textContent=this.value">
      <div class="sli-val" id="pcrv_${r.id}">${val}</div>
    </div>`;
  }).join('');
}

/* ── Add-rating modal ─────────────────────────────────────────────── */

function openAddCustomRating(){
  document.getElementById('addRatingLabel').value='';
  document.getElementById('addRatingIcon').value='';
  document.getElementById('addRatingModal').classList.add('open');
  setTimeout(()=>document.getElementById('addRatingLabel').focus(), 50);
}

function closeAddCustomRating(){
  document.getElementById('addRatingModal').classList.remove('open');
}

function saveNewCustomRating(){
  const labelEl=document.getElementById('addRatingLabel');
  const iconEl=document.getElementById('addRatingIcon');
  const label=(labelEl.value||'').trim().slice(0,30);
  const icon=(iconEl.value||'').trim().slice(0,4) || '⭐';
  if(!label){ labelEl.focus(); showToast('Give it a name first.'); return; }

  const list=loadCustomRatings();
  if(list.length >= 6){ showToast('Six custom ratings max — remove one first.'); return; }
  if(list.some(r=>r.label.toLowerCase()===label.toLowerCase())){
    showToast('You already have a rating with that name.'); return;
  }
  list.push({id:newCustomRatingId(), label, icon, created:new Date().toISOString()});
  saveCustomRatings(list);
  closeAddCustomRating();

  // Re-render the wellness card so the new slider appears immediately.
  const today=todayStr();
  renderCustomRatings(loadDay(today));
  showToast(`Added "${label}". Rate it any time.`);
}

function removeCustomRating(id){
  const list=loadCustomRatings();
  const r=list.find(x=>x.id===id);
  if(!r) return;
  if(!confirm(`Remove "${r.label}"? Historical values stay in your day logs.`)) return;

  saveCustomRatings(list.filter(x=>x.id!==id));
  // Do NOT delete historical customWellness values — they stay in the export
  // so a user who re-adds the rating later can see their old ratings.
  const today=todayStr();
  renderCustomRatings(loadDay(today));
  showToast(`Removed "${r.label}".`);
}

function escapeText(s){
  const div=document.createElement('div');
  div.textContent=String(s);
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
