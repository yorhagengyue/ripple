// Backfill 14 days of synthetic daily vitals into Supabase healthlog so the
// Timeline chart has a visible "one signal led, the others followed, then
// recovered" story. Shape of the narrative:
//
//   Day -15 to -9   → stable baseline
//   Day  -8 to -5   → gradual drift (HRV drops first, then sleep, activity,
//                     HR rises to meet them)
//   Day  -4         → trough ("the watchdog flagged on April 17")
//   Day  -3 to -1   → steady recovery
//
// Day 0 = today (2026-04-22). We only write days -15 through -2 (Apr 7 – Apr 20).
// We do NOT write today or yesterday, so the MCP v_latest_per_metric view
// continues to return real Apple Watch data and get_current_vitals stays clean.
//
// Source tag: "Ripple demo · narrative" — distinct from "Apple Watch" /
// "耿越的Apple Watch" real rows, so it's honest in the healthlog and easy to
// delete if needed.

const SUPA = 'https://ubuamehrsvyrbnoxtavk.supabase.co';
const KEY  = process.env.SUPABASE_SECRET_KEY;
if (!KEY) { console.error('Missing SUPABASE_SECRET_KEY in env'); process.exit(1); }
const USER = 'tommychen030607';

const baseline = {
  heart_rate:          72,   // bpm (avg)
  hrv_sdnn:            48,   // ms
  resting_heart_rate:  62,   // bpm
  sleep_hours:         7.2,  // h
  sleep_efficiency:    0.88, // 0-1
  step_count:          8400, // steps
  active_energy:       1780, // kcal
  spo2:                97,   // %
  respiratory_rate:    15.2, // rpm
};

function phase(offset) {
  if (offset <= -9)  return { state: 'baseline', intensity: 0 };
  if (offset <= -5)  return { state: 'drift',    intensity: (-5 - offset) / 4 }; // 0 → 1
  if (offset === -4) return { state: 'trough',   intensity: 1.0 };
  return { state: 'recovery', intensity: (offset + 4) / 4 }; // 0 (day -4) → 0.75 (day -1)
}

function noise(amp) { return (Math.random() - 0.5) * 2 * amp; }

function synth(offset) {
  const { state, intensity: x } = phase(offset);

  let d_hrv=0, d_hr=0, d_rhr=0, d_slp=0, d_eff=0, d_stp=0, d_energy=0, d_spo2=0, d_resp=0;

  if (state === 'drift' || state === 'trough') {
    d_hrv    = -x * 13;
    d_hr     =  x * 5;
    d_rhr    =  x * 6;
    d_slp    = -x * 1.3;
    d_eff    = -x * 0.14;
    d_stp    = -x * 2100;
    d_energy = -x * 300;
    d_spo2   = -x * 1.3;
    d_resp   =  x * 2.1;
  } else if (state === 'recovery') {
    // Recovery amplitude shrinks as x → 1
    const remaining = 1 - x;
    d_hrv    = -remaining * 13;
    d_hr     =  remaining * 5;
    d_rhr    =  remaining * 6;
    d_slp    = -remaining * 1.3;
    d_eff    = -remaining * 0.14;
    d_stp    = -remaining * 2100;
    d_energy = -remaining * 300;
    d_spo2   = -remaining * 1.3;
    d_resp   =  remaining * 2.1;
  }

  return {
    hrv_sdnn:           Math.max(10, baseline.hrv_sdnn + d_hrv + noise(3)),
    heart_rate:         Math.max(50, baseline.heart_rate + d_hr + noise(2.5)),
    resting_heart_rate: Math.max(48, baseline.resting_heart_rate + d_rhr + noise(1.5)),
    sleep_hours:        Math.max(3,  baseline.sleep_hours + d_slp + noise(0.4)),
    sleep_efficiency:   Math.min(1, Math.max(0.5, baseline.sleep_efficiency + d_eff + noise(0.02))),
    step_count:         Math.max(0,  Math.round(baseline.step_count + d_stp + noise(500))),
    active_energy:      Math.max(0,  Math.round(baseline.active_energy + d_energy + noise(100))),
    spo2:               Math.max(90, baseline.spo2 + d_spo2 + noise(0.5)),
    respiratory_rate:   Math.max(11, baseline.respiratory_rate + d_resp + noise(0.6)),
  };
}

// Today = 2026-04-22. Backfill days offset -15 .. -2 (Apr 7 – Apr 20).
const today = new Date('2026-04-22T16:00:00Z');
const rows = [];
for (let off = -15; off <= -2; off++) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + off);
  const ts = d.toISOString();
  const vals = synth(off);
  for (const [metric, value] of Object.entries(vals)) {
    rows.push({
      user_id: USER,
      metric,
      value: +(Number(value).toFixed(3)),
      min_val: null,
      max_val: null,
      ts,
      source: 'Ripple demo · narrative',
      extra: { synthetic: true, narrative_day_offset: off, phase: phase(off).state },
      created_at: new Date().toISOString(),
    });
  }
}

console.log(`→ UPSERTing ${rows.length} synthetic rows (14 days × ${Object.keys(baseline).length} metrics)`);

const res = await fetch(`${SUPA}/rest/v1/healthlog?on_conflict=user_id,metric,ts`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    authorization: `Bearer ${KEY}`,
    'content-type': 'application/json',
    prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
});
if (!res.ok) {
  const t = await res.text();
  console.error('FAIL', res.status, t.slice(0, 400));
  process.exit(1);
}
console.log(`  → HTTP ${res.status} OK`);

// Verify counts
const ver = await fetch(`${SUPA}/rest/v1/healthlog?user_id=eq.${USER}&source=eq.Ripple%20demo%20%C2%B7%20narrative&select=count`, {
  headers: { apikey: KEY, authorization: `Bearer ${KEY}`, prefer: 'count=exact' },
});
const cr = ver.headers.get('content-range');
console.log(`  → source="Ripple demo · narrative" now in healthlog: ${cr}`);

// Sanity: make sure MCP still returns real Apple Watch for today
console.log('\n→ Verifying MCP get_current_vitals still returns REAL data, not synthetic…');
const mcp = await fetch('https://ripple-wellness.vercel.app/api/mcp', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'get_current_vitals', arguments: { user_id: USER } } }),
});
const md = await mcp.json();
const vitals = JSON.parse(md.result.content[0].text).result.vitals;
console.log(`MCP returns ${vitals.length} rows:`);
for (const v of vitals) {
  const tag = v.source.includes('narrative') ? ' ⚠ POLLUTION!' : '';
  console.log(`  ${v.ts.slice(0,19)}  ${v.metric.padEnd(22)} v=${v.value}  src=${v.source}${tag}`);
}
