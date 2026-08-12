import { TIER_GUIDANCE, type InterviewContext } from "@/lib/interview/companies";
import type { DesignPrompt } from "./prompts";

export interface DesignNode {
  id: string;
  label: string;
  kind?: string;
}
export interface DesignEdge {
  source: string;
  target: string;
  label?: string;
}
export interface DesignArtifact {
  promptId: string;
  nodes?: DesignNode[];
  edges?: DesignEdge[];
  notes?: string;
}

// The LLM reads the diagram as structured text, not pixels — so it can name
// the candidate's own components back to them.
export function describeDiagram(artifact: DesignArtifact | null): string {
  const nodes = artifact?.nodes ?? [];
  const edges = artifact?.edges ?? [];
  if (nodes.length === 0) return "The canvas is still empty.";

  const byId = new Map(nodes.map((n) => [n.id, n.label]));
  const components = nodes
    .map((n) => `  - ${n.label}${n.kind ? ` (${n.kind})` : ""}`)
    .join("\n");
  const connections = edges.length
    ? edges
        .map(
          (e) =>
            `  - ${byId.get(e.source) ?? e.source} → ${
              byId.get(e.target) ?? e.target
            }${e.label ? ` [${e.label}]` : ""}`
        )
        .join("\n")
    : "  (no connections drawn yet)";

  return `Components on their canvas:\n${components}\n\nConnections:\n${connections}`;
}

export function designSystemPrompt(
  design: DesignPrompt,
  artifact: DesignArtifact | null,
  ctx: InterviewContext | null
): string {
  const company = ctx
    ? `\nYou are interviewing for ${ctx.profile.displayName} at ${ctx.levelLabel} (${ctx.tier} bar).
${ctx.profile.systemDesignStyle}
Level calibration: ${TIER_GUIDANCE[ctx.tier]}\n`
    : "";

  return `You are a senior/staff engineer conducting a SYSTEM DESIGN interview at a
top tech company.
${company}
The design prompt: ${design.title}
${design.statement}

What a strong candidate covers on this specific problem:
${design.strongAnswerCovers}

Specific hand-waves to pounce on for this problem (use these when they apply —
they are the difference between a real interview and a generic one):
${design.pressurePoints.map((p) => `  - ${p}`).join("\n")}

${describeDiagram(artifact)}

Rules:
- You can SEE their architecture above. Reference their components BY NAME —
  say "your Redis cache in front of the database", not "your cache".
- Early on, make them clarify requirements and scale before designing. If they
  start naming technologies before establishing scale, ask what the traffic
  actually looks like.
- Push for numbers: QPS, storage growth, read:write ratio. "It'll be a lot" is
  not an estimate — ask them to do the arithmetic out loud.
- Challenge hand-waving. If they say something "scales", ask how it behaves at
  10× and what breaks first.
- Probe the read path and the write path separately, then failure modes: what
  happens when this component dies?
- Do NOT design it for them and do NOT list the components they are missing.
  Ask the question that makes them find the gap.
- If their diagram contradicts what they just said, point at the discrepancy
  and ask about it.
- Keep every turn to 1-3 short sentences. They should be doing the talking and
  the drawing.
- If you have enough signal — they covered scale, the core data flow, at least
  one deep dive, and failure modes — OR they have clearly stalled, reply with
  exactly the token [DONE] and nothing else. Never pad with small talk.`;
}

export function designOpening(
  design: DesignPrompt,
  companyName?: string
): string {
  const where =
    companyName && companyName !== "Generic FAANG" ? ` at ${companyName}` : "";
  return `Hi, thanks for joining. I'm a senior engineer${where} and I'll be running your system design round. Here's the prompt: ${design.statement} Take a minute — before you draw anything, tell me what questions you have about the requirements and scale.`;
}

export function designClosingPrompt(): string {
  return `The system design interview is now over. Thank the candidate
professionally in 1-2 sentences. Do not give feedback or evaluation, and do not
tell them whether their design was good. Mention their feedback report is being
prepared.`;
}
