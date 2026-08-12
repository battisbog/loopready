"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "interviewer" | "candidate";
  text: string;
}

export default function DevChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function call(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.status);
      setSessionId(data.sessionId);
      setMessages((m) => [...m, { role: "interviewer", text: data.reply }]);
      setProgress(`Question ${data.questionIndex + 1} of ${data.questionCount}`);
      if (data.done) setDone(true);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "interviewer", text: `[error: ${e instanceof Error ? e.message : e}]` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function send() {
    if (!input.trim() || busy || done || !sessionId) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: "candidate", text }]);
    setInput("");
    call({ sessionId, userMessage: text });
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">dev-chat</h1>
        <span className="text-xs text-zinc-500">
          {done ? "Interview complete" : progress}
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "interviewer"
                ? "bg-zinc-900 text-zinc-200"
                : "ml-auto bg-emerald-500/15 text-emerald-100"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && <div className="text-sm text-zinc-500">interviewer is thinking…</div>}
        <div ref={bottomRef} />
      </div>

      {!sessionId ? (
        <button
          onClick={() => call({})}
          disabled={busy}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Start interview (text mode)
        </button>
      ) : done ? (
        <a
          href={`/session/${sessionId}/feedback`}
          className="rounded-md bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-zinc-950"
        >
          View feedback
        </a>
      ) : (
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Your answer…"
            className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={send}
            disabled={busy}
            className="rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </main>
  );
}
