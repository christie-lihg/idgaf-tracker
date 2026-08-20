// NAV
// ═══════════════════════════════════════════════════════════════
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  const tabs=['today','dashboard','period','history'];
  document.querySelectorAll('.nav-tab')[tabs.indexOf(name)].classList.add('active');
  if(name==='dashboard')renderDashboard();
  if(name==='history')renderHistory();
  if(name==='today')renderToday();
  if(name==='period')renderPeriodView();
}

// ═══════════════════════════════════════════════════════════════
