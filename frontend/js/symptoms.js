/* eslint-disable no-undef, emergent/no-undef */
// ═══════════════════════════════════════════════════════════════
// SYMPTOM DEFINITIONS
// ═══════════════════════════════════════════════════════════════
const SYMS = [
  {icon:'🔥',label:'Hot flash',group:'Vasomotor'},
  {icon:'💓',label:'Heart racing',group:'Anxiety'},
  {icon:'😰',label:'Anxiety / panic',group:'Anxiety'},
  {icon:'🧠',label:'Brain fog',group:'Cognitive'},
  {icon:'🎯',label:'Difficulty concentrating',group:'Cognitive'},
  {icon:'😢',label:'Mood low / crying',group:'Mood'},
  {icon:'😤',label:'Irritability',group:'Mood'},
  {icon:'😟',label:'Feeling depressed',group:'Mood'},
  {icon:'😩',label:'Fatigue',group:'Physical'},
  {icon:'🤕',label:'Headache',group:'Physical'},
  {icon:'🦴',label:'Joint / muscle pain',group:'Physical'},
  {icon:'😵',label:'Dizzy / faint',group:'Physical'},
  {icon:'🌡',label:'Pressure / tightness',group:'Physical'},
  {icon:'😮‍💨',label:'Breathing difficulty',group:'Physical'},
  {icon:'🥶',label:'Tingling / numbness',group:'Physical'},
  {icon:'💗',label:'Low libido',group:'Sexual'},
  {icon:'🌿',label:'Vaginal dryness',group:'Sexual'},
  {icon:'🚽',label:'Urinary urgency',group:'Urinary'},
  {icon:'👂',label:'Itchy ears',group:'Physical'},
  {icon:'🫧',label:'Allergic reaction',group:'Physical'},
  {icon:'🫃',label:'Bloating',group:'Physical'},
  {icon:'🫸',label:'Swollen hands / feet',group:'Physical'},
];

// ─────────────────────────────────────────────────────────────
// WELLNESS_ITEMS is keyed by ARRAY POSITION in stored day.wellness
// objects (e.g. `wellness: { "0": 7, "1": 5, ... }`). NEVER insert
// or reorder — historical entries would silently relabel. APPEND ONLY.
//
// `clinicalLabel` is used ONLY for clinician-facing output (weekly
// summary export, printed summaries). The playful `label` is app UI.
// One value stored, two labels rendered — see docs/ARCHITECTURE.md.
// ─────────────────────────────────────────────────────────────
const WELLNESS_ITEMS = [
  {label:'Energy',              icon:'🔆', clinicalLabel:'Energy'},
  {label:'Mood',                icon:'💭', clinicalLabel:'Mood'},
  {label:'Sleep Quality',       icon:'😴', clinicalLabel:'Sleep quality'},
  {label:'Brain Clarity',       icon:'🧠', clinicalLabel:'Brain clarity'},
  {label:'Hot Flash Severity',  icon:'🔥', clinicalLabel:'Hot flash severity'},
  {label:'Fucks left to give',  icon:'🫠', clinicalLabel:'Capacity (self-rated 0–10)', prompt:'How many did you have left today?'},
];

// ═══════════════════════════════════════════════════════════════
