// src/RippleWorkatoRecipes.tsx
// Arch sub-scene — REAL screenshot of the Workato "Ripple" project recipe list.
// Ken Burns zoom + caption overlay. No styled mocks.
// Duration target: 240 frames (8s @ 30fps).

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';
import wktRecipes from './assets/wkt-recipes.png';

const Bg = styled.div`
  background: #1a1a1a;
  width: 100%;
  height: 100%;
  padding: 72px 96px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #f1ecdf;
  overflow: hidden;
`;

const Eyebrow = styled.div`
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 16px;
`;

const Head = styled.h2`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 64px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.022em;
  margin: 0 0 24px;
  em { font-style: italic; color: #e89b88; }
`;

const Frame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 780px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(241, 236, 223, 0.14);
  background: #faf6ec;
  box-shadow: 0 30px 60px -35px rgba(0,0,0,0.6);
`;

const Caption = styled.div<{op: number}>`
  position: absolute;
  left: 24px;
  bottom: 24px;
  background: rgba(26, 26, 26, 0.88);
  backdrop-filter: blur(6px);
  color: #f1ecdf;
  padding: 14px 20px;
  border-radius: 6px;
  opacity: ${(p) => p.op};
  max-width: 720px;
  border-left: 3px solid #c8472d;

  .lbl {
    font-family: Hack, monospace;
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #e89b88;
  }
  .cap {
    font-size: 21px;
    line-height: 1.4;
    margin-top: 4px;
    font-family: 'Manrope', sans-serif;
    color: #f1ecdf;
  }
`;

// Draw-over markers that highlight recipes as the frames advance.
const Highlight = styled.div<{op: number; top: string; left: string; w: string; h: string}>`
  position: absolute;
  top: ${(p) => p.top};
  left: ${(p) => p.left};
  width: ${(p) => p.w};
  height: ${(p) => p.h};
  border: 2px solid #c8472d;
  border-radius: 6px;
  box-shadow: 0 0 0 6px rgba(200,71,45,0.18);
  opacity: ${(p) => p.op};
  pointer-events: none;
`;

export const RippleWorkatoRecipes: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const frameIn = spring({frame: frame - 20, fps, config: {damping: 40, stiffness: 120}});

  // Ken Burns — slow zoom 1.04 → 1.12 over full duration
  const zoom = interpolate(frame, [0, 240], [1.04, 1.12]);
  const pan = interpolate(frame, [0, 240], [0, -18]);

  const captionOp = interpolate(frame, [30, 50, 210, 234], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Highlight recipes sequentially: live_hr_alert_demo at ~60f, get_current_vitals at ~110f, send_contextual_nudge at ~160f
  const hi1 = interpolate(frame, [60, 74, 112, 122], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hi2 = interpolate(frame, [118, 132, 170, 180], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hi3 = interpolate(frame, [176, 190, 220, 230], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <Bg>
      <Eyebrow style={{opacity: eyebrowOp}}>// 02a / Workato · Ripple project</Eyebrow>
      <Head style={{opacity: head, transform: `translateY(${(1 - head) * 14}px)`}}>
        <em>Six</em> recipes, one project.
      </Head>

      <Frame style={{opacity: frameIn, transform: `translateY(${(1 - frameIn) * 20}px)`}}>
        <img
          src={wktRecipes}
          alt="Workato Ripple project recipe list"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            transform: `scale(${zoom}) translateX(${pan}px)`,
            transformOrigin: 'center center',
          }}
        />

        {/* Sequential highlights — rough bounding boxes on the recipe list */}
        <Highlight op={hi1} top="30%" left="30%" w="55%" h="9%" />
        <Highlight op={hi2} top="19%" left="30%" w="55%" h="9%" />
        <Highlight op={hi3} top="64%" left="30%" w="55%" h="9%" />

        <Caption op={captionOp}>
          <div className="lbl">app.workato.com / projects / Ripple</div>
          <div className="cap">
            Six recipes — ingest, live alert, chatbot, and three MCP skills. All active.
          </div>
        </Caption>
      </Frame>
    </Bg>
  );
};
