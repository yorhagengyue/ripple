// src/RippleClose.tsx
// Closing title card — competition-appropriate submission slate. Project name,
// team, institution, event. Keeps the final echo couplet that answers the
// opening ("The body was already speaking / We finally built something that
// listens").
// Duration target: 540 frames (18s @ 30fps).

import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  padding: 90px 120px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #1a1a1a;
  position: relative;
`;

const Eyebrow = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 18px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #c8472d;
  margin-bottom: 38px;
  opacity: ${(p) => p.op};
`;

const Wordmark = styled.h1<{op: number; s: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 148px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.035em;
  color: #1a1a1a;
  margin: 0;
  opacity: ${(p) => p.op};
  transform: scale(${(p) => p.s});

  em { font-style: italic; color: #c8472d; }
`;

const Tagline = styled.div<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 30px;
  font-weight: 400;
  line-height: 1.35;
  color: rgba(26, 26, 26, 0.66);
  margin: 14px 0 50px;
  letter-spacing: -0.008em;
  text-align: center;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  em { font-style: italic; color: #c8472d; }
`;

const TeamLabel = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 13px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #7a7266;
  margin-bottom: 18px;
  opacity: ${(p) => p.op};

  &::before,
  &::after {
    content: '';
    display: inline-block;
    width: 36px;
    height: 1px;
    background: rgba(26, 26, 26, 0.28);
    vertical-align: middle;
    margin: 0 14px;
  }
`;

const NameRow = styled.div`
  display: flex;
  gap: 28px;
  margin-bottom: 26px;
`;

const Name = styled.div<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 40px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: #1a1a1a;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);
`;

const NameSep = styled.span`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 36px;
  color: #c8472d;
  align-self: center;
`;

const Institution = styled.div<{op: number}>`
  font-family: Hack, monospace;
  font-size: 16px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #7a7266;
  text-align: center;
  line-height: 1.8;
  margin-bottom: 46px;
  opacity: ${(p) => p.op};
`;

const Divider = styled.div<{w: number}>`
  width: ${(p) => p.w}px;
  height: 1px;
  background: rgba(26, 26, 26, 0.25);
  margin-bottom: 34px;
`;

const Echo = styled.div<{op: number; y: number}>`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 32px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: rgba(26, 26, 26, 0.78);
  text-align: center;
  max-width: 1300px;
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  strong {
    font-style: normal;
    font-weight: 500;
    color: #c8472d;
  }
`;

const names = ['Geng Yue', 'Tommy Chen', 'Liu Zicheng'];

export const RippleClose: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const mark = spring({frame: frame - 10, fps, config: {damping: 38, stiffness: 120}});
  const tag = spring({frame: frame - 34, fps, config: {damping: 44, stiffness: 110}});
  const teamLabelOp = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const inst = interpolate(frame, [200, 224], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dividerW = interpolate(frame, [256, 300], [0, 340], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const echoOp = spring({frame: frame - 320, fps, config: {damping: 44, stiffness: 90}});
  const fadeOut = interpolate(frame, [510, 540], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Bg style={{opacity: fadeOut}}>
      <Eyebrow op={eyebrowOp}>NAISC 2026 · Submission</Eyebrow>

      <Wordmark op={mark} s={0.94 + mark * 0.06}>
        Rip<em>p</em>le
      </Wordmark>
      <Tagline op={tag} y={(1 - tag) * 10}>
        An MCP-orchestrated wellness agent · <em>powered by Workato</em>
      </Tagline>

      <TeamLabel op={teamLabelOp}>Team</TeamLabel>
      <NameRow>
        {names.map((n, i) => {
          const enter = spring({
            frame: frame - (108 + i * 22),
            fps,
            config: {damping: 42, stiffness: 120},
          });
          return (
            <>
              <Name key={n} op={enter} y={(1 - enter) * 12}>
                {n}
              </Name>
              {i < names.length - 1 ? <NameSep>·</NameSep> : null}
            </>
          );
        })}
      </NameRow>
      <Institution op={inst}>
        Temasek Polytechnic
        <br />
        Singapore · April 2026
      </Institution>

      <Divider w={dividerW} />

      <Echo op={echoOp} y={(1 - echoOp) * 14}>
        The body was already <strong>speaking</strong>.
        <br />
        We finally built something that listens.
      </Echo>
    </Bg>
  );
};
