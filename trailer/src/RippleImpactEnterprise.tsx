// src/RippleImpactEnterprise.tsx
// Impact scene 2 — Enterprise / ML. Three product categories running on the same
// recipe library: group insurance, EAP, population-ML training.
// Duration target: 540 frames (18s @ 30fps).

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #1a1a1a;
  width: 100%;
  height: 100%;
  padding: 80px 110px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #f1ecdf;
  overflow: hidden;
`;

const Eyebrow = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #e89b88;
  margin-bottom: 18px;
  opacity: ${(p) => p.op};
`;

const Head = styled.h2<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 64px;
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.022em;
  margin: 0 0 14px;
  max-width: 1560px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em { font-style: italic; color: #e89b88; }
`;

const Sub = styled.div<{op: number}>`
  font-size: 20px;
  line-height: 1.5;
  color: #c8c0a8;
  max-width: 1200px;
  margin-bottom: 42px;
  opacity: ${(p) => p.op};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  max-width: 1700px;
  margin-bottom: 34px;
`;

const Card = styled.div<{op: number; y: number}>`
  border: 1px solid rgba(241, 236, 223, 0.16);
  border-radius: 10px;
  background: rgba(241, 236, 223, 0.03);
  padding: 26px 26px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  .tag {
    font-family: Hack, monospace;
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #e89b88;
    margin-bottom: 10px;
  }
  .title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 30px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.012em;
    color: #f1ecdf;
    margin-bottom: 12px;
  }
  .body {
    font-size: 17px;
    line-height: 1.5;
    color: rgba(241, 236, 223, 0.78);

    code {
      font-family: Hack, monospace;
      font-size: 15px;
      background: rgba(241, 236, 223, 0.06);
      padding: 2px 6px;
      border-radius: 3px;
      color: #e89b88;
    }
  }
`;

const Callout = styled.div<{op: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 28px;
  line-height: 1.4;
  color: rgba(241, 236, 223, 0.88);
  padding-left: 22px;
  border-left: 2px solid #c8472d;
  max-width: 1500px;
  opacity: ${(p) => p.op};

  strong {
    font-style: normal;
    font-weight: 500;
    color: #e89b88;
  }
`;

export const RippleImpactEnterprise: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const subOp = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const c1 = spring({frame: frame - 40, fps, config: {damping: 44, stiffness: 120}});
  const c2 = spring({frame: frame - 58, fps, config: {damping: 44, stiffness: 120}});
  const c3 = spring({frame: frame - 76, fps, config: {damping: 44, stiffness: 120}});
  const callout = interpolate(frame, [300, 330], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Bg>
      <Eyebrow op={eyebrowOp}>// 05b / Impact · Enterprise and ML</Eyebrow>
      <Head op={head} y={(1 - head) * 18}>
        Aggregate signal — <em>underwriting, EAP, and workforce analytics.</em>
      </Head>
      <Sub op={subOp}>
        Consented biomarker streams become three product categories — one recipe library, scoped to aggregated views.
      </Sub>

      <Row>
        <Card op={c1} y={(1 - c1) * 14}>
          <div className="tag">Insurance</div>
          <div className="title">Group Health · actuarial-grade autonomic signal</div>
          <div className="body">
            Premiums move from self-reported health and age to actual recovery, sleep, and autonomic signal — at the cohort level.
          </div>
        </Card>
        <Card op={c2} y={(1 - c2) * 14}>
          <div className="tag">HR-tech</div>
          <div className="title">EAP · team-level drift, not individual readings</div>
          <div className="body">
            When three or more employees drift into watch status, the portal surfaces a confidential support prompt. Managers never see rows.
          </div>
        </Card>
        <Card op={c3} y={(1 - c3) * 14}>
          <div className="tag">Population ML</div>
          <div className="title">Labelled substrate · anomaly / depression / recovery models</div>
          <div className="body">
            Workato export becomes a consent-aware feature store — per-user opt-in enforced at <code>recipe</code> execution time.
          </div>
        </Card>
      </Row>

      <Callout op={callout}>
        Recipe JSON <strong>is</strong> the data-use agreement — immutable, auditable, portable.
      </Callout>
    </Bg>
  );
};
