// Quick harness for the native MCP server (api/mcp.js). Loads .env, invokes the
// handler with mock req/res over both transports (JSON-RPC + simple browser shape).
//   node scripts/test-mcp.mjs
import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  if (/^\s*#/.test(line)) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2];
}

const { default: handler } = await import('../api/mcp.js');

function mockRes() {
  const res = { _status: 200, _json: null, _headers: {} };
  res.setHeader = (k, v) => { res._headers[k] = v; };
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  res.end = () => res;
  return res;
}
async function call(body, method = 'POST') {
  const res = mockRes();
  await handler({ method, body }, res);
  return res;
}
const show = (label, r) => console.log(`\n${label} -> HTTP ${r._status}\n`, JSON.stringify(r._json, null, 2).slice(0, 700));

show('tools/list', await call({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
show('tools/call get_current_vitals (JSON-RPC)', await call({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_current_vitals', arguments: {} } }));
show('get_current_vitals (browser shape)', await call({ tool: 'get_current_vitals', arguments: {} }));
show('get_baseline_deviation default user (030607 — empty, proves YOR-77 bug)', await call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_baseline_deviation', arguments: {} } }));
show('get_baseline_deviation user_id=tommychen (where the rows actually are)', await call({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_baseline_deviation', arguments: { user_id: 'tommychen' } } }));
show('unknown method', await call({ jsonrpc: '2.0', id: 5, method: 'tools/bogus' }));
