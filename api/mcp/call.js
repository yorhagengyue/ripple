// POST /api/mcp/call
// Browser-safe proxy to the Ripple Workato MCP endpoint. Workato's APIM
// returns no CORS headers, so the pipeline page's "Try it live" button
// routes through here instead of hitting Workato directly.
//
// Contract (from browser):
//   POST /api/mcp/call
//   { "tool": "get_current_vitals", "arguments": { "user_id": "..." } }
//
// We wrap it into a JSON-RPC 2.0 tools/call request, POST it to the Workato
// MCP endpoint with the server-side token, and forward the result body back.
//
// Security: the Workato token lives in env WORKATO_MCP_TOKEN (fallback to
// hard-coded trial token since it's already public on the pipeline page).

const MCP_URL   = process.env.WORKATO_MCP_URL   || 'https://1720.apim.mcp.trial.workato.com';
const MCP_TOKEN = process.env.WORKATO_MCP_TOKEN || '3d8ed8f1c0fd618cca590eaaf62759d36d29e21d8e0a4eb5cdaa6a02493bb7cb';

// Allow-list of tools the frontend may invoke. Belt + suspenders — the
// endpoint is already public, but we don't want our proxy to become an
// open wrapper for arbitrary Workato recipes (if more are added later).
const ALLOWED_TOOLS = new Set([
  'get_current_vitals',
  'get_baseline_deviation',
  // 'send_contextual_nudge',  // intentionally NOT allowed from browser demo
]);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const tool = String(body.tool || '').trim();
  const args = (body.arguments && typeof body.arguments === 'object') ? body.arguments : {};

  if (!tool) {
    res.status(400).json({ error: 'missing tool' });
    return;
  }
  if (!ALLOWED_TOOLS.has(tool)) {
    res.status(403).json({ error: `tool "${tool}" not exposed via this proxy`, allowed: [...ALLOWED_TOOLS] });
    return;
  }

  const rpc = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: tool, arguments: args },
  };

  const started = Date.now();
  try {
    const r = await fetch(`${MCP_URL}?wkt_token=${encodeURIComponent(MCP_TOKEN)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(rpc),
    });
    const text = await r.text();
    const elapsed_ms = Date.now() - started;

    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* Workato sometimes returns text/event-stream */ }

    // Unwrap the double-encoded content[].text if present — Workato packs
    // the actual recipe output as a JSON string inside an MCP content block.
    let vitals = null;
    if (parsed?.result?.content?.[0]?.text) {
      try { vitals = JSON.parse(parsed.result.content[0].text); } catch { /* leave as raw */ }
    }

    res.setHeader('access-control-allow-origin', '*');
    res.status(r.ok ? 200 : r.status).json({
      ok: r.ok,
      tool,
      elapsed_ms,
      rpc_id: rpc.id,
      workato_status: r.status,
      rpc: parsed,
      unwrapped: vitals,
      raw: parsed ? undefined : text.slice(0, 2000),
    });
  } catch (e) {
    res.setHeader('access-control-allow-origin', '*');
    res.status(502).json({ ok: false, tool, error: String(e).slice(0, 400), elapsed_ms: Date.now() - started });
  }
}
