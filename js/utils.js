// UTILS
// ═══════════════════════════════════════════════════════════════
function fmtFull(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
function fmtShort(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function dc(id){const el=document.getElementById(id);if(!el)return;const c=Chart.getChart(el);if(c)c.destroy()}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}

// ═══════════════════════════════════════════════════════════════
