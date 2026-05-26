// Peer (心涟) — shared client helpers.
// No build step; ES module loaded directly.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------------- Auth helpers ----------------

export async function checkAuth() {
  try {
    const r = await fetch('/api/peer?action=auth', { credentials: 'same-origin' });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j.authenticated;
  } catch {
    return false;
  }
}

export async function tryLogin(password) {
  try {
    const r = await fetch('/api/peer?action=auth', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (r.ok) return { ok: true };
    let body = '';
    try { body = await r.text(); } catch {}
    return { ok: false, status: r.status, body: body.slice(0, 200) };
  } catch (e) {
    return { ok: false, status: 0, body: 'network: ' + (e.message || String(e)) };
  }
}

export async function logout() {
  await fetch('/api/peer?action=auth', { method: 'DELETE', credentials: 'same-origin' });
}

// ---------------- Data fetch ----------------

export async function fetchProfiles() {
  const r = await fetch('/api/peer?action=profiles', { credentials: 'same-origin' });
  if (r.status === 401) { window.location.href = '/peer'; return null; }
  if (!r.ok) throw new Error(`profiles ${r.status}`);
  const j = await r.json();
  return j.profiles || [];
}

export async function fetchMessages(profile, sinceId = 0, raw = false) {
  const url = `/api/peer?action=messages&profile=${encodeURIComponent(profile)}&since_id=${sinceId}&raw=${raw ? 1 : 0}`;
  const r = await fetch(url, { credentials: 'same-origin' });
  if (r.status === 401) { window.location.href = '/peer'; return null; }
  if (!r.ok) throw new Error(`messages ${r.status}`);
  const j = await r.json();
  return j.messages || [];
}

// ---------------- Format helpers ----------------

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function relTime(iso) {
  if (!iso) return '没有消息';
  const t = new Date(iso);
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  return Math.floor(diff / 86400) + ' 天前';
}

export function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: '2-digit', day: '2-digit',
  });
}

export function fmtDateLong(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

export function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
}

// ---------------- Stats derivation ----------------
// Compute KPIs and series from a flat list of messages (across profiles).
// Each message: { profile, ts, role, content, ... }

export function computeStats(messages, profiles = []) {
  const now = Date.now();
  const dayMs = 86400000;
  const today = now - 24 * 3600 * 1000;
  const yest  = now - 48 * 3600 * 1000;
  const week  = now - 7 * dayMs;

  // 7-day daily series (oldest→newest)
  const series = new Array(7).fill(0).map((_, i) => ({
    label: new Date(now - (6 - i) * dayMs).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    value: 0,
    userValue: 0,
    botValue: 0,
  }));

  let userTotal = 0, botTotal = 0, toolTotal = 0;
  let userToday = 0, userYest = 0;
  const perProfile = new Map();
  const perHour = new Array(24).fill(0);

  for (const m of messages) {
    const t = new Date(m.ts).getTime();
    if (!Number.isFinite(t)) continue;
    if (now - t > 7 * dayMs) continue; // last 7 days only

    const dayIdx = 6 - Math.floor((now - t) / dayMs);
    if (dayIdx >= 0 && dayIdx < 7) {
      series[dayIdx].value++;
      if (m.role === 'user') series[dayIdx].userValue++;
      else if (m.role === 'assistant') series[dayIdx].botValue++;
    }

    if (m.role === 'user') {
      userTotal++;
      if (t > today) userToday++;
      else if (t > yest) userYest++;
    } else if (m.role === 'assistant') botTotal++;
    else if (m.role === 'tool') toolTotal++;

    const p = m.profile || 'unknown';
    perProfile.set(p, (perProfile.get(p) || 0) + (m.role === 'user' || m.role === 'assistant' ? 1 : 0));

    const hour = new Date(t).getHours();
    perHour[hour]++;
  }

  const activeProfiles = profiles.filter(p => p.last_message_ts && (now - new Date(p.last_message_ts).getTime()) < week).length;

  // Avg bot response latency (rough estimate): for each user msg, look for the next assistant msg
  // within 15min on same profile. Skip if gap > 15min (likely cross-session).
  const sorted = [...messages].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const byProfile = new Map();
  for (const m of sorted) {
    const k = m.profile || 'unknown';
    if (!byProfile.has(k)) byProfile.set(k, []);
    byProfile.get(k).push(m);
  }
  const lats = [];
  for (const arr of byProfile.values()) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].role !== 'user') continue;
      const next = arr[i + 1];
      if (next.role !== 'assistant') continue;
      const dt = (new Date(next.ts) - new Date(arr[i].ts)) / 1000;
      if (dt >= 0 && dt < 900) lats.push(dt);
    }
  }
  lats.sort((a, b) => a - b);
  const medianLat = lats.length ? lats[Math.floor(lats.length / 2)] : null;

  return {
    series,
    totals: { user: userTotal, bot: botTotal, tool: toolTotal },
    userToday,
    userYest,
    activeProfiles,
    profileBreakdown: [...perProfile.entries()].sort((a, b) => b[1] - a[1]),
    perHour,
    medianLat,
  };
}

// ---------------- Sparkline / Inline charts ----------------

// Render an SVG sparkline into an element. Values: array of numbers.
export function renderSpark(el, values, opts = {}) {
  if (!el) return;
  const w = opts.width || 320;
  const h = opts.height || 64;
  const pad = 4;
  const n = values.length;
  if (n < 2) { el.innerHTML = ''; return; }
  const max = Math.max(...values, 1);
  const min = 0;
  const span = Math.max(1, max - min);
  const dx = (w - pad * 2) / (n - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * dx;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = linePath + ` L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  const last = pts[pts.length - 1];
  el.innerHTML = `
    <svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path class="area" d="${areaPath}"/>
      <path class="line" d="${linePath}"/>
      <circle class="dot" cx="${last[0]}" cy="${last[1]}" r="2.6"/>
    </svg>`;
}

// Render a horizontal bar chart from [{label, value}, ...]
export function renderBars(el, rows, opts = {}) {
  if (!el) return;
  if (!rows || rows.length === 0) { el.innerHTML = '<div class="empty">无数据</div>'; return; }
  const max = Math.max(...rows.map((r) => r.value), 1);
  el.innerHTML = `
    <div class="bar-chart">
      ${rows.map((r) => {
        const pct = (r.value / max) * 100;
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(r.label)}</div>
            <div class="bar-track"><div class="bar-fill${r.muted ? ' muted' : ''}" style="width:${pct}%"></div></div>
            <div class="bar-value">${fmtNumber(r.value)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

// ---------------- Top nav (auto-active) ----------------

export function mountNav(activePath) {
  const html = `
    <header class="peer-header">
      <nav class="peer-nav" aria-label="Peer navigation">
        <a href="/peer/demo"     data-path="/peer/demo"><span class="n">00</span> 概览</a>
        <a href="/peer"          data-path="/peer"><span class="n">01</span> Dashboard</a>
        <a href="/peer/timeline" data-path="/peer/timeline"><span class="n">02</span> Timeline</a>
        <a href="/peer/pipeline" data-path="/peer/pipeline"><span class="n">03</span> Pipeline</a>
      </nav>
    </header>
  `;
  const container = document.getElementById('peer-nav') || document.body;
  if (container === document.body) document.body.insertAdjacentHTML('afterbegin', html);
  else container.innerHTML = html;

  const here = activePath || window.location.pathname.replace(/\/$/, '') || '/peer';
  $$('.peer-nav a').forEach((a) => {
    if (a.dataset.path === here) a.classList.add('active');
  });
}

// ---------------- Decoration rails ----------------

export function mountRails(label = 'PEER · 心涟 OPS · 多 PROFILE 监控') {
  const html = `
    <div class="rail rail--left"><span>${escapeHtml(label)} ——</span></div>
    <div class="rail rail--right"><span>多 profile · 实时 · 拦截 · 校准</span></div>
    <div class="rail rail--bottom"><span class="url">PEER · 心涟 / Hermes-backed</span></div>
  `;
  document.body.insertAdjacentHTML('afterbegin', html);
}

// ---------------- Clean message content (shared with chat) ----------------

export function cleanContent(content, role) {
  if (!content) return '';
  let c = content;
  if (role === 'user') {
    if (c.startsWith('[System note')) {
      const split = c.indexOf(']\n\n');
      if (split !== -1) c = c.slice(split + 3);
      else {
        const s2 = c.indexOf(']\n');
        if (s2 !== -1) c = c.slice(s2 + 2);
      }
    }
    if (c.startsWith('[CONTEXT COMPACTION')) return null;
    if (c.includes('[The user sent an image')) c = '[图片]';
    else if (c.includes('[The user sent a voice')) c = '[语音]';
  } else if (role === 'assistant') {
    if (c.startsWith('`onboarding') || c.includes('需要进入')) return null;
    if (c.trim().startsWith('{')) return null;
  }
  return c;
}
