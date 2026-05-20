// src/RippleArchitecture.tsx
// Animated data-flow diagram: Apple Watch → HAE → Workato → Supabase,
// then Workato splits into (a) Kimi chat (b) MCP server → Claude/Codex/Cursor.
// SVG lines draw in sequentially. Node chips fade in ahead of each line.

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  padding: 100px 100px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #1a1a1a;
  position: relative;
  overflow: hidden;
`;

const Eyebrow = styled.div`
  font-family: Hack, monospace;
  font-size: 22px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 24px;
`;

const Head = styled.h2`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 88px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.022em;
  margin: 0 0 42px;
  em {
    font-style: italic;
    color: #c8472d;
  }
`;

// Node positions in a 1720x700 SVG (so they align with chip positions)
// Layout (rough):
//           WATCH(120) — HAE(380) — WORKATO(720) — SUPABASE(1060) — MCP(1400) — AIs(1620)
// Forks from Workato go: up to Kimi, right to SUPA→MCP fan-out
// All on one horizontal band y=350
type Node = {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  color: string; // accent strip
};

const nodes: Node[] = [
  {id: 'watch',   label: 'Apple Watch',      sub: 'HealthKit',          x: 120,  y: 350, color: '#1a1a1a'},
  {id: 'hae',     label: 'Health Auto Export', sub: 'iOS → JSON',       x: 420,  y: 350, color: '#b38947'},
  {id: 'wkt',     label: 'Workato',          sub: 'recipes · spine',    x: 760,  y: 350, color: '#c8472d'},
  {id: 'supa',    label: 'Supabase',         sub: 'healthlog + baseline', x: 1100,y: 350, color: '#1a1a1a'},
  {id: 'mcp',     label: 'Workato MCP',      sub: '4 tools exposed',    x: 1400, y: 350, color: '#c8472d'},
  {id: 'ai',      label: 'any AI client',    sub: 'Claude · Codex · Cursor', x: 1700, y: 350, color: '#7a7266'},
];

// Arrows between adjacent nodes (as indexes into nodes[])
const arrows: {from: number; to: number}[] = [
  {from: 0, to: 1},
  {from: 1, to: 2},
  {from: 2, to: 3},
  {from: 3, to: 4},
  {from: 4, to: 5},
];

const Chip = styled.div<{op: number; y: number; accent: string}>`
  position: absolute;
  padding: 14px 20px 16px;
  background: #1a1a1a;
  color: #f1ecdf;
  border-radius: 8px;
  min-width: 200px;
  text-align: center;
  opacity: ${(p) => p.op};
  transform: translate(-50%, calc(-50% + ${(p) => p.y}px));
  box-shadow: 0 12px 28px -16px rgba(26, 26, 26, 0.5);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    pointer-events: none;
    border: 1.5px solid ${(p) => p.accent};
    opacity: 0.5;
  }
`;

const ChipTitle = styled.div`
  font-family: 'Manrope', sans-serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.005em;
`;

const ChipSub = styled.div`
  font-family: Hack, monospace;
  font-size: 13px;
  color: #c8c0a8;
  margin-top: 4px;
  letter-spacing: 0.05em;
`;

export const RippleArchitecture: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Each chip enters 9 frames after the previous
  const chipDelay = 9;
  const getChipSpring = (i: number) =>
    spring({
      frame: frame - (5 + i * chipDelay),
      fps,
      config: {damping: 40, stiffness: 120},
    });

  // Each arrow draws after its target chip has appeared
  const getArrowProgress = (i: number) =>
    interpolate(
      frame,
      [5 + (i + 1) * chipDelay - 2, 5 + (i + 1) * chipDelay + 10],
      [0, 1],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
    );

  return (
    <Bg>
      <Eyebrow>// 02 / Architecture</Eyebrow>
      <Head>
        One spine. <em>Many surfaces.</em>
      </Head>

      {/* SVG canvas 1720 x 420 for arrows — overlays on top of chips */}
      <div style={{position: 'relative', width: '100%', height: 500, marginTop: 60}}>
        <svg
          viewBox="0 0 1820 500"
          preserveAspectRatio="xMidYMid meet"
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
        >
          {arrows.map((a, i) => {
            const from = nodes[a.from];
            const to = nodes[a.to];
            const progress = getArrowProgress(i);
            const gap = 115; // skip past chip edge
            const x1 = from.x + gap;
            const x2 = to.x - gap;
            const cx = x1 + (x2 - x1) * progress;
            return (
              <g key={i}>
                {/* full line dashed faint */}
                <line
                  x1={x1}
                  x2={x2}
                  y1={from.y}
                  y2={to.y}
                  stroke="rgba(26,26,26,0.14)"
                  strokeWidth={1.5}
                  strokeDasharray="3 5"
                />
                {/* progressed solid line */}
                <line
                  x1={x1}
                  x2={cx}
                  y1={from.y}
                  y2={to.y}
                  stroke="#c8472d"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* dot at the advancing tip */}
                {progress > 0 && progress < 1 ? (
                  <circle cx={cx} cy={to.y} r={4} fill="#c8472d" />
                ) : null}
              </g>
            );
          })}
        </svg>

        {nodes.map((n, i) => {
          const op = getChipSpring(i);
          return (
            <Chip
              key={n.id}
              op={op}
              y={(1 - op) * 12}
              accent={n.color}
              style={{left: `${(n.x / 1820) * 100}%`, top: `${(n.y / 500) * 100}%`}}
            >
              <ChipTitle>{n.label}</ChipTitle>
              <ChipSub>{n.sub}</ChipSub>
            </Chip>
          );
        })}
      </div>
    </Bg>
  );
};
