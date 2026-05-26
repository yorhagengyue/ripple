// src/RippleSiteTour.tsx
// Screenshot pan across the live Ripple site pages. Each page slides in,
// holds for ~1.5s with a slow Ken Burns zoom, then the next one slides in.
//
// Duration: ~22 sec = 660 frames at 30fps.

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';
import sitePipeline from './assets/site-pipeline.png';
import siteChat from './assets/site-chat.png';
import siteTimeline from './assets/site-timeline.png';

const Bg = styled.div`
  background: #1a1a1a;
  width: 100%;
  height: 100%;
  padding: 80px 100px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #f1ecdf;
  overflow: hidden;
`;

const Eyebrow = styled.div`
  font-family: Hack, monospace;
  font-size: 22px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 18px;
`;

const Head = styled.h2`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 72px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.022em;
  margin: 0 0 30px;
  em {
    font-style: italic;
    color: #e89b88;
  }
`;

const Frame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 760px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(241, 236, 223, 0.14);
  background: #f1ecdf;
`;

type Shot = {
  src: string;
  label: string;
  caption: string;
};

const shots: Shot[] = [
  {
    src: sitePipeline,
    label: '/pipeline',
    caption: 'Three beats — ingest · watchdog · MCP tools.',
  },
  {
    src: siteChat,
    label: '/chat',
    caption: 'Live vitals on the left. Kimi, reading them, on the right.',
  },
  {
    src: siteTimeline,
    label: '/timeline',
    caption: 'Fourteen-day drift-and-recovery narrative.',
  },
];

const Caption = styled.div<{op: number}>`
  position: absolute;
  left: 24px;
  bottom: 24px;
  background: rgba(26, 26, 26, 0.82);
  backdrop-filter: blur(6px);
  color: #f1ecdf;
  padding: 14px 20px;
  border-radius: 6px;
  opacity: ${(p) => p.op};
  max-width: 720px;

  .lbl {
    font-family: Hack, monospace;
    font-size: 16px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #c8472d;
  }
  .cap {
    font-size: 22px;
    line-height: 1.4;
    margin-top: 6px;
    font-family: 'Manrope', sans-serif;
    color: #f1ecdf;
  }
`;

// Each shot slot gets 220 frames (~7.3s) — slight overlap handled by parent Sequence.
const SHOT_DURATION = 220;

export const RippleSiteTour: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Head enters in first 20 frames
  const headOp = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Which shot are we on?
  const idx = Math.min(shots.length - 1, Math.floor(frame / SHOT_DURATION));
  const local = frame - idx * SHOT_DURATION;

  const shot = shots[idx];
  const enter = spring({frame: local, fps, config: {damping: 40, stiffness: 110}});
  const exit = interpolate(
    local,
    [SHOT_DURATION - 18, SHOT_DURATION],
    [1, 0.4],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // Ken Burns — slow zoom 1.0 → 1.08 over the slot
  const zoom = interpolate(local, [0, SHOT_DURATION], [1.02, 1.08]);
  const translateX = interpolate(local, [0, SHOT_DURATION], [0, -20]);
  const slideIn = (1 - enter) * 60;
  const op = enter * exit;

  const captionOp = interpolate(local, [20, 40, SHOT_DURATION - 30, SHOT_DURATION - 10],
    [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <Bg>
      <Eyebrow style={{opacity: headOp}}>// 03 / The live site</Eyebrow>
      <Head style={{opacity: headOp}}>
        Ripple is <em>online</em>, right now.
      </Head>

      <Frame style={{opacity: op, transform: `translateX(${slideIn}px)`}}>
        <img
          src={shot.src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            transform: `scale(${zoom}) translateX(${translateX}px)`,
            transformOrigin: 'center center',
            transition: 'none',
          }}
          alt={shot.label}
        />
        <Caption op={captionOp}>
          <div className="lbl">{shot.label}</div>
          <div className="cap">{shot.caption}</div>
        </Caption>
      </Frame>
    </Bg>
  );
};
