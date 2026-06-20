# Ripple — Wellness Agent

Real-time wellness companion built for the Workato · NAISC 2026 track.

Apple Watch vitals are ingested through Workato recipes into Supabase, then
re-exposed over **MCP** so Claude, Codex, and Cursor read the same governed
data spine that powers the human-facing chat. One source of truth for the
person and for any AI agent.

## Three beats, one spine

1. **Sense** — HealthAutoExport (HAE) posts Apple Watch metrics (heart rate,
   HRV, resting HR, sleep, SpO₂, respiratory rate, active energy, step count)
   to `POST /api/ingest/hae`, which upserts them into the Supabase `healthlog`
   table and forwards the raw payload to the Workato Recipe 1 webhook so the
   Twilio / alert / MCP downstream keeps firing.
2. **Think** — Workato watches each signal against its baseline, opens a
   check-in conversation when something drifts, and fires a context-aware nudge.
3. **Act · Converse** — an MCP server exposes the vitals as callable tools;
   the chat agent answers with the user's actual numbers and logs the session.

## Surfaces

| Path | What it is |
|---|---|
| `/` `ripple/index.html` | Landing + NAISC 2026 film trailer |
| `/timeline` | 14-day interactive vitals chart |
| `/pipeline` | The Sense → Think → Act architecture, explained |
| `/chat` | Live-vitals + conversation workspace |
| `/demo` | Guided walkthrough |
| `/peer` `peer/` | 心涟 — password-gated operator console for reviewing all conversations |

## Stack

- **Frontend** — zero-framework multi-page HTML/CSS/JS, bundled with Vite.
  Shared design tokens live in `colors_and_type.css`.
- **Backend** — Vercel serverless functions under `api/` (chat, analyze-vitals,
  nudge, subscribe, history, explain, Discord, HAE ingest, MCP call, peer auth).
- **Data** — Supabase (`db/*.sql` for schema).
- **Orchestration** — Workato recipes + an MCP server bridging the vitals to
  AI clients.

## Local development

```bash
npm install
npm run dev      # Vite mounts each api/*.js handler at its matching path
```

Configure Supabase / push / integration secrets via environment variables
(`VITE_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, VAPID keys, etc.); see
`vite.config.js` and the individual `api/` handlers for the names each reads.

## Deployment

Vercel (`vercel.json` defines the rewrites and the `framework: vite` build).
