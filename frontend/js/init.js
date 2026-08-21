/* eslint-disable no-undef, emergent/no-undef */
// INIT
// ═══════════════════════════════════════════════════════════════
migrateLegacyKeys();          // must run before anything reads storage
importHistoricalPeriodData();
renderToday();
