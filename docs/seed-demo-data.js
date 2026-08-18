/* Demo data seeder — for screenshots, demo videos and manual testing.
 *
 * WHY THIS EXISTS
 * A fresh browser has no entries, so the Dashboard renders a "No data yet" empty
 * state. That empty state will pass a casual smoke test even on a completely broken
 * build, because nothing that could break ever runs. Seed real data before you
 * believe the dashboard works.
 *
 * HOW TO USE
 *   1. Open the app, then open DevTools → Console.
 *   2. Paste this whole file and press Enter.
 *   3. Reload the page.
 *
 * TO REMOVE IT AGAIN
 *   Object.keys(localStorage)
 *     .filter(k => /^vv_(day|period|morning)_/.test(k))
 *     .forEach(k => localStorage.removeItem(k));
 *
 * ⚠️ This OVERWRITES any real entries on the days it touches (the last 14 days).
 *    Only run it on a throwaway profile or a device with no real history.
 */
(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const rand = (n) => Math.floor(Math.random() * n);

  let days = 0;
  let events = 0;

  // 14 days of symptom events + wellness ratings
  for (let back = 13; back >= 0; back--) {
    const d = new Date();
    d.setDate(d.getDate() - back);

    const dayEvents = [];
    const count = 2 + rand(5);
    for (let i = 0; i < count; i++) {
      const t = new Date(d);
      t.setHours(7 + rand(14), rand(60));
      dayEvents.push({
        sym: rand(22),                       // index into SYMS (js/symptoms.js)
        ts: t.getTime(),
        time: t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        intensity: 1 + rand(3),
      });
      events++;
    }

    const wellness = {};
    for (let i = 0; i < 5; i++) wellness[i] = 3 + rand(6);   // index into WELLNESS_ITEMS

    localStorage.setItem(
      'vv_day_' + key(d),
      JSON.stringify({ events: dayEvents, wellness, note: '' })
    );
    days++;
  }

  // A 5-day period, starting 9 days ago
  ['light', 'medium', 'heavy', 'medium', 'light'].forEach((flow, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    localStorage.setItem('vv_period_' + key(d), JSON.stringify({ flow, note: '' }));
  });

  console.log(`Seeded ${days} days, ${events} symptom events, 5 period days. Reload the page.`);
})();
