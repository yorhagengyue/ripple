// src/RippleMCPServer.tsx
// Arch sub-scene — REAL screen recording of the Workato "Ripple Wellness MCP"
// server page. KEY shot of the video: endpoint URL + 4 tools attached + server
// instructions paragraph. Side-by-side: annotations on left, portrait video right.
// Duration target: 240 frames (8s @ 30fps). Source video: ~8.5s @ 60fps portrait.

import {interpolate, spring, staticFile, OffthreadVideo, useCurrentFrame, useVideoConfig} from 'remotion';
import styled from 'styled-components';

const Bg = styled.div`
  background: #f1ecdf;
  width: 100%;
  height: 100%;
  padding: 72px 96px;
  box-sizing: border-box;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #1a1a1a;
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
  color: #c8472d;
  margin-bottom: 18px;
`;

const Head = styled.h2`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 72px;
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.022em;
  margin: 0 0 18px;
  em { font-style: italic; color: #c8472d; }
`;

const Lead = styled.div`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 24px;
  line-height: 1.42;
  color: rgba(26,26,26,0.82);
  margin-bottom: 28px;
  padding-left: 14px;
  border-left: 2px solid #c8472d;
  max-width: 600px;
`;

const UrlBox = styled.div<{op: number}>`
  background: #1a1a1a;
  color: #f1ecdf;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: Hack, monospace;
  font-size: 14px;
  letter-spacing: 0.02em;
  word-break: break-all;
  margin-bottom: 24px;
  opacity: ${(p) => p.op};

  .lbl {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: #e89b88;
    text-transform: uppercase;
    margin-bottom: 5px;
    display: block;
  }
`;

const ToolsHead = styled.div`
  font-family: Hack, monospace;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #7a7266;
  margin-bottom: 12px;
`;

const Tool = styled.div<{op: number; x: number}>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(26,26,26,0.14);
  opacity: ${(p) => p.op};
  transform: translateX(${(p) => p.x}px);

  &:last-child { border-bottom: 0; }

  .dot {
    width: 9px; height: 9px; border-radius: 999px;
    background: #c8472d;
    flex-shrink: 0;
  }
  .name {
    font-family: Hack, monospace;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .stat {
    margin-left: auto;
    font-family: Hack, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #3a7a3a;
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
  border: 1px solid rgba(26,26,26,0.16);
  box-shadow: 0 40px 80px -40px rgba(26,26,26,0.45), 0 0 0 8px rgba(26,26,26,0.04);
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
  background: rgba(26,26,26,0.82);
  padding: 5px 10px;
  border-radius: 4px;
  border-left: 2px solid #c8472d;
`;

const tools = [
  'get_current_vitals',
  'get_baseline_deviation',
  'get_recent_anomaly_log',
  'send_contextual_nudge',
];

export const RippleMCPServer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const head = spring({frame: frame - 4, fps, config: {damping: 45, stiffness: 110}});
  const leadOp = interpolate(frame, [16, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const urlOp = interpolate(frame, [38, 56], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const monIn = spring({frame: frame - 14, fps, config: {damping: 40, stiffness: 115}});

  return (
    <Bg>
      <LeftCol>
        <Eyebrow style={{opacity: eyebrowOp}}>// 02c / The MCP surface</Eyebrow>
        <Head style={{opacity: head, transform: `translateY(${(1 - head) * 16}px)`}}>
          Workato, <em>as an MCP server.</em>
        </Head>
        <Lead style={{opacity: leadOp}}>
          Four tools exposed over one remote endpoint. Any MCP-speaking client — Claude,
          Codex, Cursor — plugs in and reads vitals, baselines, anomalies, and nudges.
        </Lead>

        <UrlBox op={urlOp}>
          <span className="lbl">Remote MCP URL</span>
          https://1720.apim.mcp.trial.workato.com/
        </UrlBox>

        <ToolsHead>Tools · 4 attached</ToolsHead>
        {tools.map((t, i) => {
          const enter = spring({
            frame: frame - (66 + i * 14),
            fps,
            config: {damping: 42, stiffness: 130},
          });
          return (
            <Tool key={t} op={enter} x={(1 - enter) * -14}>
              <span className="dot" />
              <span className="name">{t}</span>
              <span className="stat">ACTIVE</span>
            </Tool>
          );
        })}
      </LeftCol>

      <MonitorWrap>
        <Monitor op={monIn} y={(1 - monIn) * 20}>
          <OffthreadVideo
            src={staticFile('wkt-mcp.mp4')}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
          <CornerTag>app.workato.com · Ripple Wellness MCP</CornerTag>
        </Monitor>
      </MonitorWrap>
    </Bg>
  );
};
