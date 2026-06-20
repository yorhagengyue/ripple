// Harness for /api/baseline/recompute. Loads .env, runs DRY first (no writes),
// then optionally real. Usage:  node scripts/test-baseline-recompute.mjs [--write]
import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  if (/^\s*#/.test(line)) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2];
}

const { recomputeUser } = await import('../api/baseline/recompute.js');
const USER = 'tommychen030607';

const dry = await recomputeUser(USER, { dry: true });
console.log('=== DRY computed baselines ===');
for (const r of dry.computed) {
  console.log(`${r.metric.padEnd(20)} mean=${String(r.baseline_mean).padStart(10)} std=${String(r.baseline_std).padStart(8)} 7d=${String(r.last_7d_mean).padStart(10)} dev%=${String(r.deviation_pct).padStart(7)} ${r.status}  (n30=${r.n_30d} n7=${r.n_7d} anchor=${r.anchor_ts.slice(0,10)})`);
}

if (process.argv.includes('--write')) {
  console.log('\n=== WRITING to baseline ===');
  const real = await recomputeUser(USER, { dry: false });
  console.log(JSON.stringify(real, null, 2));
}
