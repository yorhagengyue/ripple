// /api/mcp — native MCP server (replaces the Workato MCP proxy at /api/mcp/call).
//
// Exposes Ripple's wellness data spine over JSON-RPC 2.0 so any MCP client
// (Claude Desktop, Cursor, Codex, …) can read it directly from Supabase —
// no Workato in the path. Also accepts a simple { tool, arguments } body so the
// in-browser /pipeline "Try it live" demo keeps working (back-compat with the
// old proxy's response shape: { ok, tool, unwrapped }).
//
// JSON-RPC methods: initialize · tools/list · tools/call · ping
// Tools: get_current_vitals(user_id?) · get_baseline_deviation(user_id?, metric?)
//
// NOTE: single-user demo — reads default to DEMO_USER. Per-user auth lands in M2.

import { sbQuery, DEMO_USER } from './_lib/supabase.js';

const TOOLS = [
  {
    name: 'get_current_vitals',
    description:
      'Latest reading per health metric for a user (heart_rate, hrv_sdnn, resting_heart_rate, respiratory_rate, spo2, sleep_hours, sleep_efficiency, step_count, active_energy), straight from Supabase.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'Ripple user id (defaults to the demo user)' },
      },
    },
  },
  {
    name: 'get_baseline_deviation',
    description:
      "Per-metric personal baseline (7d/30d mean + std) and how the latest 7-day mean deviates from it. Optionally filter to one metric.",
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'Ripple user id (defaults to the demo user)' },
        metric: { type: 'string', description: 'Optional metric to filter (e.g. hrv_sdnn)' },
      },
    },
  },
];

async function get_current_vitals(args) {
  const user = String(args.user_id || DEMO_USER);
  const rows = await sbQuery(
    'v_latest_per_metric',
    `user_id=eq.${encodeURIComponent(user)}&select=metric,value,ts,min_val,max_val,source&order=metric`,
  );
  return { user_id: user, metrics: rows || [], count: Array.isArray(rows) ? rows.length : 0 };
}

async function get_baseline_deviation(args) {
  const user = String(args.user_id || DEMO_USER);
  let qs =
    `user_id=eq.${encodeURIComponent(user)}` +
    `&select=metric,baseline_mean,baseline_std,last_7d_mean,deviation,deviation_pct,status,updated_at&order=metric`;
  if (args.metric) qs += `&metric=eq.${encodeURIComponent(String(args.metric))}`;
  const rows = await sbQuery('baseline', qs);
  return { user_id: user, baselines: rows || [], count: Array.isArray(rows) ? rows.length : 0 };
}

const HANDLERS = { get_current_vitals, get_baseline_deviation };

async function runTool(name, args) {
  const fn = HANDLERS[name];
  if (!fn) throw { code: -32602, message: `unknown tool: ${name}` };
  return fn(args && typeof args === 'object' ? args : {});
}

function cors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // GET → discovery / health
  if (req.method === 'GET') {
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

  // --- Back-compat: simple browser shape { tool, arguments } (old /api/mcp/call) ---
  if (body.tool && !body.method) {
    const tool = String(body.tool).trim();
    const args = (body.arguments && typeof body.arguments === 'object') ? body.arguments : {};
    const started = Date.now();
    try {
      const data = await runTool(tool, args);
      res.status(200).json({ ok: true, tool, source: 'native', elapsed_ms: Date.now() - started, unwrapped: data });
    } catch (e) {
      res.status(e?.code === -32602 ? 400 : 500).json({ ok: false, tool, error: e?.message || String(e) });
    }
    return;
  }

  // --- JSON-RPC 2.0 (real MCP clients) ---
  const { id = null, method, params = {} } = body;
  const reply = (payload) => res.status(200).json({ jsonrpc: '2.0', id, ...payload });

  try {
    if (method === 'initialize') {
      return reply({
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'ripple', version: '0.1.0' },
        },
      });
    }
    if (method === 'tools/list') return reply({ result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const data = await runTool(params?.name, params?.arguments);
      return reply({ result: { content: [{ type: 'text', text: JSON.stringify(data) }] } });
    }
    if (method === 'ping') return reply({ result: {} });
    return reply({ error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    return reply({ error: { code: e?.code || -32603, message: e?.message || String(e) } });
  }
}
