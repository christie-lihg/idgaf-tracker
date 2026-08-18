// IMPORT HISTORICAL PERIOD DATA FROM APPLE HEALTH PDF
// ═══════════════════════════════════════════════════════════════
function importHistoricalPeriodData(){
  // Only run once — skip if period data already exists
  if(allPeriodDates().length>0)return;

  // Cycle history from Apple Health export (page 2 of PDF)
  // Format: { start, periodDays, flow per day, spottingDays }
  // Flow derived from cycle detail pages:
  // Most cycles: day1=medium, day2=light, day3=light, day4=light (where applicable)
  // Jul 2025: 2-day period, both light
  // Spotting noted on specific cycles from detail pages

  const cycles=[
    // Jul 4–Aug 2, 2025 — 2 day period, light
    {start:'2025-07-04', days:[
      {d:0,flow:'light'},{d:1,flow:'light'}
    ]},
    // Aug 3–Sep 1, 2025 — 3 day period: medium/light/light
    {start:'2025-08-03', days:[
      {d:0,flow:'medium'},{d:1,flow:'light'},{d:2,flow:'light'}
    ]},
    // Sep 2–30, 2025 — 3 day period: light/light/light; spotting day 12
    {start:'2025-09-02', days:[
      {d:0,flow:'light'},{d:1,flow:'light'},{d:2,flow:'light'},
      {d:11,flow:'spotting'}
    ]},
    // Oct 1–Dec 9, 2025 — 3 day period: light/light (2 flow days day1+2); spotting days 8,9,10,31,32
    {start:'2025-10-01', days:[
      {d:0,flow:'light'},{d:1,flow:'light'},
      {d:7,flow:'spotting'},{d:8,flow:'spotting'},{d:9,flow:'spotting'},
      {d:30,flow:'spotting'},{d:31,flow:'spotting'}
    ]},
    // Dec 10, 2025–Jan 6, 2026 — 3 day period: medium/light/light
    {start:'2025-12-10', days:[
      {d:0,flow:'medium'},{d:1,flow:'light'},{d:2,flow:'light'}
    ]},
    // Jan 7–Feb 5, 2026 — 3 day period: light/light/medium
    {start:'2026-01-07', days:[
      {d:0,flow:'light'},{d:1,flow:'light'},{d:2,flow:'medium'}
    ]},
    // Feb 6–Mar 9, 2026 — 4 day period: light/light/medium/light
    {start:'2026-02-06', days:[
      {d:0,flow:'light'},{d:1,flow:'light'},{d:2,flow:'medium'},{d:3,flow:'light'}
    ]},
    // Mar 10–Apr 20, 2026 — 3 day period: light/medium/light; spotting days 4,6,7,8,34,37,38,40,41
    {start:'2026-03-10', days:[
      {d:0,flow:'light'},{d:1,flow:'medium'},{d:2,flow:'light'},
      {d:3,flow:'spotting'},{d:5,flow:'spotting'},{d:6,flow:'spotting'},{d:7,flow:'spotting'},
      {d:33,flow:'spotting'},{d:36,flow:'spotting'},{d:37,flow:'spotting'},{d:39,flow:'spotting'},{d:40,flow:'spotting'}
    ]},
    // Apr 21–May 28, 2026 — 4 day period: light/light/medium/light
    {start:'2026-04-21', days:[
      {d:0,flow:'light'},{d:1,flow:'light'},{d:2,flow:'medium'},{d:3,flow:'light'}
    ]},
    // May 29, 2026 (current cycle, in progress) — 4 day period so far: medium/light/light + spotting day 27
    {start:'2026-05-29', days:[
      {d:0,flow:'medium'},{d:1,flow:'light'},{d:2,flow:'light'},{d:3,flow:'light'},
      {d:26,flow:'spotting'}
    ]},
  ];

  cycles.forEach(cycle=>{
    const startDate=new Date(cycle.start+'T12:00:00');
    cycle.days.forEach(({d,flow})=>{
      const date=new Date(startDate);
      date.setDate(date.getDate()+d);
      const dateStr=date.toISOString().split('T')[0];
      // Don't overwrite future dates
      if(dateStr<=todayStr()){
        savePeriodDayData(dateStr,{flow,note:'(imported from Apple Health)'});
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
