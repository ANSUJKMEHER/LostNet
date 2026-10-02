import type { Item, MatchRecord } from "./types";
import { buildReunionContent } from "./reunion";
import { getCategory } from "./categories";
import { haversineKm, sharedAttributes } from "./utils";

/**
 * Pure narration helpers — no network, no Next.js, no model.
 *
 * These are what make the "the AI invents nothing" claim checkable: the
 * payload handed to the model is assembled from stored fields only, and the
 * model's reply is rejected unless every numeral in it appears in that
 * payload. See src/app/api/narrate/route.ts for the transport.
 */

export type NarrationMode = "match" | "story";

export interface Facts {
  mode: NarrationMode;
  confidence: number;
  reasons: string[];
  distanceKm: number;
  category: string;
  lost: { title: string; placeLabel: string; reportedAt: string } | null;
  found: { title: string; placeLabel: string; reportedAt: string } | null;
  sharedColors: string[];
  sharedMaterials: string[];
}

export const SYSTEM_PROMPT = [
  "You write one short, warm sentence for a lost-and-found board.",
  "Use ONLY the facts in the JSON payload. Invent nothing.",
  "Do not add names, brands, places, colours, times or numbers that are not in the payload.",
  "Never claim you know who owns an item: say the board pulled the reports together,",
  "not that this is definitely the owner's item.",
  "Reply with the sentence only. No quotes, no preamble, no markdown.",
].join(" ");

export const STORY_SYSTEM_PROMPT = [
  "You rewrite a lost-and-found reunion note in 2 or 3 short sentences.",
  "Use ONLY the facts in the JSON payload. Invent nothing.",
  "Keep the same facts and the same meaning as the draft; do not add detail.",
  "Reply with the story only. No quotes, no preamble, no markdown.",
].join(" ");

export function buildFacts(
  match: MatchRecord,
  mode: NarrationMode,
  a: Item | null,
  b: Item | null,
): Facts {
  const lostItem = a?.kind === "lost" ? a : b?.kind === "lost" ? b : null;
  const foundItem = a?.kind === "found" ? a : b?.kind === "found" ? b : null;
  const attrs =
    lostItem && foundItem ? sharedAttributes(lostItem, foundItem) : { colors: [], materials: [] };
  const distanceKm =
    lostItem && foundItem
      ? Math.round(haversineKm(lostItem.location, foundItem.location) * 100) / 100
      : 0;
  return {
    mode,
    confidence: match.confidence,
    reasons: match.reasons,
    distanceKm,
    category: getCategory(lostItem?.categoryId ?? foundItem?.categoryId ?? "other").title,
    lost: lostItem
      ? { title: lostItem.title, placeLabel: lostItem.placeLabel, reportedAt: lostItem.reportedAt }
      : null,
    found: foundItem
      ? { title: foundItem.title, placeLabel: foundItem.placeLabel, reportedAt: foundItem.reportedAt }
      : null,
    sharedColors: attrs.colors,
    sharedMaterials: attrs.materials,
  };
}

/**
 * Deterministic fact guard.
 *
 * Numerals are the most checkable facts a sentence can smuggle in, so every
 * number in the generated text must appear verbatim in the facts payload.
 * Anything empty, multi-paragraph, or too long is rejected too. A rejection
 * is never fatal: the caller falls back to the fact-built sentence.
 */
export function passesFactGuard(text: string, facts: Facts): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 320) return false;
  if (trimmed.includes("\n")) return false;
  const haystack = JSON.stringify(facts);
  const numerals = trimmed.match(/\d+(?:\.\d+)?/g) ?? [];
  return numerals.every((n) => haystack.includes(n));
}

/** The floor: a sentence built only from stored fields, used when AI is off or rejected. */
export function fallbackText(
  facts: Facts,
  match: MatchRecord,
  a: Item | null,
  b: Item | null,
): string {
  if (facts.mode === "story") {
    return buildReunionContent(match, a, b).story;
  }
  const evidence =
    facts.reasons.length > 0
      ? ` — ${facts.reasons.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join(" · ")}`
      : "";
  return `The board pulled these two reports together with ${facts.confidence}% confidence${evidence}.`;
}
