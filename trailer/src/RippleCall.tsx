// src/RippleCall.tsx
// Scene C — User asks Claude "how's my heart right now?",
// Claude calls get_current_vitals via Ripple MCP, tool response renders
// as formatted JSON + a one-sentence English answer.
//
// Register in src/Video.tsx as <Composition id="RippleCall" /> with
// durationInFrames=300, fps=30, 1920x1080.

import 'hack-font/build/web/hack.css';
import {useCurrentFrame} from 'remotion';
import styled from 'styled-components';

const Container = styled.div`
  background-color: #1a1a1a;
  flex: 1;
  border-radius: 20px;
  padding: 52px 68px;
  font-family: Hack, monospace;
  color: #f1ecdf;
  font-size: 26px;
  line-height: 1.65;
  height: 100%;
  box-sizing: border-box;
`;

const USER_PROMPT = "how's my heart right now?";

// ── Phase timing (all in frames @ 30fps) ─────────────────────────────
const T_PROMPT_START   = 4;                                 // 0.1s
const T_PROMPT_END     = T_PROMPT_START + USER_PROMPT.length * 2; // ~2s
const T_CALLING        = T_PROMPT_END + 18;                 // +0.6s
const T_JSON_START     = T_CALLING + 36;                    // +1.2s
const T_ANSWER_START   = T_JSON_START + 64;                 // +2.1s after JSON fully renders

// The JSON to "render" line-by-line after the call resolves
const jsonLines = [
  '{',
  '  "metric": "heart_rate",',
  '  "value": 118,',
  '  "ts": "2026-04-23T08:41:00+08:00",',
  '  "source": "Apple Watch",',
  '  "baseline": { "last_7d_mean": 76, "deviation_pct": 55.3, "status": "watch" }',
  '}',
];

const ANSWER =
  "Your heart rate is 118 bpm right now, 55% above your 7-day average. Did you just move?";

export const RippleCall: React.FC = () => {
  const frame = useCurrentFrame();

  // User prompt typed out one char per 2 frames
  const promptChars = Math.max(
    0,
    Math.min(USER_PROMPT.length, Math.floor((frame - T_PROMPT_START) / 2)),
  );
  const promptTyped = USER_PROMPT.slice(0, promptChars);

  // Blink when waiting / thinking
  const blink = Math.floor(frame / 15) % 2 === 0;

  // How many JSON lines have appeared
  const jsonFramesPerLine = 9;
  const jsonLinesShown =
    frame > T_JSON_START
      ? Math.min(jsonLines.length, Math.floor((frame - T_JSON_START) / jsonFramesPerLine) + 1)
      : 0;

  // Answer types out one char per 2 frames after T_ANSWER_START
  const answerChars = Math.max(
    0,
    Math.min(ANSWER.length, Math.floor((frame - T_ANSWER_START) / 2)),
  );
  const answerTyped = ANSWER.slice(0, answerChars);

  return (
    <Container>
      {/* User prompt */}
      <div>
        <span style={{color: '#e89b88'}}>you</span>{' '}
        <span style={{color: '#9aa0a6'}}>›</span>{' '}
        <span>{promptTyped}</span>
        {frame < T_PROMPT_END ? (
          <span style={{opacity: blink ? 1 : 0.15}}>▍</span>
        ) : null}
      </div>

      {/* Calling / tool invocation indicator */}
      {frame > T_CALLING ? (
        <div style={{marginTop: 18, color: '#9aa0a6', fontSize: 22}}>
          <span style={{color: '#c8472d'}}>●</span>{' '}
          calling{' '}
          <span style={{color: '#f1ecdf'}}>ripple.get_current_vitals</span>{' '}
          {'{'} user_id: "tommychen030607" {'}'} …
        </div>
      ) : null}

      {/* JSON response */}
      {jsonLinesShown > 0 ? (
        <div
          style={{
            marginTop: 16,
            background: '#14171a',
            border: '1px solid rgba(241,236,223,0.1)',
            borderRadius: 6,
            padding: '14px 18px',
            fontSize: 22,
            lineHeight: 1.55,
            color: '#c8c0a8',
          }}
        >
          {jsonLines.slice(0, jsonLinesShown).map((line, i) => (
            <div key={i}>
              {line.split(/("[^"]*"|\d+\.?\d*)/g).map((chunk, j) => {
                if (/^"[^"]*"$/.test(chunk)) {
                  return (
                    <span key={j} style={{color: '#e89b88'}}>
                      {chunk}
                    </span>
                  );
                }
                if (/^\d+\.?\d*$/.test(chunk)) {
                  return (
                    <span key={j} style={{color: '#c8472d', fontWeight: 600}}>
                      {chunk}
                    </span>
                  );
                }
                return <span key={j}>{chunk}</span>;
              })}
            </div>
          ))}
        </div>
      ) : null}

      {/* Claude's answer */}
      {answerTyped ? (
        <div
          style={{
            marginTop: 22,
            fontSize: 26,
            lineHeight: 1.55,
            fontFamily:
              '"Cormorant Garamond", "Hack", serif',
            fontStyle: 'italic',
            color: '#f1ecdf',
          }}
        >
          <span style={{color: '#5ef766', fontFamily: 'Hack'}}>claude</span>{' '}
          <span style={{color: '#9aa0a6', fontFamily: 'Hack'}}>›</span>{' '}
          <span>{answerTyped}</span>
          {answerTyped.length < ANSWER.length ? (
            <span style={{opacity: blink ? 1 : 0.15}}>▍</span>
          ) : null}
        </div>
      ) : null}
    </Container>
  );
};
