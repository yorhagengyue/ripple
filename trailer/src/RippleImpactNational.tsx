// src/RippleImpactNational.tsx
// Impact scene 3 — National / Institutional. Public health, schools, defense.
// The tenant_id punchline.
// Duration target: 540 frames (18s @ 30fps).

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  padding: 80px 110px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #1a1a1a;
  overflow: hidden;
`;

const Eyebrow = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 18px;
  opacity: ${(p) => p.op};
`;

const Head = styled.h2<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 62px;
  font-weight: 500;
  line-height: 1.06;
  letter-spacing: -0.022em;
  margin: 0 0 42px;
  max-width: 1560px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em { font-style: italic; color: #c8472d; }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  max-width: 1700px;
  margin-bottom: 40px;
`;

const Card = styled.div<{op: number; y: number}>`
  border: 1px solid rgba(26, 26, 26, 0.14);
  border-radius: 10px;
  background: rgba(26, 26, 26, 0.025);
  padding: 26px 26px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  .tag {
    font-family: Hack, monospace;
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #c8472d;
    margin-bottom: 10px;
  }
  .title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 30px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.012em;
    color: #1a1a1a;
    margin-bottom: 12px;
  }
  .body {
    font-size: 17px;
    line-height: 1.5;
    color: rgba(26, 26, 26, 0.78);
  }
`;

const Punch = styled.div<{op: number; y: number}>`
  padding: 22px 30px;
  background: #1a1a1a;
  color: #f1ecdf;
  border-radius: 10px;
  max-width: 1700px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  .lead {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 30px;
    line-height: 1.35;
    letter-spacing: -0.012em;
    color: #f1ecdf;
    em { font-style: italic; color: #e89b88; }
    code {
      font-family: Hack, monospace;
      font-size: 25px;
      background: rgba(241, 236, 223, 0.1);
      padding: 2px 10px;
      border-radius: 4px;
      color: #e89b88;
      margin: 0 4px;
    }
  }
  .tail {
    margin-top: 10px;
    font-family: Hack, monospace;
    font-size: 15px;
    letter-spacing: 0.06em;
    color: rgba(241, 236, 223, 0.6);
  }
`;

export const RippleImpactNational: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const c1 = spring({frame: frame - 34, fps, config: {damping: 44, stiffness: 120}});
  const c2 = spring({frame: frame - 52, fps, config: {damping: 44, stiffness: 120}});
  const c3 = spring({frame: frame - 70, fps, config: {damping: 44, stiffness: 120}});
  const punch = spring({frame: frame - 260, fps, config: {damping: 44, stiffness: 100}});

  return (
    <Bg>
      <Eyebrow op={eyebrowOp}>// 05c / Impact · National and Institutional</Eyebrow>
      <Head op={head} y={(1 - head) * 18}>
        When the unit of analysis becomes the <em>cohort, the population, the formation.</em>
      </Head>

      <Row>
        <Card op={c1} y={(1 - c1) * 14}>
          <div className="tag">Public Health</div>
          <div className="title">National boards · cardiovascular readiness trends</div>
          <div className="body">
            By age cohort and region — no bespoke data-sharing agreements per clinic. Aggregate views only. Governed by default.
          </div>
        </Card>
        <Card op={c2} y={(1 - c2) * 14}>
          <div className="tag">Education</div>
          <div className="title">Schools · warm-ups by actual recovery state</div>
          <div className="body">
            Institutions receive governed aggregate signals through the same recipe library — no new integration surface required.
          </div>
        </Card>
        <Card op={c3} y={(1 - c3) * 14}>
          <div className="tag">Defense · First Responders</div>
          <div className="title">Rotations adapt to measured autonomic state</div>
          <div className="body">
            Soldiers and firefighters recover faster. Injury rates drop. One governed MCP surface — not per-vendor silos.
          </div>
        </Card>
      </Row>

      <Punch op={punch} y={(1 - punch) * 14}>
        <div className="lead">
          Switching scale — from <em>one patient</em> to <em>one nation</em> — is a
          <code>tenant_id</code> change.
        </div>
        <div className="tail">Recipe library · MCP surface · governance posture · all unchanged.</div>
      </Punch>
    </Bg>
  );
};
