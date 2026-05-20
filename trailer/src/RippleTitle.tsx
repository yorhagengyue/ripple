// src/RippleTitle.tsx
// Product reveal — big "Ripple" wordmark, subtitle, name-origin line, credit.
// Duration target: 300 frames (10s @ 30fps) — extended from 210 to give the
// origin line time to land.

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Cormorant Garamond', Georgia, serif;
  position: relative;
`;

const TopRule = styled.div<{w: number}>`
  width: ${(p) => p.w}px;
  height: 1.5px;
  background: #c8472d;
  margin-bottom: 48px;
  transition: none;
`;

const Mark = styled.h1<{op: number; s: number}>`
  font-size: 240px;
  font-weight: 500;
  line-height: 0.96;
  color: #1a1a1a;
  letter-spacing: -0.04em;
  margin: 0;
  opacity: ${(p) => p.op};
  transform: scale(${(p) => p.s});
  em {
    font-style: italic;
    color: #c8472d;
  }
`;

const Sub = styled.div<{op: number; y: number}>`
  font-size: 34px;
  line-height: 1.35;
  color: #1a1a1a;
  max-width: 1180px;
  margin-top: 34px;
  text-align: center;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em {
    font-style: italic;
    color: #c8472d;
  }
`;

// Name-origin line — two short sentences tying the word "Ripple" to what it does.
const Origin = styled.div<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 28px;
  line-height: 1.5;
  color: rgba(26, 26, 26, 0.68);
  max-width: 1100px;
  margin-top: 40px;
  padding-top: 28px;
  text-align: center;
  border-top: 1px solid rgba(26, 26, 26, 0.12);
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  strong {
    font-style: normal;
    font-weight: 500;
    color: #c8472d;
  }
`;

const Credit = styled.div<{op: number}>`
  position: absolute;
  bottom: 80px;
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7a7266;
  opacity: ${(p) => p.op};
`;

export const RippleTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const ruleW = interpolate(frame, [0, 30], [0, 280], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mark = spring({frame: frame - 14, fps, config: {damping: 32, stiffness: 120}});
  const sub = spring({frame: frame - 36, fps, config: {damping: 40, stiffness: 110}});
  const origin = spring({frame: frame - 78, fps, config: {damping: 42, stiffness: 100}});
  const credit = interpolate(frame, [170, 190], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Bg>
      <TopRule w={ruleW} />
      <Mark op={mark} s={0.92 + mark * 0.08}>
        Rip<em>p</em>le
      </Mark>
      <Sub op={sub} y={(1 - sub) * 22}>
        An MCP-orchestrated wellness agent, <em>powered by Workato.</em>
      </Sub>
      <Origin op={origin} y={(1 - origin) * 18}>
        Every mood shift starts as a <strong>ripple</strong> in the body —
        a beat skipped, a breath shortened, sleep cut short.
        <br />
        Ripple reads those ripples, long before the words arrive.
      </Origin>
      <Credit op={credit}>Geng Yue · Temasek Polytechnic · Singapore · 2026</Credit>
    </Bg>
  );
};
