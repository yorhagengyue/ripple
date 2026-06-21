// ============================================================
// Ripple · Yuqin-skinned multi-page runtime
// Each page includes this; hooks run only when their target elements exist.
// ============================================================

// -------------------- Hero letter-split --------------------
document.querySelectorAll('.hero-name .line').forEach(line => {
  const txt = line.dataset.txt || '';
  line.innerHTML = [...txt].map((c, i) =>
    `<span class="chr" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`
  ).join('');
});

// -------------------- Loader --------------------
(() => {
  const loader = document.getElementById('loader');
  const pct = document.getElementById('pct');
  if (!loader || !pct) return;
  let v = 0;
  const timer = setInterval(() => {
    v += Math.round(6 + Math.random() * 12);
    if (v >= 100) { v = 100; clearInterval(timer); }
    pct.textContent = v + '%';
    if (v >= 100) {
      setTimeout(() => {
        loader.classList.add('gone');
        const heroName = document.getElementById('heroName');
        if (heroName) heroName.classList.add('in');
      }, 140);
    }
  }, 90);
})();

// -------------------- Reveal IntersectionObserver --------------------
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.14 });
  document.querySelectorAll('[data-reveal], section').forEach(el => io.observe(el));
})();

// -------------------- Word-split for H2s --------------------
(() => {
  document.querySelectorAll(
    '.about-grid .lhs h2, .timeline-head h2, .proj-title, .contact-lead'
  ).forEach(h => {
    const frag = document.createDocumentFragment();
    let wi = 0;
    const walk = (node) => {
      node.childNodes.forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.nodeValue.split(/(\s+)/);
          parts.forEach(p => {
            if (p === '') return;
            if (/^\s+$/.test(p)) {
              frag.appendChild(document.createTextNode(p));
            } else {
              const outer = document.createElement('span');
              outer.className = 'word-split';
              const inner = document.createElement('span');
              inner.className = 'wd';
              inner.style.setProperty('--wi', wi++);
              inner.textContent = p;
              outer.appendChild(inner);
              frag.appendChild(outer);
            }
          });
        } else if (child.nodeType === 1) {
          if (child.tagName === 'BR') { frag.appendChild(child.cloneNode()); return; }
          const clone = child.cloneNode(false);
          const inner = document.createDocumentFragment();
          child.childNodes.forEach(gc => {
            if (gc.nodeType === 3) {
              const parts = gc.nodeValue.split(/(\s+)/);
              parts.forEach(p => {
                if (p === '') return;
                if (/^\s+$/.test(p)) {
                  inner.appendChild(document.createTextNode(p));
                } else {
                  const outer = document.createElement('span');
                  outer.className = 'word-split';
                  const sp = document.createElement('span');
                  sp.className = 'wd';
                  sp.style.setProperty('--wi', wi++);
                  sp.textContent = p;
                  outer.appendChild(sp);
                  inner.appendChild(outer);
                }
              });
            } else {
              inner.appendChild(gc.cloneNode(true));
            }
          });
          clone.appendChild(inner);
          frag.appendChild(clone);
        }
      });
    };
    walk(h);
    h.innerHTML = '';
    h.appendChild(frag);
  });
})();

// ============================================================
//  DATA LAYER — Supabase + Kimi
// ============================================================

const SUPA_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPA_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const DEMO_USER = 'tommychen030607';

const METRIC_LABELS = {
  heart_rate:         { name: 'Heart rate',            desc: 'beats per minute, on average',         unit: 'bpm',  fmt: v => v.toFixed(0) },
  resting_heart_rate: { name: 'Resting heart rate',    desc: 'how calm your heart is at rest',        unit: 'bpm',  fmt: v => v.toFixed(0) },
  hrv_sdnn:           { name: 'Heart rate variability',desc: 'recovery and nervous-system balance',   unit: 'ms',   fmt: v => v.toFixed(1) },
  sleep_hours:        { name: 'Sleep',                 desc: 'time actually asleep each night',       unit: 'hrs',  fmt: v => v.toFixed(1) },
  sleep_efficiency:   { name: 'Sleep efficiency',      desc: 'share of bed-time spent sleeping',      unit: '%',    fmt: v => Math.round(v * 100) },
  step_count:         { name: 'Steps',                 desc: 'daily movement',                        unit: 'per day', fmt: v => Math.round(v).toLocaleString() },
  active_energy:      { name: 'Active energy',         desc: 'calories burned moving around',         unit: 'kcal', fmt: v => Math.round(v).toLocaleString() },
  spo2:               { name: 'Blood oxygen',          desc: 'oxygen saturation (SpO₂)',              unit: '%',    fmt: v => v.toFixed(1) },
  respiratory_rate:   { name: 'Breathing rate',        desc: 'breaths per minute',                    unit: '/min', fmt: v => v.toFixed(1) },
};

function phraseDeviation(pct, baselineDisplay, unit) {
  const abs = Math.abs(pct);
  const dir = pct > 0 ? 'above' : pct < 0 ? 'below' : '';
  const usual = baselineDisplay ? `your usual ${baselineDisplay}${unit ? ' ' + unit : ''}` : 'your usual';
  if (abs < 2 || !dir) return `Right on ${usual}`;
  if (abs < 5)  return `A touch ${dir} ${usual}`;
  if (abs < 10) return `Slightly ${dir} ${usual}`;
  if (abs < 15) return `Noticeably ${dir} ${usual}`;
  return `Well ${dir} ${usual}`;
}
const FACT_ORDER = [
  'heart_rate','resting_heart_rate','hrv_sdnn',
  'sleep_hours','sleep_efficiency','step_count',
  'active_energy','spo2','respiratory_rate'
];

function normalizeMetric(m) {
  const s = (m || '').toLowerCase().trim();
  if (s === 'hr' || s === 'heart rate' || s === 'heart_rate') return 'heart_rate';
  if (s === 'rhr' || s === 'resting_heart_rate') return 'resting_heart_rate';
  if (s === 'hrv' || s === 'hrv_sdnn') return 'hrv_sdnn';
  if (s === 'steps' || s === 'step_count') return 'step_count';
  if (s === 'sleep' || s === 'sleep_hours') return 'sleep_hours';
  if (s === 'sleep_quality' || s === 'sleep_efficiency') return 'sleep_efficiency';
  if (s === 'energy' || s === 'active_energy') return 'active_energy';
  if (s === 'oxygen' || s === 'spo2') return 'spo2';
  if (s === 'respiration' || s === 'respiratory_rate') return 'respiratory_rate';
  return s;
}

async function sbGet(path) {
  // Routes through the server-side demo read-proxy (/api/mcp?path=) instead of
  // hitting Supabase directly with the public anon key — keeps RLS-protected
  // tables off the browser. Server whitelists healthlog/baseline for the demo user.
  try {
    const res = await fetch(`/api/mcp?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
  ));
}

// -------------------- Hero pulse card --------------------
async function loadPulse() {
  const hrEl   = document.getElementById('pulseHR');
  if (!hrEl) return;
  const statEl = document.getElementById('pulseStatus');
  const subEl  = document.getElementById('pulseSub');
  const baseEl = document.getElementById('pulseBaseline');
  const devEl  = document.getElementById('pulseDev');
  const countEl= document.getElementById('pulseCount');
  const stroke = document.getElementById('pulseStroke');
  const fill   = document.getElementById('pulseFill');

  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const [series, baselines] = await Promise.all([
    sbGet(`healthlog?user_id=eq.${DEMO_USER}&metric=eq.heart_rate&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`),
    sbGet(`baseline?user_id=eq.${DEMO_USER}&metric=eq.heart_rate&select=*&order=updated_at.desc&limit=1`),
  ]);

  const hrBase = Array.isArray(baselines) && baselines[0];
  const rows = Array.isArray(series) ? series : [];

  if (rows.length) {
    const latest = rows[rows.length - 1];
    hrEl.textContent = Math.round(latest.value);
    subEl.textContent = `latest · ${new Date(latest.ts).toLocaleString('en-SG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    countEl.textContent = rows.length;
    const values = rows.map(r => r.value).filter(Number.isFinite);
    const min = Math.min(...values), max = Math.max(...values);
    const span = Math.max(1, max - min);
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 300;
      const y = 76 - ((v - min) / span) * 64;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const strokePath = `M${pts.join(' L')}`;
    const fillPath = `M0,84 L${pts[0]} L${pts.slice(1).join(' L')} L300,84 Z`;
    stroke.setAttribute('d', strokePath);
    fill.setAttribute('d', fillPath);
  } else {
    hrEl.textContent = '—';
    subEl.textContent = 'no samples in last 30 days';
    countEl.textContent = '0';
  }

  if (hrBase) {
    baseEl.textContent = `${hrBase.baseline_mean.toFixed(1)}`;
    const sign = hrBase.deviation_pct > 0 ? '+' : '';
    devEl.textContent = `${sign}${hrBase.deviation_pct.toFixed(1)}%`;
    statEl.textContent = hrBase.status;
    statEl.classList.add(`is-${hrBase.status}`);
  } else {
    baseEl.textContent = '—';
    devEl.textContent = '—';
  }
}

// -------------------- Vitals board --------------------
const VITAL_GROUPS = [
  { label: '01 · Cardiovascular',          keys: ['heart_rate','resting_heart_rate','hrv_sdnn'] },
  { label: '02 · Sleep & activity',        keys: ['sleep_hours','sleep_efficiency','step_count'] },
  { label: '03 · Metabolic & respiratory', keys: ['active_energy','spo2','respiratory_rate'] },
];

// Short relative-time label ("just now", "3 min ago", "Apr 22 14:30")
function vitalsRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 90_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' }) +
         ' ' + d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
}

async function loadVitals() {
  const el = document.getElementById('vitalsFacts');
  if (!el) return;

  // Fetch baseline (7-day + 30-day context) AND the latest sample per metric
  // in parallel. The big number on each card is NOW ("latest"), baseline stays
  // as the sub-line for context.
  const [baselineRows, latestRows] = await Promise.all([
    sbGet(`baseline?user_id=eq.${DEMO_USER}&select=*&order=updated_at.desc`),
    sbGet(`v_latest_per_metric?user_id=eq.${DEMO_USER}&select=metric,ts,value,min_val,max_val,source`),
  ]);

  if (!Array.isArray(baselineRows) || !baselineRows.length) {
    el.innerHTML = `<div class="v-loading">Offline — Supabase unreachable</div>`;
    return;
  }

  const baselineByMetric = new Map();
  for (const r of baselineRows) {
    const key = normalizeMetric(r.metric);
    if (!baselineByMetric.has(key)) baselineByMetric.set(key, r);
  }
  const latestByMetric = new Map();
  for (const r of (Array.isArray(latestRows) ? latestRows : [])) {
    const key = normalizeMetric(r.metric);
    if (!latestByMetric.has(key)) latestByMetric.set(key, r);
  }

  const html = VITAL_GROUPS.map(group => {
    const cards = group.keys.map(key => {
      const r    = baselineByMetric.get(key);
      const live = latestByMetric.get(key);
      const meta = METRIC_LABELS[key] || { name: key, desc: '', unit: '', fmt: v => String(v) };
      if (!r && !live) {
        return `<article class="vcard is-empty"><div class="vcard__name">${meta.name}</div><div class="vcard__desc">${meta.desc}</div><div class="vcard__value">—</div></article>`;
      }

      // Choose the "big number":
      //   - latest healthlog sample if it's a finite number (real-time)
      //   - else fall back to last_7d_mean (baseline)
      const liveVal = live && Number.isFinite(Number(live.value)) ? Number(live.value) : null;
      const showingLive = liveVal !== null;
      const display = showingLive ? meta.fmt(liveVal) : (r ? meta.fmt(r.last_7d_mean) : '—');

      const tsLabel = showingLive ? vitalsRelativeTime(live.ts) : '';
      const peakLabel = (showingLive && live.max_val != null && live.max_val !== '' && Number(live.max_val) > Number(live.value))
        ? `peaked ${meta.fmt(Number(live.max_val))}${meta.unit ? ' ' + meta.unit : ''}`
        : '';
      const liveLine = showingLive
        ? `latest${tsLabel ? ' · ' + tsLabel : ''}${peakLabel ? ' · ' + peakLabel : ''}`
        : 'no recent sample · showing 7-day mean';

      const pct = r ? (Number(r.deviation_pct) || 0) : 0;
      const baseDisplay = r ? meta.fmt(r.baseline_mean) : '';
      const avg7dDisplay = r ? meta.fmt(r.last_7d_mean) : '';
      const status = r ? (r.status || 'normal') : 'normal';

      const readoutParts = [];
      if (r) {
        readoutParts.push(`7-day avg ${avg7dDisplay}${meta.unit ? ' ' + meta.unit : ''}`);
        readoutParts.push(phraseDeviation(pct, baseDisplay, meta.unit));
      }
      const readout = readoutParts.join(' · ');

      return `
        <article class="vcard" data-status="${status}">
          <div class="vcard__name">${meta.name}</div>
          <div class="vcard__desc">${meta.desc}</div>
          <div class="vcard__value">${display}<span class="vcard__unit">${meta.unit}</span></div>
          <div class="vcard__live">${liveLine}</div>
          ${readout ? `<div class="vcard__read">${readout}</div>` : ''}
        </article>
      `;
    }).join('');
    return `
      <div class="vgroup">
        <div class="vgroup__head">${group.label}</div>
        <div class="vgroup__row">${cards}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = html;
}

// -------------------- Timeline · HRV depression story --------------------

// Bucket a list of {ts, value} into per-day means.
function dailyMean(rows) {
  const buckets = new Map();
  for (const r of rows) {
    const day = (r.ts || r.recorded_at || '').slice(0, 10);
    if (!day) continue;
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    const cur = buckets.get(day) || { sum: 0, n: 0 };
    cur.sum += v; cur.n += 1;
    buckets.set(day, cur);
  }
  return [...buckets.entries()]
    .sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([day, { sum, n }]) => ({ day, value: sum / n }));
}

// Catmull-Rom → cubic Bézier. Returns an SVG path "d" string.
// Tension parameter 0 (soft) → 1 (tight). 0.5 reads organic.
function smoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

async function loadStory() {
  const chartEl = document.getElementById('storyChart');
  if (!chartEl) return;

  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const [hrvRows, hrRows, slpRows, stpRows] = await Promise.all([
    sbGet(`healthlog?user_id=eq.${DEMO_USER}&metric=eq.hrv_sdnn&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`),
    sbGet(`healthlog?user_id=eq.${DEMO_USER}&metric=eq.heart_rate&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`),
    sbGet(`healthlog?user_id=eq.${DEMO_USER}&metric=eq.sleep_hours&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`),
    sbGet(`healthlog?user_id=eq.${DEMO_USER}&metric=eq.step_count&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`),
  ]);

  const hrv = dailyMean(hrvRows || []);
  const hr  = dailyMean(hrRows  || []);
  const slp = dailyMean(slpRows || []);
  const stp = dailyMean(stpRows || []);

  if (!hrv.length) {
    chartEl.innerHTML = `<div class="v-loading">No HRV samples in the last 30 days.</div>`;
    return;
  }

  const daySet = new Set();
  [hrv, hr, slp, stp].forEach(arr => arr.forEach(r => daySet.add(r.day)));
  const days = [...daySet].sort();

  const align = (arr) => {
    const m = new Map(arr.map(r => [r.day, r.value]));
    return days.map(d => m.has(d) ? m.get(d) : null);
  };
  const raw = {
    hrv: align(hrv),
    hr:  align(hr),
    slp: align(slp),
    stp: align(stp),
  };

  const meta = {
    hrv: { label: 'HRV',        unit: 'ms',   dec: 1, cls: 'hrv',   delay: 0   },
    hr:  { label: 'Heart rate', unit: 'bpm',  dec: 0, cls: 'hr',    delay: 250 },
    slp: { label: 'Sleep',      unit: 'hrs',  dec: 1, cls: 'sleep', delay: 500 },
    stp: { label: 'Steps',      unit: '',     dec: 0, cls: 'steps', delay: 750 },
  };

  // Normalize to % deviation from day-1-through-day-3 mean
  const pctOf = {};
  const baseOf = {};
  for (const k of Object.keys(raw)) {
    const first = raw[k].slice(0, 3).filter(v => v != null);
    const base  = first.length ? first.reduce((a,b)=>a+b,0) / first.length : null;
    baseOf[k] = base;
    pctOf[k] = (base && base !== 0)
      ? raw[k].map(v => v == null ? null : 100 * (v - base) / base)
      : raw[k].map(() => null);
  }

  // Y range
  let yMin = -3, yMax = 3;
  for (const arr of Object.values(pctOf)) {
    for (const v of arr) {
      if (v == null) continue;
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }
  yMin = Math.floor(yMin / 5) * 5 - 2;
  yMax = Math.ceil(yMax / 5) * 5 + 2;
  const ySpan = Math.max(1, yMax - yMin);

  // Geometry — compact on mobile (no right-side endpoint labels)
  const isNarrow = window.matchMedia('(max-width: 720px)').matches;
  const W = 1200, H = 500;
  const padL = isNarrow ? 44 : 64;
  const padR = isNarrow ? 32 : 200;
  const padT = 36;
  const padB = 62;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xFor = (i) => padL + (days.length === 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const yFor = (pct) => padT + ((yMax - pct) / ySpan) * plotH;

  function pointsOf(arr) {
    const pts = [];
    arr.forEach((v, i) => { if (v != null) pts.push({ x: xFor(i), y: yFor(v), i, v }); });
    return pts;
  }
  const pts = {
    hrv: pointsOf(pctOf.hrv),
    hr:  pointsOf(pctOf.hr),
    slp: pointsOf(pctOf.slp),
    stp: pointsOf(pctOf.stp),
  };

  const fmtDay = (day) => {
    const d = new Date(day + 'T12:00:00Z');
    return d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  // Y ticks every 5%
  const yTicks = [];
  for (let y = Math.ceil(yMin / 5) * 5; y <= Math.floor(yMax / 5) * 5; y += 5) yTicks.push(y);

  // X ticks — every 2 days, plus first and last
  const tickIdx = new Set([0, days.length - 1]);
  for (let i = 0; i < days.length; i += Math.max(1, Math.floor(days.length / 6))) tickIdx.add(i);

  // Build SVG
  const parts = [];
  parts.push(`<svg class="story-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Fourteen-day depression-pattern trajectory">`);

  // Gradient for HRV area fill
  parts.push(`<defs>
    <linearGradient id="hrvFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--c-hrv)" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="var(--c-hrv)" stop-opacity="0.18"/>
    </linearGradient>
  </defs>`);

  // Y gridlines + labels
  for (const yv of yTicks) {
    const y = yFor(yv);
    const isZero = yv === 0;
    parts.push(`<line x1="${padL}" x2="${(W - padR).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="grid ${isZero ? 'grid--zero' : ''}"/>`);
    parts.push(`<text x="${(padL - 10).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" class="ylabel">${yv > 0 ? '+' : ''}${yv}%</text>`);
  }

  // X tick labels + faint ticks
  for (const i of tickIdx) {
    const x = xFor(i);
    parts.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(H - padB).toFixed(1)}" y2="${(H - padB + 4).toFixed(1)}" class="xtick"/>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${(H - padB + 22).toFixed(1)}" class="xlabel">${fmtDay(days[i])}</text>`);
  }

  // HRV area fill (between HRV line and 0% baseline)
  if (pts.hrv.length > 1) {
    const zeroY = yFor(0);
    const linePath = smoothPath(pts.hrv);
    // Close by line along y=0 back to start
    const areaPath = `${linePath} L ${pts.hrv[pts.hrv.length-1].x.toFixed(2)},${zeroY.toFixed(2)} L ${pts.hrv[0].x.toFixed(2)},${zeroY.toFixed(2)} Z`;
    parts.push(`<path d="${areaPath}" class="area area--hrv" fill="url(#hrvFill)"/>`);
  }

  // Draw support lines, then HRV on top
  const order = ['stp', 'slp', 'hr', 'hrv'];
  const pathDs = {};
  for (const k of order) {
    if (pts[k].length < 2) continue;
    const d = smoothPath(pts[k]);
    pathDs[k] = d;
    const weight = k === 'hrv' ? 'lead' : 'support';
    parts.push(`<path d="${d}" class="line line--${meta[k].cls} line--${weight} draw" style="--delay:${meta[k].delay}ms" fill="none"/>`);
  }

  // Dots on HRV + final-point dots on each line
  for (const k of order) {
    if (!pts[k].length) continue;
    const last = pts[k][pts[k].length - 1];
    parts.push(`<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="${k === 'hrv' ? 5 : 3.5}" class="dot dot--${meta[k].cls} dot--end" style="--delay:${meta[k].delay + 1500}ms"/>`);
  }

  // Endpoint labels (desktop only — on mobile we render a legend row below the chart)
  if (!isNarrow) {
    const endLabels = [];
    for (const k of order) {
      if (!pts[k].length) continue;
      const last = pts[k][pts[k].length - 1];
      const firstV = raw[k].find(v => v != null);
      const lastV  = [...raw[k]].reverse().find(v => v != null);
      const pct    = (firstV && firstV !== 0) ? 100 * (lastV - firstV) / firstV : 0;
      const sign = pct >= 0 ? '+' : '';
      endLabels.push({ k, y: last.y, firstV, lastV, pct, sign });
    }
    endLabels.sort((a, b) => a.y - b.y);
    const minGap = 46;
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i-1].y < minGap) endLabels[i].y = endLabels[i-1].y + minGap;
    }
    const labelX = W - padR + 18;
    for (const L of endLabels) {
      const m = meta[L.k];
      const lastX = pts[L.k][pts[L.k].length - 1].x;
      parts.push(`<line x1="${lastX.toFixed(1)}" y1="${pts[L.k][pts[L.k].length-1].y.toFixed(1)}" x2="${(labelX - 6).toFixed(1)}" y2="${L.y.toFixed(1)}" class="leader leader--${m.cls}" style="--delay:${m.delay + 1600}ms"/>`);
      parts.push(`
        <g class="endlabel endlabel--${m.cls}" style="--delay:${m.delay + 1700}ms">
          <text x="${labelX.toFixed(1)}" y="${(L.y - 6).toFixed(1)}" class="endlabel__name">${m.label}</text>
          <text x="${labelX.toFixed(1)}" y="${(L.y + 10).toFixed(1)}" class="endlabel__val">${Number(L.lastV).toFixed(m.dec)}${m.unit ? ' ' + m.unit : ''}</text>
          <text x="${labelX.toFixed(1)}" y="${(L.y + 26).toFixed(1)}" class="endlabel__pct">${L.sign}${L.pct.toFixed(1)}%</text>
        </g>
      `);
    }
  }

  // Two vertical markers: (1) intervention day when the watchdog flagged the four-way drift
  // (2) "today" — the rightmost sample. If the same day, draw just the intervention.
  const interventionDay = '2026-04-17';
  let interventionIdx = days.indexOf(interventionDay);
  if (interventionIdx < 0) interventionIdx = days.length - 1;
  const interventionX = xFor(interventionIdx);
  const lastIdx = days.length - 1;
  const lastX = xFor(lastIdx);

  // Shade region from intervention day → today (the "recovery window")
  if (interventionIdx < lastIdx) {
    parts.push(`<rect x="${interventionX.toFixed(1)}" y="${padT}" width="${(lastX - interventionX).toFixed(1)}" height="${plotH.toFixed(1)}" class="marker-band"/>`);
  }

  // Intervention marker (bolder)
  parts.push(`<line x1="${interventionX.toFixed(1)}" x2="${interventionX.toFixed(1)}" y1="${padT}" y2="${(H - padB).toFixed(1)}" class="marker marker--intervention"/>`);
  parts.push(`<text x="${(interventionX - 8).toFixed(1)}" y="${(padT + 14).toFixed(1)}" class="marker-label marker-label--intervention" text-anchor="end">Pattern recognised · ${fmtDay(days[interventionIdx])}</text>`);

  // Today marker (lighter) — only if distinct from intervention
  if (interventionIdx < lastIdx) {
    parts.push(`<line x1="${lastX.toFixed(1)}" x2="${lastX.toFixed(1)}" y1="${padT}" y2="${(H - padB).toFixed(1)}" class="marker marker--today"/>`);
    parts.push(`<text x="${(lastX + 8).toFixed(1)}" y="${(padT + 14).toFixed(1)}" class="marker-label marker-label--today" text-anchor="start">Today · ${fmtDay(days[lastIdx])}</text>`);
  }

  // Interactive overlay — crosshair + focus dots (pointer-events: none in CSS) + background hit-rect
  parts.push(`<g class="overlay">
    <rect class="hover-rect" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="transparent"/>
    <line class="crosshair" x1="0" x2="0" y1="${padT}" y2="${(H - padB).toFixed(1)}"/>
    ${Object.keys(meta).map(k => `<circle class="focus focus--${meta[k].cls}" cx="0" cy="0" r="5.5"/>`).join('')}
  </g>`);

  // Click hit paths on top — invisible wider strokes, high-priority click targets
  for (const k of order) {
    if (!pathDs[k]) continue;
    parts.push(`<path d="${pathDs[k]}" class="hit hit--${meta[k].cls}" data-k="${k}" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  parts.push('</svg>');

  // HTML tooltip — positioned absolutely over the chart
  const tooltipHTML = `
    <div class="chart-tooltip" aria-hidden="true">
      <div class="chart-tooltip__day"></div>
      <div class="chart-tooltip__rows">
        ${Object.entries(meta).map(([k, m]) => `
          <div class="chart-tooltip__row tr--${m.cls}">
            <span class="dot"></span>
            <span class="name">${m.label}</span>
            <span class="val"></span>
            <span class="pct"></span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Mobile-only legend row below the chart — replaces the right-side endpoint labels
  let legendHTML = '';
  if (isNarrow) {
    const items = order.map(k => {
      const m = meta[k];
      if (!pts[k].length) return '';
      const firstV = raw[k].find(v => v != null);
      const lastV  = [...raw[k]].reverse().find(v => v != null);
      const pct    = (firstV && firstV !== 0) ? 100 * (lastV - firstV) / firstV : 0;
      const sign = pct >= 0 ? '+' : '';
      return `
        <div class="chart-legend__item li--${m.cls}">
          <span class="sw"></span>
          <div class="chart-legend__meta">
            <div class="chart-legend__name">${m.label}</div>
            <div class="chart-legend__num">${Number(lastV).toFixed(m.dec)}${m.unit ? ' ' + m.unit : ''}<span class="pct">${sign}${pct.toFixed(1)}%</span></div>
          </div>
        </div>
      `;
    }).join('');
    legendHTML = `<div class="chart-legend">${items}</div>`;
  }

  chartEl.innerHTML = parts.join('') + tooltipHTML + legendHTML;

  // Animation: set per-path stroke-dasharray length then trigger draw
  requestAnimationFrame(() => {
    chartEl.querySelectorAll('.line.draw').forEach(path => {
      const len = path.getTotalLength?.() || 2000;
      path.style.setProperty('--len', len.toFixed(1));
    });
    requestAnimationFrame(() => chartEl.classList.add('is-drawing'));
  });

  // ----- Interactivity -----
  const svgEl = chartEl.querySelector('svg');
  const hoverRect = chartEl.querySelector('.hover-rect');
  const crosshair = chartEl.querySelector('.crosshair');
  const focusDots = {
    hrv: chartEl.querySelector('.focus--hrv'),
    hr:  chartEl.querySelector('.focus--hr'),
    slp: chartEl.querySelector('.focus--sleep'),
    stp: chartEl.querySelector('.focus--steps'),
  };
  const tipEl = chartEl.querySelector('.chart-tooltip');
  const tipDay = tipEl.querySelector('.chart-tooltip__day');
  const tipRows = {
    hrv: tipEl.querySelector('.tr--hrv'),
    hr:  tipEl.querySelector('.tr--hr'),
    slp: tipEl.querySelector('.tr--sleep'),
    stp: tipEl.querySelector('.tr--steps'),
  };

  function clientToDay(clientX) {
    const rect = svgEl.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * W;
    if (vbX < padL || vbX > W - padR) return -1;
    const frac = (vbX - padL) / plotW;
    return Math.max(0, Math.min(days.length - 1, Math.round(frac * (days.length - 1))));
  }

  function showFor(idx) {
    if (idx < 0) return hide();
    chartEl.classList.add('is-hovering');

    const cx = xFor(idx);
    crosshair.setAttribute('x1', cx.toFixed(1));
    crosshair.setAttribute('x2', cx.toFixed(1));

    for (const k of Object.keys(meta)) {
      const v = pctOf[k][idx];
      const rawV = raw[k][idx];
      const m = meta[k];
      const dot = focusDots[k];
      const row = tipRows[k];
      if (v == null || rawV == null) {
        dot.setAttribute('cx', '-100');
        row.classList.add('is-empty');
        row.querySelector('.val').textContent = '—';
        row.querySelector('.pct').textContent = '';
        continue;
      }
      dot.setAttribute('cx', cx.toFixed(1));
      dot.setAttribute('cy', yFor(v).toFixed(1));
      row.classList.remove('is-empty');
      row.querySelector('.val').textContent = `${Number(rawV).toFixed(m.dec)}${m.unit ? ' ' + m.unit : ''}`;
      const firstVk = raw[k].find(x => x != null);
      const pctVsStart = (firstVk && firstVk !== 0) ? 100 * (rawV - firstVk) / firstVk : 0;
      const sign = pctVsStart >= 0 ? '+' : '';
      row.querySelector('.pct').textContent = `${sign}${pctVsStart.toFixed(1)}%`;
    }

    tipDay.textContent = fmtDay(days[idx]);

    // Position tooltip near the crosshair, inside chartEl
    const hostRect = chartEl.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();
    const screenX = svgRect.left + (cx / W) * svgRect.width;
    const localX = screenX - hostRect.left;
    const tipW = tipEl.offsetWidth || 240;
    // Flip to left side when cursor is on the right half
    let tipX = localX + 18;
    if (tipX + tipW > chartEl.clientWidth - 6) tipX = localX - tipW - 18;
    tipEl.style.left = `${Math.max(6, tipX)}px`;
    tipEl.style.top = `${Math.max(6, (svgRect.top - hostRect.top) + 12)}px`;
    tipEl.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    chartEl.classList.remove('is-hovering');
    tipEl.setAttribute('aria-hidden', 'true');
  }

  svgEl.addEventListener('mousemove', (e) => showFor(clientToDay(e.clientX)));
  svgEl.addEventListener('mouseleave', hide);
  svgEl.addEventListener('touchmove', (e) => {
    if (!e.touches.length) return;
    e.preventDefault();
    showFor(clientToDay(e.touches[0].clientX));
  }, { passive: false });
  svgEl.addEventListener('touchend', hide);

  // ---------- Click-to-focus + Kimi explanation (cached & prefetched) ----------
  const METRIC_BY_K = { hrv: 'hrv_sdnn', hr: 'heart_rate', slp: 'sleep_hours', stp: 'step_count' };
  const explainEl = document.getElementById('storyExplain');
  const cache    = new Map();    // k  -> content string
  const inflight = new Map();    // k  -> Promise<string>

  function fetchOne(k) {
    if (cache.has(k)) return Promise.resolve(cache.get(k));
    if (inflight.has(k)) return inflight.get(k);
    const p = fetch('/api/chat/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metric: METRIC_BY_K[k] }),
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.content) throw new Error(data?.error || `HTTP ${res.status}`);
      cache.set(k, String(data.content).trim());
      inflight.delete(k);
      return cache.get(k);
    }).catch(err => {
      inflight.delete(k);
      throw err;
    });
    inflight.set(k, p);
    return p;
  }

  // Warm the cache in the background — clicks feel instant after ~3s.
  ['hrv', 'hr', 'slp', 'stp'].forEach(k => { fetchOne(k).catch(() => {}); });

  function renderExplain(k, content) {
    explainEl.classList.remove('is-loading', 'is-error');
    explainEl.classList.add('is-open');
    const paras = content.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
    const paraHtml = paras.map(p => `<p>${escapeHtml(p)}</p>`).join('') || `<p>${escapeHtml(content)}</p>`;
    explainEl.innerHTML = `
      <div class="story-explain__inner">
        <div class="story-explain__kicker">
          <span class="dot dot--${meta[k].cls}"></span>
          <span class="fmono">Ripple reads</span> · ${meta[k].label}
          <button class="story-explain__close" aria-label="Clear focus" type="button">× clear</button>
        </div>
        <div class="story-explain__body">${paraHtml}</div>
      </div>
    `;
    explainEl.querySelector('.story-explain__close').addEventListener('click', () => setFocus(null));
  }

  function renderLoading(k) {
    explainEl.classList.remove('is-error');
    explainEl.classList.add('is-open', 'is-loading');
    explainEl.innerHTML = `
      <div class="story-explain__inner">
        <div class="story-explain__kicker">
          <span class="dot dot--${meta[k].cls}"></span>
          <span class="fmono">Ripple reads</span> · ${meta[k].label}
          <button class="story-explain__close" aria-label="Clear focus" type="button">× clear</button>
        </div>
        <div class="story-explain__body">
          <p class="story-explain__loading"><span class="shimmer"></span> one sentence, coming…</p>
        </div>
      </div>
    `;
    explainEl.querySelector('.story-explain__close').addEventListener('click', () => setFocus(null));
  }

  function renderError(k, msg) {
    explainEl.classList.remove('is-loading');
    explainEl.classList.add('is-open', 'is-error');
    explainEl.innerHTML = `
      <div class="story-explain__inner">
        <div class="story-explain__kicker">
          <span class="dot dot--${meta[k].cls}"></span>
          <span class="fmono">Ripple reads</span> · ${meta[k].label}
          <button class="story-explain__close" aria-label="Clear focus" type="button">× clear</button>
        </div>
        <div class="story-explain__body">
          <p class="story-explain__err">Couldn't reach Kimi — ${escapeHtml(String(msg).slice(0, 100))}.</p>
        </div>
      </div>
    `;
    explainEl.querySelector('.story-explain__close').addEventListener('click', () => setFocus(null));
  }

  let currentK = null;
  function setFocus(k) {
    currentK = k;
    if (!k) {
      chartEl.removeAttribute('data-focus');
      if (explainEl) {
        explainEl.classList.remove('is-open', 'is-loading', 'is-error');
        explainEl.innerHTML = `<div class="story-explain__hint"><span class="fmono">tap any line</span> — Ripple will read the four signals against each other and explain.</div>`;
      }
      return;
    }
    chartEl.setAttribute('data-focus', meta[k].cls);
    if (!explainEl) return;
    if (cache.has(k)) {
      renderExplain(k, cache.get(k));
    } else {
      renderLoading(k);
      fetchOne(k)
        .then(content => { if (currentK === k) renderExplain(k, content); })
        .catch(err => { if (currentK === k) renderError(k, err.message); });
    }
  }

  // Wire up click targets
  chartEl.querySelectorAll('.hit').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setFocus(el.dataset.k);
    });
  });
  chartEl.querySelector('.hover-rect')?.addEventListener('click', () => setFocus(null));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setFocus(null); });
}

// -------------------- Chat (persisted · Supabase-backed) --------------------
(() => {
  const log = document.getElementById('chatLog');
  const input = document.getElementById('chatInput');
  const send  = document.getElementById('chatSend');
  const statusEl = document.getElementById('nudgeStatus');
  const dayDivider = document.getElementById('dayDivider');
  if (!log || !input || !send) return;

  if (dayDivider) {
    const span = dayDivider.querySelector('span');
    if (span) span.textContent = new Date().toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeLabel(d) {
    return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });
  }

  function setStatus(kind, txt) {
    if (!statusEl) return;
    statusEl.classList.remove('is-live', 'is-thinking');
    if (kind) statusEl.classList.add(`is-${kind}`);
    const t = statusEl.querySelector('.txt');
    if (t && txt) t.textContent = txt;
  }

  // ---- DOM builders ----
  function buildAgentNode({ content, kind, tag, resolved, time }) {
    const root = document.createElement('div');
    root.className = 'msg msg--agent' + (kind === 'nudge' ? ' msg--nudge' : '');
    root.innerHTML = `
      <div class="msg-avatar">R</div>
      <div class="msg-body-wrap">
        <div class="msg-head">
          <span class="who">Ripple</span>
          ${kind === 'nudge' ? `<span class="kind">proactive</span>` : ''}
          <span class="time">${timeLabel(time)}</span>
        </div>
        <div class="msg-body"></div>
      </div>`;
    root.querySelector('.msg-body').textContent = content;
    if ((tag && tag !== 'null') || resolved === true) {
      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      if (tag && tag !== 'null') {
        const c = document.createElement('span');
        c.className = 'chip-tag';
        c.textContent = tag;
        meta.appendChild(c);
      }
      if (resolved === true) {
        const c = document.createElement('span');
        c.className = 'chip-resolved';
        c.textContent = 'resolved';
        meta.appendChild(c);
      }
      root.querySelector('.msg-body-wrap').appendChild(meta);
    }
    return root;
  }

  function buildUserNode({ content, time }) {
    const root = document.createElement('div');
    root.className = 'msg msg--user';
    root.innerHTML = `
      <div class="msg-head"><span class="who">You</span><span class="time">${timeLabel(time)}</span></div>
      <div class="msg-body"></div>`;
    root.querySelector('.msg-body').textContent = content;
    return root;
  }

  function buildSystemNode({ content, kind, time }) {
    const root = document.createElement('div');
    root.className = 'msg msg--system';
    root.innerHTML = `
      <div class="msg-head"><span class="kind">${kind || 'event'}</span><span class="time">${timeLabel(time)}</span></div>
      <div class="msg-body"></div>`;
    root.querySelector('.msg-body').textContent = content;
    return root;
  }

  function scrollBottom() { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); }

  // Track rendered IDs so polling doesn't duplicate.
  const rendered = new Set();
  let lastTriggeredAt = null; // ISO string of newest rendered message

  function renderRow(row) {
    if (!row || rendered.has(row.id)) return;
    rendered.add(row.id);
    const t = row.triggered_at ? new Date(row.triggered_at) : new Date();
    if (!lastTriggeredAt || t > new Date(lastTriggeredAt)) lastTriggeredAt = row.triggered_at;

    let node;
    switch (row.state) {
      case 'user':
        node = buildUserNode({ content: row.free_text || '', time: t });
        break;
      case 'nudge':
        node = buildAgentNode({ content: row.free_text || '…', kind: 'nudge', time: t });
        break;
      case 'agent_reply':
        node = buildAgentNode({
          content: row.free_text || '…',
          kind: null,
          tag: row.context_tag,
          resolved: !!row.resolved_at || (row.context && row.context.resolved === true),
          time: t,
        });
        break;
      case 'agent_error':
        node = buildSystemNode({ content: `Upstream error — ${row.free_text}`, kind: 'error', time: t });
        break;
      default:
        node = buildSystemNode({ content: row.free_text || row.state || 'event', kind: row.state || 'event', time: t });
    }
    log.appendChild(node);
  }

  function thinkingNode() {
    const root = document.createElement('div');
    root.className = 'msg msg--agent msg--thinking';
    root.id = '__thinking';
    root.innerHTML = `
      <div class="msg-avatar">R</div>
      <div class="msg-body-wrap">
        <div class="msg-head"><span class="who">Ripple</span><span class="time">…</span></div>
        <div class="msg-body">thinking<span class="dots"><i></i><i></i><i></i></span></div>
      </div>`;
    return root;
  }
  function clearThinking() { document.getElementById('__thinking')?.remove(); }

  // ---- History load + polling ----
  async function loadHistory({ sinceOverride } = {}) {
    const qs = new URLSearchParams();
    if (sinceOverride) qs.set('since', sinceOverride);
    else if (lastTriggeredAt) qs.set('since', lastTriggeredAt);
    qs.set('limit', '100');
    try {
      const r = await fetch('/api/chat/history?' + qs.toString());
      if (!r.ok) return { added: 0 };
      const data = await r.json();
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      const before = rendered.size;
      rows.forEach(renderRow);
      if (rows.length) scrollBottom();
      return { added: rendered.size - before };
    } catch { return { added: 0 }; }
  }

  // Initial seed for empty histories — appears once until the first real row shows up.
  function seedIfEmpty() {
    if (rendered.size > 0) return;
    const note = buildSystemNode({
      content: 'Ripple is standing by — checks in every 5 minutes and when vitals drift.',
      kind: 'welcome',
      time: new Date(),
    });
    note.id = '__seed';
    log.appendChild(note);
  }
  function clearSeed() { document.getElementById('__seed')?.remove(); }

  // ---- User reply flow ----
  let busy = false;
  async function fire() {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    setStatus('thinking', 'thinking');

    // Optimistic render of user bubble. It'll get reconciled by polling when
    // the backend row returns; until then we use a local placeholder id.
    const optimisticTime = new Date();
    const optimistic = buildUserNode({ content: text, time: optimisticTime });
    optimistic.dataset.optimistic = '1';
    log.appendChild(optimistic);
    input.value = '';
    autoResize();

    const thinking = thinkingNode();
    log.appendChild(thinking);
    scrollBottom();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      clearThinking();
      // Trigger a history load to pick up persisted user + agent rows.
      await loadHistory();
      // If backend returned a reply but polling didn't reach it yet, render best-effort.
      if (data?.reply) {
        // loadHistory may already have rendered; check by scanning last message text.
        // (Cheap heuristic: if no agent_reply with this text exists, render transient.)
        const already = Array.from(log.querySelectorAll('.msg--agent:not(.msg--nudge):not(.msg--thinking) .msg-body'))
          .some(el => el.textContent === data.reply);
        if (!already) {
          log.appendChild(buildAgentNode({
            content: data.reply,
            tag: data.context_tag,
            resolved: data.resolved === true,
            time: new Date(),
          }));
          scrollBottom();
        }
      }
      // Clean up optimistic if history picked up the persisted version.
      if (Array.from(log.querySelectorAll('.msg--user[data-optimistic]')).length) {
        // If history returned a matching row, remove the optimistic.
        const persistedTexts = Array.from(log.querySelectorAll('.msg--user:not([data-optimistic]) .msg-body'))
          .map(el => el.textContent);
        if (persistedTexts.includes(text)) {
          optimistic.remove();
        }
      }
      setStatus('live', 'standing by');
    } catch {
      clearThinking();
      log.appendChild(buildSystemNode({ content: 'Kimi upstream unreachable.', kind: 'error', time: new Date() }));
      setStatus('', 'offline');
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }

  // ---- Textarea auto-resize ----
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(140, input.scrollHeight) + 'px';
  }
  input.addEventListener('input', autoResize);

  send.addEventListener('click', fire);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); }
  });

  // ---- Proactive nudges ----
  // Server-side cron (external) is authoritative. The browser timer is a
  // fallback so the demo keeps ticking even without an external scheduler.
  const NUDGE_INTERVAL_MS = 5 * 60 * 1000;
  const POLL_INTERVAL_MS = 15 * 1000;

  async function clientNudge({ firstRun = false } = {}) {
    try {
      setStatus('thinking', 'Ripple checking in');
      await fetch('/api/chat/nudge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ first_run: firstRun }),
      });
      await loadHistory();
      setStatus('live', 'standing by');
    } catch {
      setStatus('', 'nudge offline');
    }
  }

  // ---- Web Push subscription (opt-in) ----
  const pushBtn = document.getElementById('chatPushBtn');
  const VAPID_PUBLIC_KEY = (import.meta.env && import.meta.env.VITE_VAPID_PUBLIC_KEY) || '';

  function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function getPushSub() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async function subscribePush() {
    if (!VAPID_PUBLIC_KEY) { console.warn('[Ripple] missing VITE_VAPID_PUBLIC_KEY'); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('This browser does not support push notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      refreshPushBtn();
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('/api/chat/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          user_agent: navigator.userAgent,
        }),
      });
      refreshPushBtn();
      setStatus('live', 'push on · standing by');
    } catch (e) {
      console.warn('[Ripple] push subscribe failed', e);
      setStatus('', 'push failed');
    }
  }

  async function unsubscribePush() {
    const sub = await getPushSub();
    if (!sub) { refreshPushBtn(); return; }
    try {
      await fetch('/api/chat/subscribe', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    } catch (e) { console.warn('[Ripple] push unsubscribe failed', e); }
    refreshPushBtn();
    setStatus('live', 'standing by');
  }

  async function refreshPushBtn() {
    if (!pushBtn) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      pushBtn.hidden = true;
      return;
    }
    pushBtn.hidden = false;
    const perm = Notification.permission;
    const sub = await getPushSub();
    const txt = pushBtn.querySelector('.chat-push__txt');
    if (perm === 'denied') {
      pushBtn.classList.remove('is-on');
      pushBtn.classList.add('is-denied');
      if (txt) txt.textContent = 'push blocked';
      pushBtn.disabled = true;
    } else if (sub) {
      pushBtn.classList.add('is-on');
      pushBtn.classList.remove('is-denied');
      if (txt) txt.textContent = 'push on';
      pushBtn.disabled = false;
    } else {
      pushBtn.classList.remove('is-on', 'is-denied');
      if (txt) txt.textContent = 'enable push';
      pushBtn.disabled = false;
    }
  }

  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      const sub = await getPushSub();
      if (sub) { await unsubscribePush(); }
      else    { await subscribePush(); }
    });
    refreshPushBtn();
  }

  // ---- Clear conversation ----
  const clearHost    = document.getElementById('chatClearHost');
  const clearBtn     = document.getElementById('chatClearBtn');
  const clearConfirm = document.getElementById('chatClearConfirm');
  const clearYes     = document.getElementById('chatClearYes');
  const clearNo      = document.getElementById('chatClearNo');

  let confirmTimer = null;

  function showConfirm() {
    if (!clearHost) return;
    clearHost.classList.add('is-confirming');
    clearBtn.hidden = true;
    clearConfirm.hidden = false;
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(resetConfirm, 6000); // auto-revert after 6s
  }
  function resetConfirm() {
    if (!clearHost) return;
    clearHost.classList.remove('is-confirming', 'is-busy');
    clearBtn.hidden = false;
    clearConfirm.hidden = true;
    clearTimeout(confirmTimer);
  }

  async function doClear() {
    clearHost.classList.add('is-busy');
    clearYes.disabled = true;
    clearNo.disabled = true;
    try {
      const r = await fetch('/api/chat/history', { method: 'DELETE' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setStatus('', 'clear failed');
        console.warn('clear failed', body);
        return;
      }
      // Local reset: rendered set + DOM (preserve day-divider) + lastTriggeredAt
      rendered.clear();
      lastTriggeredAt = null;
      log.querySelectorAll('.msg, .msg--thinking, .day-break').forEach(n => n.remove());
      seedIfEmpty();
      scrollBottom();
      setStatus('live', 'cleared · standing by');
    } catch {
      setStatus('', 'clear failed');
    } finally {
      clearYes.disabled = false;
      clearNo.disabled = false;
      resetConfirm();
    }
  }

  if (clearBtn && clearYes && clearNo) {
    clearBtn.addEventListener('click', showConfirm);
    clearNo.addEventListener('click', resetConfirm);
    clearYes.addEventListener('click', doClear);
    // Clicking anywhere else cancels the pending confirm
    document.addEventListener('click', (e) => {
      if (!clearHost?.classList.contains('is-confirming')) return;
      if (clearHost.contains(e.target)) return;
      resetConfirm();
    });
  }

  // ---- Boot ----
  (async () => {
    setStatus('thinking', 'loading history');
    await loadHistory({ sinceOverride: null });
    seedIfEmpty();
    setStatus('live', 'standing by');
    scrollBottom();

    // Fire first nudge 20s after landing (so demo gets activity fast).
    setTimeout(() => {
      clearSeed();
      clientNudge({ firstRun: true });
    }, 20 * 1000);

    // Then every 5 minutes (client fallback). If you set up cron-job.org
    // hitting /api/chat/nudge with the NUDGE_SECRET header, these will
    // arrive whether or not the tab is open.
    setInterval(() => { clientNudge({ firstRun: false }); }, NUDGE_INTERVAL_MS);

    // Catch-up polling for rows pushed by any external source (cron, Workato, etc).
    setInterval(() => { loadHistory(); }, POLL_INTERVAL_MS);
  })();
})();

// -------------------- Active-nav highlight --------------------
(() => {
  const here = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav a[data-path]').forEach(a => {
    const p = a.dataset.path.replace(/\/$/, '') || '/';
    if (p === here || (p !== '/' && here.startsWith(p))) {
      a.classList.add('active');
    }
  });
  // Header background shift when scrolled
  const navEl = document.querySelector('.nav');
  if (navEl) {
    const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();

// -------------------- PWA: service worker + install prompt --------------------
(() => {
  // Register the service worker at root scope (covers every Ripple page).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[Ripple] SW registration failed', err);
      });
    });
  }

  // Capture the install prompt so Chrome doesn't auto-show the mini-infobar;
  // stash it on `window.ripplePWA` so a custom button (future) can call prompt().
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.ripplePWA = e;
  });

  // Log when installed — useful for demo telemetry.
  window.addEventListener('appinstalled', () => {
    window.ripplePWA = null;
    console.log('[Ripple] PWA installed');
  });
})();

// -------------------- MCP connect block (pipeline page) --------------------
// Tabs switch + copy-to-clipboard for the "Wire it into any MCP client" panel.
(function initMcpConnect() {
  const root = document.querySelector('.mcp-connect');
  if (!root) return;

  // Tab switching
  const tabs = root.querySelectorAll('.mcp-tab');
  const panels = root.querySelectorAll('.mcp-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.mcpTab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach((p) => {
        const on = p.dataset.mcpPanel === key;
        p.classList.toggle('is-active', on);
        if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      });
    });
  });

  // Copy buttons
  function flash(btn) {
    btn.classList.add('is-copied');
    const txt = btn.querySelector('.mcp-copy__txt');
    const prev = txt ? txt.textContent : null;
    if (txt) txt.textContent = 'Copied';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      if (txt && prev != null) txt.textContent = prev;
    }, 1400);
  }

  // Try-it-live — call the MCP proxy and render the unwrapped result
  const tryRoot = document.getElementById('mcpTry');
  if (tryRoot) {
    const toolSel   = document.getElementById('mcpTryTool');
    const userIn    = document.getElementById('mcpTryUser');
    const metricIn  = document.getElementById('mcpTryMetric');
    const metricFld = document.getElementById('mcpTryMetricField');
    const runBtn    = document.getElementById('mcpTryRun');
    const outBox    = document.getElementById('mcpTryOut');
    const statusEl  = document.getElementById('mcpTryStatus');
    const latencyEl = document.getElementById('mcpTryLatency');
    const recipeEl  = document.getElementById('mcpTryRecipe');
    const resultEl  = document.getElementById('mcpTryResult');

    const RECIPE_MAP = {
      get_current_vitals:     '02 · ripple_mcp_current_vitals',
      get_baseline_deviation: '03 · ripple_mcp_baseline_deviation',
    };

    // Toggle metric input visibility based on chosen tool
    function syncFields() {
      const needsMetric = toolSel.value === 'get_baseline_deviation';
      if (needsMetric) metricFld.removeAttribute('hidden'); else metricFld.setAttribute('hidden', '');
    }
    toolSel.addEventListener('change', syncFields);
    syncFields();

    runBtn.addEventListener('click', async () => {
      const tool = toolSel.value;
      const user_id = (userIn.value || '').trim();
      const args = { user_id };
      if (tool === 'get_baseline_deviation') args.metric = (metricIn.value || 'heart_rate').trim();
      if (!user_id) { userIn.focus(); return; }

      runBtn.classList.add('is-loading');
      runBtn.disabled = true;
      outBox.removeAttribute('hidden');
      statusEl.textContent = '…';
      statusEl.className = 'mv';
      latencyEl.textContent = '…';
      recipeEl.textContent = RECIPE_MAP[tool] || tool;
      resultEl.textContent = 'calling Ripple MCP…';

      const t0 = Date.now();
      try {
        const r = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tool, arguments: args }),
        });
        const data = await r.json();
        const elapsed = data.elapsed_ms ?? (Date.now() - t0);
        statusEl.textContent = data.ok ? `200 OK` : `${r.status} ERR`;
        statusEl.className = 'mv ' + (data.ok ? 'is-ok' : 'is-err');
        latencyEl.textContent = `${elapsed} ms`;
        // Prefer the already-unwrapped payload, fall back to rpc envelope
        const pretty = data.unwrapped ?? data.rpc ?? data;
        resultEl.textContent = JSON.stringify(pretty, null, 2);
      } catch (e) {
        statusEl.textContent = 'NETWORK';
        statusEl.className = 'mv is-err';
        latencyEl.textContent = `${Date.now() - t0} ms`;
        resultEl.textContent = String(e);
      } finally {
        runBtn.classList.remove('is-loading');
        runBtn.disabled = false;
      }
    });
  }

  root.querySelectorAll('.mcp-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let text = '';
      // Explicit selector target
      if (btn.dataset.mcpCopy) {
        const el = document.querySelector(btn.dataset.mcpCopy);
        if (el) text = el.innerText.trim();
      }
      // Nearest code block (corner button inside <pre>)
      if (!text && btn.hasAttribute('data-mcp-copy-sibling')) {
        const pre = btn.closest('pre');
        const code = pre && pre.querySelector('code');
        if (code) text = code.innerText.trim();
      }
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        flash(btn);
      } catch {
        // Fallback for browsers without clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); flash(btn); } catch {}
        document.body.removeChild(ta);
      }
    });
  });
})();

// -------------------- Chat vitals panel (MCP-fetched, user-toggled) --------------------
// Shows the same vitals table pipeline.html shows in try-it-live, but inline
// in the chat. User must click "Show my vitals" (opt-in). Once open, the table
// fetches live via /api/mcp → Supabase. "AI analyze" button
// forwards the snapshot to Kimi for a short observational read.
(function initChatVitals() {
  const root      = document.getElementById('chatVitals');
  if (!root) return;
  // Legacy toggle no longer exists in the dual-pane layout (vitals always visible).
  // Kept optional for pages that still render it.
  const toggleBtn = document.getElementById('chatVitalsToggle');
  const panel     = document.getElementById('chatVitalsPanel');
  const rowsEl    = document.getElementById('chatVitalsRows');
  const fetchedEl = document.getElementById('chatVitalsFetchedAt');
  const latencyEl = document.getElementById('chatVitalsLatency');
  const ttlEl     = toggleBtn ? toggleBtn.querySelector('.chat-vitals__ttl') : null;
  const refreshBtn = document.getElementById('chatVitalsRefresh');
  const analyzeBtn = document.getElementById('chatVitalsAnalyze');
  const logEl     = document.getElementById('chatLog');

  let lastVitals = null;

  const UNIT = { heart_rate:'bpm', hrv_sdnn:'ms', resting_heart_rate:'bpm', spo2:'%',
                 respiratory_rate:'rpm', step_count:'steps', active_energy:'kcal',
                 sleep_hours:'h', sleep_efficiency:'' };
  const DEC  = { heart_rate:0, hrv_sdnn:1, resting_heart_rate:0, spo2:0,
                 respiratory_rate:1, step_count:0, active_energy:0,
                 sleep_hours:2, sleep_efficiency:3 };

  function fmtTs(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
    return d.toLocaleDateString('en-SG', { month:'short', day:'numeric' }) +
           ' ' + d.toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit', hour12:false });
  }

  function fmtVal(metric, v) {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    const d = DEC[metric] ?? 1;
    const u = UNIT[metric] ? ' ' + UNIT[metric] : '';
    return n.toFixed(d) + u;
  }

  // Filter out stale / duplicate rows. Workato recipe returns both canonical
  // metrics (heart_rate) and legacy ones (hr, heart rate, energy, hrv…) that
  // come from a different source blob. We only want the canonical ones.
  const CANON = new Set([
    'heart_rate', 'hrv_sdnn', 'resting_heart_rate', 'spo2',
    'respiratory_rate', 'step_count', 'active_energy',
    'sleep_hours', 'sleep_efficiency',
  ]);

  // Short metric labels for the card grid
  const METRIC_SHORT = {
    heart_rate:         'Heart rate',
    resting_heart_rate: 'Resting HR',
    hrv_sdnn:           'HRV',
    sleep_hours:        'Sleep',
    sleep_efficiency:   'Sleep eff.',
    step_count:         'Steps',
    active_energy:      'Active kcal',
    spo2:               'SpO₂',
    respiratory_rate:   'Respiration',
  };
  // Preferred display order — cardiovascular first, then sleep/activity, then metabolic/respiratory
  const CARD_ORDER = [
    'heart_rate', 'hrv_sdnn', 'resting_heart_rate',
    'sleep_hours', 'sleep_efficiency', 'step_count',
    'active_energy', 'spo2', 'respiratory_rate',
  ];

  let lastBaseline = {}; // metric → { baseline_mean, last_7d_mean, deviation_pct, status }

  function renderRows(vitals) {
    if (!Array.isArray(vitals) || !vitals.length) {
      rowsEl.innerHTML = `<div class="chat-vitals__empty">No vitals returned.</div>`;
      return;
    }
    const filtered = vitals.filter((v) => CANON.has(v.metric));
    if (!filtered.length) {
      rowsEl.innerHTML = `<div class="chat-vitals__empty">No canonical vitals in response.</div>`;
      return;
    }
    // index by metric for ordered rendering
    const byMetric = new Map(filtered.map((v) => [v.metric, v]));
    const ordered = [...CARD_ORDER.filter((m) => byMetric.has(m)), ...filtered.map((v) => v.metric).filter((m) => !CARD_ORDER.includes(m))];
    const seen = new Set();
    const html = [];
    const now = Date.now();
    for (const metric of ordered) {
      if (seen.has(metric)) continue;
      seen.add(metric);
      const v = byMetric.get(metric);
      if (!v) continue;
      const b = lastBaseline[metric];
      const age = now - new Date(v.ts).getTime();
      const stale = age > 24 * 3600 * 1000;

      // Delta vs 7-day baseline
      let delta = '';
      let deltaCls = '';
      if (b && Number.isFinite(Number(b.deviation_pct))) {
        const pct = Number(b.deviation_pct);
        const arrow = pct > 1 ? '▲' : pct < -1 ? '▼' : '▪';
        deltaCls = pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat';
        delta = `${arrow} ${pct > 0 ? '+' : ''}${pct.toFixed(1)}% of 7d`;
      } else {
        delta = '—';
        deltaCls = 'flat';
      }

      const shortName = METRIC_SHORT[metric] || metric;
      const idx = html.length;
      // Compact: name + value only. Delta/ts preserved as data-attrs for hover
      // tooltip and analytics, but not shown on the card.
      const tooltipParts = [];
      if (v.source) tooltipParts.push(v.source);
      if (v.ts)     tooltipParts.push(fmtTs(v.ts));
      if (delta && delta !== '—') tooltipParts.push(delta);
      const tooltip = tooltipParts.join(' · ').replace(/"/g,'&quot;');
      html.push(`
        <div class="vcell ${stale ? 'is-stale' : ''}" data-delta="${deltaCls}" style="--vcell-index:${idx};" title="${tooltip}">
          <div class="vcell__name">${shortName}</div>
          <div class="vcell__val">${fmtVal(metric, v.value)}</div>
        </div>
      `);
    }
    rowsEl.innerHTML = html.join('');
  }

  async function fetchBaseline() {
    // Server-side demo read-proxy (service-role), not a direct anon read.
    try {
      const r = await fetch(`/api/mcp?path=${encodeURIComponent('baseline?user_id=eq.tommychen030607&select=metric,baseline_mean,last_7d_mean,deviation_pct,status')}`);
      if (!r.ok) return {};
      const arr = await r.json();
      const map = {};
      for (const row of arr) { if (row && row.metric && !map[row.metric]) map[row.metric] = row; }
      return map;
    } catch { return {}; }
  }

  async function fetchVitals() {
    rowsEl.innerHTML = `<div class="chat-vitals__empty">calling Ripple MCP…</div>`;
    fetchedEl.textContent = '…';
    latencyEl.textContent = '…';
    analyzeBtn.disabled = true;
    // Kick off the vermilion scan-line animation
    root.setAttribute('data-fetching', 'true');

    const t0 = Date.now();
    try {
      const [mcpRes, baseline] = await Promise.all([
        fetch('/api/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tool: 'get_current_vitals', arguments: { user_id: 'tommychen030607' } }),
        }).then((r) => r.json()),
        fetchBaseline(),
      ]);
      lastBaseline = baseline || {};
      const elapsed = mcpRes.elapsed_ms ?? (Date.now() - t0);
      latencyEl.textContent = `${elapsed} ms`;
      fetchedEl.textContent = new Date().toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
      const vitals = mcpRes?.unwrapped?.metrics || [];
      lastVitals = vitals;
      renderRows(vitals);
      analyzeBtn.disabled = !vitals.length;
    } catch (e) {
      rowsEl.innerHTML = `<div class="chat-vitals__empty">Fetch failed: ${String(e).slice(0, 120)}</div>`;
      latencyEl.textContent = `${Date.now() - t0} ms`;
      fetchedEl.textContent = 'error';
    } finally {
      root.removeAttribute('data-fetching');
    }
  }

  // Append a Ripple-style analysis bubble into the chat log
  function appendAnalysis(content) {
    if (!logEl) return;
    const d = new Date();
    const time = d.toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' });
    const msg = document.createElement('div');
    msg.className = 'msg msg--agent msg--analysis';
    const paragraphs = String(content).split(/\n{2,}/).filter(Boolean).map((p) => {
      const pp = document.createElement('p');
      pp.style.margin = '0 0 8px';
      pp.textContent = p.trim();
      return pp;
    });
    msg.innerHTML = `
      <div class="msg-avatar">R</div>
      <div class="msg-body-wrap">
        <div class="msg-head">
          <span class="who">Ripple</span>
          <span class="kind-badge">vitals read</span>
          <span class="time">${time}</span>
        </div>
        <div class="msg-body"></div>
      </div>`;
    const bodyEl = msg.querySelector('.msg-body');
    paragraphs.forEach((p) => bodyEl.appendChild(p));
    logEl.appendChild(msg);
    msg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  async function analyzeVitals() {
    if (!lastVitals || !lastVitals.length) return;
    analyzeBtn.classList.add('is-loading');
    analyzeBtn.disabled = true;
    try {
      const r = await fetch('/api/chat/analyze-vitals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vitals: lastVitals }),
      });
      const data = await r.json();
      if (!r.ok || !data.content) {
        appendAnalysis(`(analysis failed: ${data.error || r.status})`);
        return;
      }
      appendAnalysis(data.content);
    } catch (e) {
      appendAnalysis(`(analysis network error: ${String(e).slice(0,120)})`);
    } finally {
      analyzeBtn.classList.remove('is-loading');
      analyzeBtn.disabled = false;
    }
  }

  // Dual-pane layout: vitals aside is always visible → auto-fetch on mount.
  // Legacy toggle retained for pages still using the collapsed variant.
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const isOpen = root.dataset.open === 'true';
      const next = !isOpen;
      root.dataset.open = String(next);
      toggleBtn.setAttribute('aria-expanded', String(next));
      if (next) {
        if (panel) panel.removeAttribute('hidden');
        if (ttlEl) ttlEl.textContent = 'Hide my vitals';
        if (!lastVitals) await fetchVitals();
      } else {
        if (panel) panel.setAttribute('hidden', '');
        if (ttlEl) ttlEl.textContent = 'Show my vitals';
      }
    });
  } else {
    // No toggle → always-visible aside. Kick off fetch with a small delay so
    // the staggered card animation has somewhere to land.
    setTimeout(fetchVitals, 180);
  }

  if (refreshBtn) refreshBtn.addEventListener('click', fetchVitals);
  if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeVitals);
})();

// -------------------- Boot data loaders --------------------
loadPulse().catch(() => {});
loadVitals().catch(() => {});
loadStory().catch(() => {});
