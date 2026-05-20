// src/RippleImpactClinical.tsx
// Impact scene 1 — Individual / Clinical. Psychiatrist + cardiologist vignettes
// and the "gap Ripple closes" quote.
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
  font-size: 66px;
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.022em;
  margin: 0 0 44px;
  max-width: 1500px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em { font-style: italic; color: #c8472d; }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-bottom: 42px;
  max-width: 1680px;
`;

const Card = styled.div<{op: number; y: number}>`
  border: 1px solid rgba(26, 26, 26, 0.14);
  border-radius: 10px;
  background: rgba(26, 26, 26, 0.03);
  padding: 28px 30px;
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
    font-size: 34px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.012em;
    color: #1a1a1a;
    margin-bottom: 14px;
  }
  .body {
    font-size: 19px;
    line-height: 1.5;
    color: rgba(26, 26, 26, 0.78);

    code {
      font-family: Hack, monospace;
      font-size: 17px;
      background: rgba(26, 26, 26, 0.06);
      padding: 2px 6px;
      border-radius: 3px;
      color: #c8472d;
    }
  }
`;

const Quote = styled.blockquote<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 44px;
  line-height: 1.3;
  letter-spacing: -0.012em;
  color: #1a1a1a;
  margin: 0;
  padding: 0 0 0 22px;
  border-left: 3px solid #c8472d;
  max-width: 1600px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  strong {
    font-style: normal;
    font-weight: 500;
    color: #c8472d;
  }
`;

export const RippleImpactClinical: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const card1 = spring({frame: frame - 28, fps, config: {damping: 42, stiffness: 120}});
  const card2 = spring({frame: frame - 46, fps, config: {damping: 42, stiffness: 120}});
  const quote = spring({frame: frame - 210, fps, config: {damping: 44, stiffness: 100}});

  return (
    <Bg>
      <Eyebrow op={eyebrowOp}>// 05a / Impact · Individual and Clinical</Eyebrow>
      <Head op={head} y={(1 - head) * 18}>
        Continuous monitoring — <em>mental illness and chronic conditions.</em>
      </Head>

      <Row>
        <Card op={card1} y={(1 - card1) * 14}>
          <div className="tag">Psychiatry</div>
          <div className="title">Bipolar · HRV collapse before the shift</div>
          <div className="body">
            HRV collapses <strong>hours before</strong> a manic or depressive shift becomes behavioral.
            The clinician's EHR assistant calls <code>get_baseline_deviation</code> inside its normal loop.
          </div>
        </Card>
        <Card op={card2} y={(1 - card2) * 14}>
          <div className="tag">Cardiology</div>
          <div className="title">Post-discharge · arrhythmia drift, live</div>
          <div className="body">
            Resting HR drift in near real-time — instead of waiting for the next scheduled follow-up.
            One source of truth. Never desynced.
          </div>
        </Card>
      </Row>

      <Quote op={quote} y={(1 - quote) * 14}>
        The gap between <strong>"the body knew"</strong> and <strong>"the doctor noticed"</strong> —
        the gap Ripple closes.
      </Quote>
    </Bg>
  );
};
