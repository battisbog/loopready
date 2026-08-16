"use client";

import { useEffect, useRef, useState } from "react";
import RoundShell from "./round-shell";
import CodeSurface from "./code-surface";
import type { Turn } from "./use-voice-turn";

/**
 * Coding round. Voice, presence and turn handling all come from RoundShell,
 * so this file owns only the code state and the work surface.
 */
export default function CodingInterview({
  sessionId,
  initialTurns,
  header,
  problem,
  initialCode,
  initialLanguage,
  signatures,
}: {
  sessionId: string;
  initialTurns: Turn[];
  header?: string;
  problem: { title: string; statement: string; example: string; fn: string };
  initialCode: string;
  initialLanguage: string;
  signatures: Record<string, string>;
}) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);

  // Read by getArtifactPatch, which the shell may call at any time. Synced in
  // an effect so nothing mutates a ref during render.
  const latest = useRef({ code: initialCode, language: initialLanguage });
  useEffect(() => {
    latest.current = { code, language };
  }, [code, language]);

  return (
    <RoundShell
      sessionId={sessionId}
      initialTurns={initialTurns}
      header={header}
      getArtifactPatch={() => ({
        language: latest.current.language,
        code: latest.current.code,
      })}
      renderSurface={({ pushArtifact }) => (
        <CodeSurface
          sessionId={sessionId}
          problem={problem}
          code={code}
          language={language}
          signatures={signatures}
          onCodeChange={setCode}
          onLanguageChange={setLanguage}
          syncArtifact={pushArtifact}
        />
      )}
    />
  );
}
