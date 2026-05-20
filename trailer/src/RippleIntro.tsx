// src/RippleIntro.tsx
// Cold open (6 sec). Two-line typographic hook, editorial serif vibe.

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Cormorant Garamond', Georgia, serif;
`;

const Stack = styled.div`
  max-width: 1400px;
  padding: 0 80px;
`;

const Line1 = styled.div<{op: number; y: number}>`
  font-size: 128px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: #1a1a1a;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);
`;

const Line2 = styled.div<{op: number; y: number}>`
  font-size: 128px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: #c8472d;
  font-style: italic;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);
  margin-top: 14px;
`;

const Dot = styled.div<{op: number}>`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #c8472d;
  margin-top: 40px;
  opacity: ${(p) => p.op};
`;

export const RippleIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const l1 = spring({frame, fps, config: {damping: 40, stiffness: 120}});
  const l2 = spring({
    frame: frame - 22,
    fps,
    config: {damping: 40, stiffness: 120},
  });
  const dotOp = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Bg>
      <Stack>
        <Line1 op={l1} y={(1 - l1) * 30}>
          The body speaks
        </Line1>
        <Line2 op={l2} y={(1 - l2) * 30}>
          before words do.
        </Line2>
        <Dot op={dotOp} />
      </Stack>
    </Bg>
  );
};
