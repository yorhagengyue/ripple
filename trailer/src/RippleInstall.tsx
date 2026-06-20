// src/RippleInstall.tsx
// Scene A — Animated terminal typing the one-line Workato MCP install
// command, then a clean success payload.
//
// Usage: register in src/Video.tsx as a <Composition> with durationInFrames=180,
// fps=30, 1920x1080. Rendered via `npx remotion render src/index.tsx RippleInstall ripple-install.mp4`.

import 'hack-font/build/web/hack.css';
import {useCurrentFrame} from 'remotion';
import styled from 'styled-components';

const Container = styled.div`
  background-color: #1a1a1a;
  flex: 1;
  border-radius: 20px;
  padding: 60px 72px;
  font-family: Hack, monospace;
  color: #f1ecdf;
  font-size: 28px;
  line-height: 1.7;
  height: 100%;
  box-sizing: border-box;
  pre {
    margin: 0;
  }
`;

const Prompt = styled.span`
  color: #5ef766;
  margin-right: 8px;
`;

const Host = styled.span`
  color: #e89b88;
  margin-right: 6px;
`;

const Command =
  'claude mcp add ripple -- npx -y mcp-remote https://ripple-wellness.vercel.app/api/mcp';

export const RippleInstall: React.FC = () => {
  const frame = useCurrentFrame();

  // Type the command roughly 3 chars per frame so long URL finishes in ~3 sec
  const charsTyped = Math.min(Command.length, Math.floor(frame * 3));
  const typedOut = Command.slice(0, charsTyped);
  const doneTyping = charsTyped === Command.length;

  // After typing finishes, wait ~30 frames (1 s) before success output appears.
  const successStart = Math.ceil(Command.length / 3) + 30;
  const showSuccess = doneTyping && frame > successStart;

  // Cursor blink (on/off every 15 frames)
  const blinkOn = Math.floor(frame / 15) % 2 === 0;

  return (
    <Container>
      <div>
        <Prompt>➜</Prompt>
        <Host>~</Host>
        <span>{typedOut}</span>
        {!showSuccess ? (
          <span style={{opacity: blinkOn ? 1 : 0.15}}>▍</span>
        ) : null}
      </div>

      {showSuccess ? (
        <>
          <div style={{marginTop: 18}}>
            <span style={{color: '#5ef766'}}>✓</span>{' '}
            <span>Added stdio MCP server: </span>
            <span style={{color: '#f1ecdf', fontWeight: 600}}>ripple</span>
          </div>
          <div style={{opacity: 0.72, fontSize: 22, marginTop: 6}}>
            &nbsp;&nbsp;transport: <span style={{color: '#c8c0a8'}}>stdio</span>
          </div>
          <div style={{opacity: 0.72, fontSize: 22}}>
            &nbsp;&nbsp;command:&nbsp;
            <span style={{color: '#c8c0a8'}}>
              npx -y mcp-remote https://1720.apim.mcp.trial.workato.com?wkt_token=...
            </span>
          </div>
          <div style={{opacity: 0.72, fontSize: 22}}>
            &nbsp;&nbsp;scope: <span style={{color: '#c8c0a8'}}>project</span>
          </div>
        </>
      ) : null}
    </Container>
  );
};
