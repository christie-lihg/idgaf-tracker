/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// THEME
//
// Three states, not two: auto / light / dark. Auto follows the OS, which
// is what most people want most of the time, but an explicit choice has to
// beat it. Someone whose phone is in light mode all day still wants this
// app dark at 2am, and that is the whole reason the dark theme exists.
//
// The actual application of the theme happens in an inline script in
// <head>, before first paint, because a deferred file here would mean a
// white flash on every load. setTheme() below is the same three lines and
// exists so runtime changes go through one path. Keep them in sync.
//
// Nothing here is a preference sync. The value lives in localStorage on
// this device, like every other thing in this app.
// ═══════════════════════════════════════════════════════════════════════

const THEME_KEY = STORE_PREFIX + 'theme';
const THEME_META = { light: '#2b1b6b', dark: '#14112A' };

function getThemePref(){
  try{
    const v = localStorage.getItem(THEME_KEY);
    return (v === 'light' || v === 'dark') ? v : 'auto';
  }catch{ return 'auto'; }
}

function prefersDark(){
  return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}

/* Resolves auto → an explicit attribute. The CSS only ever sees
   data-theme, so the dark block is written once instead of duplicated
   across a media query and an override. */
function setTheme(pref){
  const dark = pref === 'dark' || (pref === 'auto' && prefersDark());
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';

  // The browser chrome should follow the app, not sit at the light colour.
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? THEME_META.dark : THEME_META.light);

  return dark;
}

function setThemePref(pref){
  try{
    if(pref === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  }catch{ /* private mode: the theme still applies for this session */ }
  setTheme(pref);
  renderThemeButtons();
  repaintThemedCanvases();
  if(typeof showToast === 'function'){
    showToast(pref === 'dark' ? '🌙 Lights out.'
            : pref === 'light' ? '☀️ Rise and shine.'
            : '🌗 Following your phone.');
  }
}

function renderThemeButtons(){
  const pref = getThemePref();
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.setAttribute('aria-checked', String(b.dataset.themeSet === pref));
  });
}

/* Chart.js reads its colours through themeColor() at BUILD time and bakes
   them into the chart instance. A theme flip therefore leaves every chart
   painted in the old palette until something rebuilds it, which on the
   dashboard is a visibly broken-looking screen. Rebuild them. */
function repaintThemedCanvases(){
  if(typeof Chart === 'undefined') return;
  Chart.defaults.color = getComputedStyle(document.documentElement)
                           .getPropertyValue('--text2').trim() || '#666';
  Chart.defaults.borderColor = getComputedStyle(document.documentElement)
                           .getPropertyValue('--mint').trim();
  if(typeof renderDashboard === 'function'
     && document.getElementById('view-dashboard')?.classList.contains('active')){
    renderDashboard();
  }
}

function initTheme(){
  renderThemeButtons();
  repaintThemedCanvases();
  // Follow the OS live, but only while the user has not chosen for themselves.
  if(window.matchMedia){
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if(getThemePref() !== 'auto') return;
      setTheme('auto');
      repaintThemedCanvases();
    };
    if(mq.addEventListener) mq.addEventListener('change', onChange);
    else if(mq.addListener) mq.addListener(onChange);   // Safari < 14
  }
}
