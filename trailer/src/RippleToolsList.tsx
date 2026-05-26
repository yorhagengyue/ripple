// src/RippleToolsList.tsx
// Scene B — Claude Code `/mcp` output, the four Workato-backed tools
// appearing one-by-one.
//
// Register in src/Video.tsx as <Composition id="RippleToolsList" /> with
// durationInFrames=180, fps=30, 1920x1080.

import 'hack-font/build/web/hack.css';
import {useCurrentFrame} from 'remotion';
import styled from 'styled-components';

const Container = styled.div`
  background-color: #1a1a1a;
  flex: 1;
  border-radius: 20px;
  padding: 56px 72px;
  font-family: Hack, monospace;
  color: #f1ecdf;
  font-size: 26px;
  line-height: 1.65;
  height: 100%;
  box-sizing: border-box;
`;

type Tool = {
  name: string;
  input: string;
  desc: string;
};

const tools: Tool[] = [
  {
    name: 'get_current_vitals',
    input: '{ user_id }',
    desc: 'Latest HR / HRV / SpO₂ / sleep — straight from healthlog',
  },
  {
    name: 'get_baseline_deviation',
    input: '{ user_id, metric }',
    desc: 'Seven-day drift vs thirty-day baseline, severity-tagged',
  },
  {
    name: 'get_recent_anomaly_log',
    input: '{ user_id, hours }',
    desc: 'Interventions fired in the last N hours, with AI summary',
  },
  {
    name: 'send_contextual_nudge',
    input: '{ user_id, message, urgency }',
    desc: 'Cross-channel outreach via the same Workato orchestration spine',
  },
];

// Each tool appears after this many frames
const TOOL_APPEAR_STEP = 18;
const HEADER_SHOW_AT = 4;

export const RippleToolsList: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Container>
      <div style={{opacity: frame > HEADER_SHOW_AT ? 1 : 0}}>
        <span style={{color: '#e89b88'}}>$</span>{' '}
        <span>claude</span>
        <br />
        <span style={{color: '#9aa0a6'}}>›</span>{' '}
        <span>/mcp</span>
      </div>

      <div style={{height: 12}} />

      {frame > HEADER_SHOW_AT + 8 ? (
        <div style={{color: '#9aa0a6', fontSize: 22, marginBottom: 16}}>
          Connected server:{' '}
          <span style={{color: '#5ef766'}}>ripple</span>{' '}
          <span style={{color: '#9aa0a6'}}>(stdio · mcp-remote → Workato)</span>
        </div>
      ) : null}

      {tools.map((tool, i) => {
        const appearAt = HEADER_SHOW_AT + 16 + i * TOOL_APPEAR_STEP;
        const visible = frame >= appearAt;
        const opacity = visible ? Math.min(1, (frame - appearAt) / 8) : 0;
        return (
          <div
            key={tool.name}
            style={{
              opacity,
              transform: `translateY(${visible ? 0 : 8}px)`,
              transition: 'transform 260ms',
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{color: '#c8472d', fontWeight: 600}}>●</span>{' '}
              <span style={{color: '#f1ecdf', fontWeight: 600}}>
                {tool.name}
              </span>{' '}
              <span style={{color: '#9aa0a6', fontSize: 22}}>
                {tool.input}
              </span>
            </div>
            <div
              style={{
                paddingLeft: 28,
                color: '#c8c0a8',
                fontSize: 22,
                opacity: 0.85,
              }}
            >
              {tool.desc}
            </div>
          </div>
        );
      })}

      {/* Bottom summary after all tools appear */}
      {frame > HEADER_SHOW_AT + 16 + tools.length * TOOL_APPEAR_STEP + 10 ? (
        <div
          style={{
            marginTop: 22,
            color: '#9aa0a6',
            fontSize: 22,
            borderTop: '1px dashed rgba(241,236,223,0.18)',
            paddingTop: 12,
          }}
        >
          4 tools available · governed by Workato recipes · 1 install command
        </div>
      ) : null}
    </Container>
  );
};
