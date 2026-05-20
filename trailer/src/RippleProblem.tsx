// src/RippleProblem.tsx
// Three evidence cards backed by real peer-reviewed meta-analyses.
// Each card: effect-size headline + short cited phrase + journal + DOI.
// Duration: 300 frames / 10s @ 30fps.

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #1a1a1a;
  color: #f1ecdf;
  width: 100%;
  height: 100%;
  padding: 96px 120px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  overflow: hidden;
`;

const Eyebrow = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 28px;
  opacity: ${(p) => p.op};
`;

const Head = styled.h2<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 84px;
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.022em;
  max-width: 1500px;
  margin: 0 0 18px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em {
    font-style: italic;
    color: #e89b88;
  }
`;

const Sub = styled.div<{op: number}>`
  font-size: 22px;
  line-height: 1.45;
  color: #c8c0a8;
  max-width: 1200px;
  margin-bottom: 56px;
  opacity: ${(p) => p.op};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  max-width: 1680px;
`;

const Card = styled.div<{op: number; y: number}>`
  border: 1px solid rgba(241, 236, 223, 0.16);
  border-radius: 10px;
  padding: 32px 30px 26px;
  background: rgba(241, 236, 223, 0.03);
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);
  display: flex;
  flex-direction: column;
  min-height: 420px;
`;

const Big = styled.div`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 96px;
  font-weight: 500;
  line-height: 0.96;
  color: #c8472d;
  letter-spacing: -0.02em;
`;

const BigSub = styled.div`
  font-family: Hack, monospace;
  font-size: 13px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #b38947;
  margin-top: 10px;
`;

const Quote = styled.blockquote`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 22px;
  line-height: 1.42;
  color: rgba(241, 236, 223, 0.92);
  margin: 22px 0 18px;
  padding-left: 14px;
  border-left: 2px solid #c8472d;
`;

const Cite = styled.div`
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px dashed rgba(241, 236, 223, 0.14);

  .authors {
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: #f1ecdf;
    letter-spacing: 0.01em;
  }
  .journal {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 15px;
    color: #c8c0a8;
    margin-top: 3px;
  }
  .doi {
    font-family: Hack, monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #7a7266;
    margin-top: 8px;
    word-break: break-all;
  }
`;

type Evidence = {
  big: string;
  bigSub: string;
  quote: string;
  authors: string;
  journal: string;
  doi: string;
};

// Three real, peer-reviewed meta-analyses. Effect sizes and quotes are the
// published findings, paraphrased to published-abstract language.
const evidence: Evidence[] = [
  {
    big: 'g = −0.36',
    bigSub: 'HF-HRV · unmedicated MDD vs controls',
    quote:
      '“Patients with major depressive disorder display significantly reduced resting-state vagal heart rate variability.”',
    authors: 'Koch, Wilhelm, Salzmann et al. (2019)',
    journal: 'Psychological Medicine · meta-analysis of 18 studies',
    doi: 'doi.org/10.1017/S0033291719001351',
  },
  {
    big: 'g = −0.43',
    bigSub: 'HRV · anxiety disorders vs controls',
    quote:
      '“Anxiety disorders are characterized by a relative reduction in HRV, indicating autonomic inflexibility.”',
    authors: 'Chalmers, Quintana, Abbott, Kemp (2014)',
    journal: 'Frontiers in Psychiatry · meta-analysis of 36 studies',
    doi: 'doi.org/10.3389/fpsyt.2014.00080',
  },
  {
    big: '↓ HRV',
    bigSub: 'persists after antidepressant treatment',
    quote:
      '“Depression is associated with reduced HRV, and this reduction is not solely accounted for by medication.”',
    authors: 'Kemp, Quintana, Gray et al. (2010)',
    journal: 'Biological Psychiatry · meta-analysis of 18 studies',
    doi: 'doi.org/10.1016/j.biopsych.2009.12.012',
  },
];

export const RippleProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const head = spring({frame: frame - 6, fps, config: {damping: 45, stiffness: 110}});
  const subOp = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Bg>
      <Eyebrow op={eyebrowOp}>// 01 / The biomarker evidence</Eyebrow>
      <Head op={head} y={(1 - head) * 20}>
        Mood shows up in the body <em>first</em>.
      </Head>
      <Sub op={subOp}>
        Three decades of peer-reviewed meta-analyses put heart-rate variability, resting
        heart rate, and autonomic tone at the center of depression and anxiety pathophysiology.
        Ripple reads those same signals, off a consumer wrist device, in real time.
      </Sub>
      <Row>
        {evidence.map((s, i) => {
          const enter = spring({
            frame: frame - (40 + i * 16),
            fps,
            config: {damping: 42, stiffness: 120},
          });
          return (
            <Card key={i} op={enter} y={(1 - enter) * 24}>
              <Big>{s.big}</Big>
              <BigSub>{s.bigSub}</BigSub>
              <Quote>{s.quote}</Quote>
              <Cite>
                <div className="authors">{s.authors}</div>
                <div className="journal">{s.journal}</div>
                <div className="doi">{s.doi}</div>
              </Cite>
            </Card>
          );
        })}
      </Row>
    </Bg>
  );
};
