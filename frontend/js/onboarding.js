/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════════════
// FIRST-RUN ONBOARDING
//
// A cold visitor currently lands on a dashboard of empty states with no
// idea what the app is, what it's for, or that nothing they type leaves
// their device. That last point is the entire product and it was being
// communicated nowhere in the UI.
//
// Three slides, shown once, only when there is genuinely no data.
//
// Deliberate choices:
//   - Shows ONLY on a truly empty profile. Someone returning to a device
//     with history never sees it. The check is "any idgaf_ data key",
//     not a separate seen-flag alone, so a cleared flag can't re-nag a
//     user who has months of logs.
//   - Skippable from slide one. An onboarding you cannot escape is worse
//     than none, and someone who arrived from a link may just want to
//     look around.
//   - Sets the flag when DISMISSED, however it's dismissed. Skipping
//     counts as seeing it; nobody gets it twice.
//   - No data is written by the flow itself beyond that flag.
// ═══════════════════════════════════════════════════════════════════════

const ONBOARD_FLAG = STORE_PREFIX + 'onboarded_v1';

const ONBOARD_SLIDES = [
  {
    icon: '🔥',
    title: 'Tap it when it hits',
    body: 'Hot flash at 2am? Brain fog in a meeting? One tap logs it with the time. ' +
          'No forms, no essays — the whole point is that it takes a second, ' +
          'because you are already having a day.',
  },
  {
    icon: '🔒',
    title: 'Nothing leaves this device',
    body: 'There is no account, no cloud and no server. Every entry lives in this ' +
          'browser, on this phone. We could not read your data if we wanted to — ' +
          'there is nowhere for it to go.',
  },
  {
    icon: '🩺',
    title: 'Then hand your doctor the proof',
    body: 'One tap turns weeks of logs into a plain clinical summary — top symptoms ' +
          'with counts, averages, your own notes. "I have had a rough few months" ' +
          'becomes something they can act on.',
  },
];

let _onboardIdx = 0;

/* True only when this profile has no tracker DATA.
 *
 * Note it enumerates the data families rather than matching the prefix.
 * The app writes its own bookkeeping keys during boot — `idgaf_migrated_v1`
 * from migrateLegacyKeys() lands before this ever runs — so a prefix test
 * makes every genuine first-time visitor look like a returning user, and
 * the onboarding silently never shows. Same rule as the storage migration:
 * enumerate what you mean, never trust a prefix. */
const ONBOARD_DATA_KEYS = ['day_', 'morning_', 'period_', 'treatments', 'custom_ratings'];

function isFirstRun(){
  if(localStorage.getItem(ONBOARD_FLAG)) return false;
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(!k || !k.startsWith(STORE_PREFIX)) continue;
    const rest = k.slice(STORE_PREFIX.length);
    if(ONBOARD_DATA_KEYS.some(f => rest.startsWith(f))) return false;
  }
  return true;
}

function maybeShowOnboarding(){
  if(!isFirstRun()) return;
  _onboardIdx = 0;
  renderOnboarding();
  const el = document.getElementById('onboardOverlay');
  if(el) el.classList.add('on');
}

function renderOnboarding(){
  const el = document.getElementById('onboardBody');
  if(!el) return;
  const s = ONBOARD_SLIDES[_onboardIdx];
  const last = _onboardIdx === ONBOARD_SLIDES.length - 1;
  el.innerHTML = `
    <div class="ob-icon">${s.icon}</div>
    <h3 class="ob-title">${escHtml(s.title)}</h3>
    <p class="ob-body">${escHtml(s.body)}</p>
    <div class="ob-dots">${ONBOARD_SLIDES.map((_,i)=>
      `<span class="ob-dot${i===_onboardIdx?' on':''}"></span>`).join('')}</div>
    <div class="ob-actions">
      <button class="btn btn-ghost" onclick="dismissOnboarding()"
              data-testid="onboard-skip">${last ? 'Close' : 'Skip'}</button>
      ${last
        ? `<button class="btn btn-primary" onclick="dismissOnboarding()"
                   data-testid="onboard-done">Let's go</button>`
        : `<button class="btn btn-primary" onclick="nextOnboarding()"
                   data-testid="onboard-next">Next</button>`}
    </div>`;
}

function nextOnboarding(){
  if(_onboardIdx < ONBOARD_SLIDES.length - 1){ _onboardIdx++; renderOnboarding(); }
  else dismissOnboarding();
}

function dismissOnboarding(){
  localStorage.setItem(ONBOARD_FLAG, new Date().toISOString());
  const el = document.getElementById('onboardOverlay');
  if(el) el.classList.remove('on');
}

/* Lets someone re-read it from the Data section without wiping anything. */
function replayOnboarding(){
  _onboardIdx = 0;
  renderOnboarding();
  const el = document.getElementById('onboardOverlay');
  if(el) el.classList.add('on');
}
