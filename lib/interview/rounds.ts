// Round registry. The engine is round-aware from day one: sessions carry a
// round_type, and each round contributes an interviewer prompt + a surface +
// a feedback rubric. M1-5 implement behavioral; coding lands in M7 and
// system_design in M8 by flipping their flag and adding their prompt builders.

export const ROUND_TYPES = ["behavioral", "coding", "system_design"] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export const ROUND_IMPLEMENTED: Record<RoundType, boolean> = {
  behavioral: true,
  coding: true,
  system_design: true,
};

export const ROUND_LABEL: Record<RoundType, string> = {
  behavioral: "Behavioral",
  coding: "Coding",
  system_design: "System design",
};

export function isRoundType(value: unknown): value is RoundType {
  return typeof value === "string" && (ROUND_TYPES as readonly string[]).includes(value);
}
