// src/RippleWorkatoRecipe.tsx
// Arch sub-scene — REAL screen recording of live_hr_alert_demo recipe inside
// Workato. Side-by-side: headline + annotations on the left, portrait video
// panel on the right.
// Duration target: 240 frames (8s @ 30fps). Source video: ~8.7s @ 60fps portrait.

import {interpolate, spring, staticFile, OffthreadVideo, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #1a1a1a;
  width: 100%;
  height: 100%;
  padding: 72px 96px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #f1ecdf;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 720px;
  gap: 64px;
  align-items: center;
`;

const LeftCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Eyebrow = styled.div`
  font-family: Hack, monospace;
  font-size: 20px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #e89b88;
  margin-bottom: 18px;
`;

const Head = styled.h2`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 72px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.022em;
  margin: 0 0 20px;
  em { font-style: italic; color: #e89b88; }
`;

const Mono = styled.div`
  font-family: Hack, monospace;
  font-size: 17px;
  letter-spacing: 0.06em;
  color: #c8c0a8;
  margin-bottom: 32px;
  line-height: 1.5;
`;

const Beat = styled.div<{op: number; y: number}>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px dashed rgba(241,236,223,0.14);
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);

  .n {
    font-family: Hack, monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #c8472d;
    min-width: 38px;
    padding-top: 4px;
  }
  .txt {
    font-family: 'Manrope', sans-serif;
    font-size: 19px;
    line-height: 1.45;
    color: #f1ecdf;
    strong { color: #f1ecdf; font-weight: 600; }
    span.mono { font-family: Hack, monospace; color: #e89b88; font-size: 16px; }
  }
`;

const MonitorWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const Monitor = styled.div<{op: number; y: number}>`
  position: relative;
  width: 680px;
  aspect-ratio: 1932 / 2304;
  max-height: 900px;
  border-radius: 16px;
  overflow: hidden;
  background: #faf6ec;
  border: 1px solid rgba(241,236,223,0.16);
  box-shadow: 0 40px 80px -40px rgba(0,0,0,0.7), 0 0 0 8px rgba(241,236,223,0.04);
  opacity: ${(p) => p.op};
  transform: translateY(${(p) => p.y}px);
`;

const CornerTag = styled.div`
  position: absolute;
  top: 14px;
  left: 14px;
  font-family: Hack, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #f1ecdf;
  background: rgba(26,26,26,0.78);
  padding: 5px 10px;
  border-radius: 4px;
  border-left: 2px solid #c8472d;
`;

const steps = [
  {n: '01', tag: 'TRIGGER', body: 'HTTP webhook · ingest 9 metrics per HAE push'},
  {n: '02', tag: 'ACTION',  body: 'for each row in rows'},
  {n: '03', tag: 'ACTION',  body: 'POST Supabase healthlog · upsert on (user, metric, ts)'},
];

export const RippleWorkatoRecipe: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const monoOp = interpolate(frame, [18, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const monIn = spring({frame: frame - 14, fps, config: {damping: 40, stiffness: 115}});

  return (
    <Bg>
      <LeftCol>
        <Eyebrow style={{opacity: eyebrowOp}}>// 02b / Inside a recipe</Eyebrow>
        <Head style={{opacity: head, transform: `translateY(${(1 - head) * 16}px)`}}>
          <em>live_hr_alert_demo</em> · three steps.
        </Head>
        <Mono style={{opacity: monoOp}}>
          Apple Watch → Workato → Supabase · no custom server code.
        </Mono>

        {steps.map((s, i) => {
          const enter = spring({
            frame: frame - (50 + i * 18),
            fps,
            config: {damping: 44, stiffness: 130},
          });
          return (
            <Beat key={s.n} op={enter} y={(1 - enter) * 14}>
              <div className="n">{s.n} · {s.tag}</div>
              <div className="txt">
                <span className="mono">{s.body}</span>
              </div>
            </Beat>
          );
        })}
      </LeftCol>

      <MonitorWrap>
        <Monitor op={monIn} y={(1 - monIn) * 20}>
          <OffthreadVideo
            src={staticFile('wkt-recipe.mp4')}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
          <CornerTag>app.workato.com · live_hr_alert_demo</CornerTag>
        </Monitor>
      </MonitorWrap>
    </Bg>
  );
};
