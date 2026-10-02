import type { Item, MatchRecord } from "./types";
import { formatDistanceKm, haversineKm, timeAgo } from "./utils";

/**
 * Reunion content is built from structured facts only.
 *
 * This is the single implementation both providers use. It exists because
 * the local and Sanity providers previously diverged: local wrote a
 * published, fact-built story while Sanity wrote `title: "A reunion"`,
 * `story: ""` and `status: "draft"`, which left /reunions looking empty on
 * the real backend. Behaviour must never fork by provider.
 *
 * No model is involved here. AI narration (src/app/api/narrate) is a
 * separate, optional layer that can rewrite this text, but it is never
 * allowed to decide a match or invent a fact.
 */
export function buildReunionContent(
  match: MatchRecord,
  a: Item | null | undefined,
  b: Item | null | undefined,
): { title: string; story: string } {
  const lost = a?.kind === "lost" ? a : b?.kind === "lost" ? b : undefined;
  const found = a?.kind === "found" ? a : b?.kind === "found" ? b : undefined;

  if (!lost || !found) {
    // Defensive: the caller should always resolve both sides of the match.
    return {
      title: "A reunion",
      story: "Two reports found each other on the board.",
    };
  }

  const km = haversineKm(lost.location, found.location);
  const evidence = match.reasons.length > 0 ? ` (${match.reasons.join(" · ")})` : "";

  return {
    title: `${lost.title} × ${found.title}`,
    story:
      `“${lost.title}” was reported lost near ${lost.placeLabel}. ` +
      `${timeAgo(found.reportedAt)}, “${found.title}” was found ${formatDistanceKm(km)} away at ${found.placeLabel}. ` +
      `The board pulled the two reports together with ${match.confidence}% confidence${evidence}, and a volunteer confirmed the pair.`,
  };
}

/** Canonical key for an unordered pair of item ids — used to dedupe matches. */
export function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("|");
}
