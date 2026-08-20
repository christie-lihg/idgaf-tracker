// INIT
// ═══════════════════════════════════════════════════════════════
migrateLegacyKeys();          // must run before anything reads storage
importHistoricalPeriodData();
renderToday();
