// Inject 4 days of realistic post-intervention recovery data (4/18–4/21 SGT)
// and refresh the baseline rows so the dashboard feels live.
//
// Run from project root:   node scripts/inject-recovery-data.mjs

const SUPA = process.env.VITE_SUPABASE_URL || 'https://ubuamehrsvyrbnoxtavk.supabase.co';
const KEY  = process.env.SUPABASE_SECRET_KEY ;
const USER = 'tommychen030607';
const SOURCE = 'YoRHa';

// Each day ends at T16:00:00Z (= SGT 00:00 the NEXT day), matching existing seed cadence.
// 4/18 Sat / 4/19 Sun / 4/20 Mon / 4/21 Tue — gentle recovery arc with weekday rhythm.
const DAYS = ['2026-04-18', '2026-04-19', '2026-04-20', '2026-04-21'];
const TS_AT = (d) => `${d}T16:00:00+00:00`;

// [4/18, 4/19, 4/20, 4/21]
const SAMPLES = {
  heart_rate:        { vals: [81.2, 78.6, 76.4, 74.8], mins: [62,   58,   60,   57],   maxs: [112,  98,   104,  95]   },
  hrv_sdnn:          { vals: [40.8, 42.4, 41.6, 43.1], mins: [22,   26,   24,   27],   maxs: [61,   63,   60,   65]   },
  resting_heart_rate:{ vals: [68.1, 66.2, 65.3, 64.0], mins: [54.5, 53.1, 52.8, 51.9], maxs: [81.8, 79.5, 78.6, 77.2] },
  sleep_hours:       { vals: [7.0,  7.9,  6.8,  7.3],  mins: [null,null,null,null],    maxs: [null,null,null,null]    },
  sleep_efficiency:  { vals: [0.79, 0.86, 0.80, 0.85], mins: [null,null,null,null],    maxs: [null,null,null,null]    },
  step_count:        { vals: [6842, 5318, 9134, 8720], mins: [0,    0,    0,    0],    maxs: [8914, 7205, 11280,10650]},
  active_energy:     { vals: [1542.3, 1289.7, 1895.4, 1768.2], mins: [1228, 1025, 1516, 1413], maxs: [1840, 1538, 2262, 2105] },
  spo2:              { vals: [94.3, 95.2, 94.8, 95.6], mins: [92,   93,   93,   94],   maxs: [96,   97,   96,   97]   },
  respiratory_rate:  { vals: [17.0, 15.9, 16.2, 15.7], mins: [13.6, 12.7, 13.0, 12.6], maxs: [20.4, 19.1, 19.4, 18.8] },
};

const ALIASES = {
  heart_rate: ['hr', 'heart rate'],
  hrv_sdnn: ['hrv'],
  resting_heart_rate: ['rhr'],
  sleep_hours: ['sleep'],
  sleep_efficiency: ['sleep_quality'],
  step_count: ['steps'],
  active_energy: ['energy'],
  spo2: ['oxygen'],
  respiratory_rate: ['respiration'],
};

const BASELINE_MEAN = {
  heart_rate: 71.81, hrv_sdnn: 44.86, resting_heart_rate: 61.81,
  sleep_hours: 7.26, sleep_efficiency: 0.88,
  step_count: 8396.29, active_energy: 1785.36,
  spo2: 97.43, respiratory_rate: 15.39,
};
const BASELINE_STD = {
  heart_rate: 1.17, hrv_sdnn: 1.75, resting_heart_rate: 0.75,
  sleep_hours: 0.18, sleep_efficiency: 0.02,
  step_count: 329.49, active_energy: 32.72,
  spo2: 0.2, respiratory_rate: 0.32,
};

// Existing 4/15–4/17 values (already in healthlog) for baseline window recomputation
const EXISTING = {
  heart_rate:        [76.7, 78.5, 82.4],
  hrv_sdnn:          [41.2, 39.9, 40.3],
  resting_heart_rate:[65.9, 66.7, 68.3],
  sleep_hours:       [6.0,  6.3,  6.7],
  sleep_efficiency:  [0.81, 0.76, 0.75],
  step_count:        [7956, 7082, 8062],
  active_energy:     [1764.8, 1460.9, 1678.2],
  spo2:              [94.5, 94.0, 93.4],
  respiratory_rate:  [16.8, 16.2, 17.4],
};

const H = {
  apikey: KEY,
  authorization: `Bearer ${KEY}`,
  'content-type': 'application/json',
};

async function sbPost(path, rows, headersExtra = {}) {
  const r = await fetch(`${SUPA}${path}`, {
    method: 'POST',
    headers: { ...H, prefer: 'return=representation', ...headersExtra },
    body: JSON.stringify(rows),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : [];
}

async function sbDelete(path) {
  const r = await fetch(`${SUPA}${path}`, { method: 'DELETE', headers: H });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${txt.slice(0, 200)}`);
}

// ---------- 1. Delete any stale rows I might be re-inserting (safety) ----------
console.log('→ cleaning 4/18-4/21 healthlog rows if any…');
const allMetricNames = new Set();
for (const canon of Object.keys(SAMPLES)) {
  allMetricNames.add(canon);
  for (const a of (ALIASES[canon] || [])) allMetricNames.add(a);
}
const metricList = [...allMetricNames].map(m => `"${m}"`).join(',');
await sbDelete(`/rest/v1/healthlog?user_id=eq.${USER}&metric=in.(${encodeURIComponent(metricList)})&ts=gte.${encodeURIComponent('2026-04-18T00:00:00+00:00')}`);
console.log('  cleaned');

// ---------- 2. Insert new healthlog rows (canonical + aliases) ----------
const rows = [];
for (const [canon, spec] of Object.entries(SAMPLES)) {
  const names = [canon, ...(ALIASES[canon] || [])];
  for (let i = 0; i < DAYS.length; i++) {
    const base = {
      user_id: USER,
      ts: TS_AT(DAYS[i]),
      value: spec.vals[i],
      min_val: spec.mins[i],
      max_val: spec.maxs[i],
      extra: null,
      source: SOURCE,
      created_at: new Date().toISOString(),
    };
    for (const name of names) rows.push({ ...base, metric: name });
  }
}
console.log(`→ inserting ${rows.length} healthlog rows…`);
await sbPost('/rest/v1/healthlog', rows);
console.log('  inserted');

// ---------- 3. Recompute and UPSERT baseline rows ----------
function statusOf(absPct) {
  if (absPct < 5) return 'normal';
  if (absPct < 10) return 'watch';
  return 'alert';
}

const baselineRows = [];
for (const canon of Object.keys(SAMPLES)) {
  const newVals = SAMPLES[canon].vals;                       // 4/18-4/21
  const oldVals = EXISTING[canon];                           // 4/15-4/17
  const window7 = [...oldVals, ...newVals];                  // 7 values, last 7d
  const last7d  = window7.reduce((a, b) => a + b, 0) / 7;
  const base    = BASELINE_MEAN[canon];
  const dev     = last7d - base;
  const pct     = +(100 * dev / base).toFixed(1);
  const stat    = statusOf(Math.abs(pct));
  const round   = (v, d = 2) => +v.toFixed(d);
  const meta = {
    user_id: USER,
    baseline_mean: round(base, 2),
    baseline_std:  round(BASELINE_STD[canon], 2),
    last_7d_mean:  round(last7d, canon === 'step_count' ? 2 : 2),
    deviation:     round(dev, 2),
    deviation_pct: pct,
    status:        stat,
    updated_at:    new Date().toISOString(),
  };
  const names = [canon, ...(ALIASES[canon] || [])];
  for (const name of names) baselineRows.push({ ...meta, metric: name });
}

// Delete existing baseline rows for these metrics, then re-insert (simpler than upsert w/o unique ctx)
console.log(`→ refreshing ${baselineRows.length} baseline rows…`);
await sbDelete(`/rest/v1/baseline?user_id=eq.${USER}`);
await sbPost('/rest/v1/baseline', baselineRows);
console.log('  refreshed');

// ---------- 4. Sanity print ----------
console.log('\n=== new last_7d means ===');
const canonBaselines = baselineRows.filter(r => Object.keys(SAMPLES).includes(r.metric));
canonBaselines.sort((a,b) => a.metric.localeCompare(b.metric));
for (const r of canonBaselines) {
  const sign = r.deviation_pct >= 0 ? '+' : '';
  console.log(`  ${r.metric.padEnd(20)} last7d=${String(r.last_7d_mean).padStart(8)}  ${sign}${r.deviation_pct}%  ${r.status}`);
}

console.log('\n✓ done');
