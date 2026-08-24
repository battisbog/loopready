/**
 * Sanitiser for candidate-supplied artifact patches.
 *
 * The artifact JSONB holds two very different kinds of field:
 *
 *   server-owned   problemId, promptId, lastRun
 *   candidate-owned  code, language, nodes, edges, notes
 *
 * Both /api/artifact and /api/realtime/turn merged the client's patch straight
 * in with a spread, so a crafted request could overwrite the server-owned half:
 * swapping problemId to a different question mid-round, or writing
 * `lastRun: { passed: 99, total: 99 }`, which the interviewer prompt and the
 * feedback report both read as the authoritative record of what the candidate's
 * code actually did.
 *
 * So the patch is whitelisted rather than filtered: an unknown key is dropped,
 * which means adding a new candidate-owned field is a deliberate act here.
 * Sizes are capped too, because the merge target is a JSONB column and nothing
 * else bounded how much a client could write into it.
 */

/** Generous next to any real interview answer, small next to a storage attack. */
const MAX_CODE_CHARS = 100_000;
const MAX_NOTES_CHARS = 20_000;
const MAX_NODES = 300;
const MAX_EDGES = 600;

const LANGUAGES = new Set(["python", "javascript"]);

export interface SanitizedPatch {
  patch: Record<string, unknown>;
  /** Keys that were dropped, for logging. Never surfaced to the client. */
  rejected: string[];
}

export function sanitizeArtifactPatch(input: unknown): SanitizedPatch {
  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { patch, rejected };
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    switch (key) {
      case "code":
        if (typeof value === "string") {
          patch.code = value.slice(0, MAX_CODE_CHARS);
        } else rejected.push(key);
        break;

      case "language":
        // Anything else would be handed to the sandbox as a runtime name.
        if (typeof value === "string" && LANGUAGES.has(value)) {
          patch.language = value;
        } else rejected.push(key);
        break;

      case "notes":
        if (typeof value === "string") {
          patch.notes = value.slice(0, MAX_NOTES_CHARS);
        } else rejected.push(key);
        break;

      case "nodes":
        if (Array.isArray(value)) patch.nodes = value.slice(0, MAX_NODES);
        else rejected.push(key);
        break;

      case "edges":
        if (Array.isArray(value)) patch.edges = value.slice(0, MAX_EDGES);
        else rejected.push(key);
        break;

      default:
        // problemId, promptId, lastRun and anything new land here.
        rejected.push(key);
    }
  }

  return { patch, rejected };
}
