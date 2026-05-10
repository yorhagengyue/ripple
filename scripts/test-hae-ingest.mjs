// Test the /api/ingest/hae endpoint with a realistic HAE-format payload
// (heart_rate + hrv + spo2 + step_count + sleep).
// Verifies rows land in Supabase with source != 'YoRHa'.

const BASE = process.env.BASE || 'https://ripple-wellness.vercel.app';
const SUPA = 'https://ubuamehrsvyrbnoxtavk.supabase.co';
const KEY  = process.env.SUPABASE_SECRET_KEY;
if (!KEY) { console.error('Missing SUPABASE_SECRET_KEY in env'); process.exit(1); }

const now = new Date();
const fiveMinAgo = new Date(Date.now() - 5 * 60000);
const tenMinAgo  = new Date(Date.now() - 10 * 60000);

const payload = {
  Data: {
    Metrics: [
      {
        Name: 'heart_rate',
        Units: 'count/min',
        Data: [
          { Avg: 78, Min: 72, Max: 94, Date: tenMinAgo.toISOString(),  Source: 'Apple Watch' },
          { Avg: 81, Min: 76, Max: 102,Date: fiveMinAgo.toISOString(), Source: 'Apple Watch' },
          { Avg: 76, Min: 70, Max: 88, Date: now.toISOString(),        Source: 'Apple Watch' },
        ],
      },
      {
        Name: 'heart_rate_variability',
        Units: 'ms',
        Data: [
          { Qty: 41.4, Date: tenMinAgo.toISOString(),  Source: 'Apple Watch' },
          { Qty: 43.1, Date: now.toISOString(),        Source: 'Apple Watch' },
        ],
      },
      {
        Name: 'resting_heart_rate',
        Units: 'count/min',
        Data: [ { Avg: 63, Min: 58, Max: 71, Date: now.toISOString(), Source: 'Apple Watch' } ],
      },
      {
        Name: 'step_count',
        Units: 'count',
        Data: [ { Qty: 9420, Date: now.toISOString(), Source: 'iPhone' } ],
      },
      {
        Name: 'blood_oxygen_saturation',
        Units: '%',
        Data: [ { Avg: 96, Min: 94, Max: 98, Date: now.toISOString(), Source: 'Apple Watch' } ],
      },
      {
        Name: 'respiratory_rate',
        Units: 'breaths/min',
        Data: [ { Avg: 15.4, Min: 13, Max: 18, Date: now.toISOString(), Source: 'Apple Watch' } ],
      },
      {
        Name: 'sleep_analysis',
        Units: 'hr',
        Data: [ { Asleep: 7.35, Date: now.toISOString(), Source: 'Apple Watch' } ],
      },
      {
        Name: 'active_energy',
        Units: 'kcal',
        Data: [ { Qty: 1912, Date: now.toISOString(), Source: 'Apple Watch' } ],
      },
    ],
  },
};

console.log('→ POST', BASE + '/api/ingest/hae');
const r = await fetch(BASE + '/api/ingest/hae', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
const body = await r.text();
console.log('HTTP', r.status);
console.log(body);

// Verify in Supabase
console.log('\n→ Checking Supabase for new rows…');
const res = await fetch(SUPA + `/rest/v1/healthlog?user_id=eq.tommychen030607&source=neq.YoRHa&select=metric,value,source,ts&order=created_at.desc&limit=15`, {
  headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
});
const rows = await res.json();
console.log(`${rows.length} rows with source != 'YoRHa':`);
for (const r of rows) console.log(`  ${r.ts}  metric=${r.metric}  value=${r.value}  source=${r.source}`);
