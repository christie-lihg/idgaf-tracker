/* eslint-disable no-undef, emergent/no-undef */
// INIT
// ═══════════════════════════════════════════════════════════════
migrateLegacyKeys();          // must run before anything reads storage
renderToday();
if(typeof initTreatmentForm==='function') initTreatmentForm();
if(typeof renderTriggerGrid==='function') renderTriggerGrid();
if(typeof renderReactionRow==='function') renderReactionRow();
if(typeof initCollapsibleCards==='function') initCollapsibleCards();
if(typeof maybeShowOnboarding==='function') maybeShowOnboarding();
