// /api/mcp — native MCP server (data spine) + the public-demo read proxy.
//
// Exposes Ripple's wellness data over JSON-RPC 2.0 (any MCP client) and a simple
// { tool, arguments } browser shape. The user is ALWAYS derived from the bearer
// JWT via userOr() — never from client-supplied args/path (that was the IDOR).
// Logged-out callers resolve to the public 'demo' user; logged-in callers get
// their own data. Reads are service-role; sensitive tables stay RLS-blocked.
//
// JSON-RPC: initialize · tools/list · tools/call · ping
// Tools: get_current_vitals · get_baseline_deviation(metric?)

import { sbQuery } from './_lib/supabase.js';
import { userOr } from './_lib/jwt.js';

const TOOLS = [
  {
    name: 'get_current_vitals',
    description:
      'Latest reading per health metric for the authenticated user (heart_rate, hrv_sdnn, resting_heart_rate, respiratory_rate, spo2, sleep_hours, sleep_efficiency, step_count, active_energy), straight from Supabase.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_baseline_deviation',
    description:
      "Per-metric personal baseline (7d/30d mean + std) for the authenticated user and how the latest 7-day mean deviates from it. Optionally filter to one metric.",
    inputSchema: {
      type: 'object',
      properties: { metric: { type: 'string', description: 'Optional metric to filter (e.g. hrv_sdnn)' } },
    },
  },
];

async function get_current_vitals(user) {
  const rows = await sbQuery(
    'v_latest_per_metric',
    `user_id=eq.${encodeURIComponent(user)}&select=metric,value,ts,min_val,max_val,source&order=metric`,
  );
  return { user_id: user, metrics: rows || [], count: Array.isArray(rows) ? rows.length : 0 };
}

async function get_baseline_deviation(user, metric) {
  let qs =
    `user_id=eq.${encodeURIComponent(user)}` +
    `&select=metric,baseline_mean,baseline_std,last_7d_mean,deviation,deviation_pct,status,updated_at&order=metric`;
  if (metric) qs += `&metric=eq.${encodeURIComponent(String(metric))}`;
  const rows = await sbQuery('baseline', qs);
  return { user_id: user, baselines: rows || [], count: Array.isArray(rows) ? rows.length : 0 };
}

// name → fn(user, args). args.user_id is intentionally ignored (anti-IDOR).
const HANDLERS = {
  get_current_vitals: (user) => get_current_vitals(user),
  get_baseline_deviation: (user, args) => get_baseline_deviation(user, args?.metric),
};

async function runTool(name, user, args) {
  const fn = HANDLERS[name];
  if (!fn) throw { code: -32602, message: `unknown tool: ${name}` };
  return fn(user, args && typeof args === 'object' ? args : {});
}

function cors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
}

// Read-proxy for the dashboard. The user_id is FORCED to the resolved user
// (authed UUID, else 'demo') — any client-supplied user_id in the path is
// stripped. Only healthlog/baseline, read-only via service-role.
const READ_TABLES = /^(healthlog|baseline)\?(.*)$/;
async function dataRead(path, req, res) {
  res.setHeader('cache-control', 'no-store');
  const m = READ_TABLES.exec(path);
  if (!m) { res.status(403).json({ error: 'read-proxy: only healthlog / baseline' }); return; }
  const user = await userOr(req); // authed UUID, else 'demo'
  const cleaned = m[2].split('&').filter((p) => p && !p.startsWith('user_id=')).join('&');
  const qs = `user_id=eq.${encodeURIComponent(user)}` + (cleaned ? '&' + cleaned : '');
  const data = await sbQuery(m[1], qs);
  res.status(200).json(data ?? []);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET') {
    const path = req.query?.path;
    if (path) return dataRead(String(path), req, res);
    res.status(200).json({
      server: 'ripple',
      version: '0.1.0',
      transport: 'json-rpc-2.0',
      tools: TOOLS.map((t) => t.name),
    });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const ruser = await userOr(req); // authed UUID, else 'demo' — never from client input

  // --- Back-compat: simple browser shape { tool, arguments } ---
  if (body.tool && !body.method) {
    const tool = String(body.tool).trim();
    const started = Date.now();
    try {
      const data = await runTool(tool, ruser, body.arguments);
      res.status(200).json({ ok: true, tool, source: 'native', elapsed_ms: Date.now() - started, unwrapped: data });
    } catch (e) {
      res.status(e?.code === -32602 ? 400 : 500).json({ ok: false, tool, error: e?.message || String(e) });
    }
    return;
  }

  // --- JSON-RPC 2.0 ---
  const { id = null, method, params = {} } = body;
  const reply = (payload) => res.status(200).json({ jsonrpc: '2.0', id, ...payload });

  try {
    if (method === 'initialize') {
      return reply({
        result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ripple', version: '0.1.0' } },
      });
    }
    if (method === 'tools/list') return reply({ result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const data = await runTool(params?.name, ruser, params?.arguments);
      return reply({ result: { content: [{ type: 'text', text: JSON.stringify(data) }] } });
    }
    if (method === 'ping') return reply({ result: {} });
    return reply({ error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    return reply({ error: { code: e?.code || -32603, message: e?.message || String(e) } });
  }
}
