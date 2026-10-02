import type {
  Item,
  MatchCandidate,
  MatchDecision,
  MatchDimension,
  Settings,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  clamp01,
  haversineKm,
  hoursBetween,
  jaccard,
  sharedAttributes,
  tokenize,
  formatDistanceKm,
  COLOR_TOKENS,
  MATERIAL_TOKENS,
} from "./utils";
import { getCategory } from "./categories";

/**
 * LOSTNET MATCHING ENGINE
 * ------------------------
 * Fully deterministic. No LLM anywhere in this file.
 *
 * The engine answers one question: given a freshly reported item, which
 * opposite-kind items on the board could plausibly be its counterpart?
 *
 * Score = 0.30*category + 0.30*geo + 0.20*time + 0.20*description
 * (weights live in DEFAULT_SETTINGS.weights — this comment must match them)
 *
 * Hard gates (a candidate must pass ALL of them):
 *   1. Opposite kinds (lost<->found).
 *   2. category score >= settings.categoryMin (no cross-category matches).
 *   3. total score >= settings.scoreThreshold.
 *
 * Every candidate carries a per-dimension breakdown + human-readable
 * reasons, so the UI can show *why* two things are being pulled together.
 */

function categoryScore(a: Item, b: Item): number {
  if (a.categoryId === b.categoryId) return 1;
  const ca = getCategory(a.categoryId);
  const cb = getCategory(b.categoryId);
  const textA = `${a.title} ${a.description}`.toLowerCase();
  const textB = `${b.title} ${b.description}`.toLowerCase();
  // One item's free text mentions an alias of the other's category:
  const aHitsB = cb.aliases.some((al) => new RegExp(`\\b${al.toLowerCase()}\\b`).test(textA));
  const bHitsA = ca.aliases.some((al) => new RegExp(`\\b${al.toLowerCase()}\\b`).test(textB));
  if (aHitsB || bHitsA) return 0.85;
  return 0.25;
}

function geoScore(a: Item, b: Item, settings: Settings): number {
  const km = haversineKm(a.location, b.location);
  return 1 - clamp01(km / settings.geoRadiusKm);
}

function timeScore(a: Item, b: Item, settings: Settings): number {
  const h = hoursBetween(a.occurredAt, b.occurredAt);
  return 1 - clamp01(h / settings.timeWindowHours);
}

const RARE_DISCRIMINATIVE_TOKENS = new Set([
  "honda", "sony", "apple", "nike", "samsung", "bose", "dell", "lenovo", "casio", "titan",
  "scratch", "scratched", "scratches", "crack", "cracked", "sticker", "initial", "initials",
  "engraved", "engraving", "charm", "ribbon", "keychain", "carabiner", "tag", "logo", "serial",
  "earbud", "airpod", "headphone", "wallet", "backpack", "zipper", "pocket"
]);

function descriptionScore(a: Item, b: Item): number {
  const ta = tokenize(`${a.title} ${a.description}`);
  const tb = tokenize(`${b.title} ${b.description}`);
  const base = jaccard(ta, tb);
  // Boost when structured attributes or attribute-like words overlap.
  const attrs = sharedAttributes(a, b);
  const attrTokensA = ta.filter((t) => COLOR_TOKENS.has(t) || MATERIAL_TOKENS.has(t));
  const attrTokensB = tb.filter((t) => COLOR_TOKENS.has(t) || MATERIAL_TOKENS.has(t));
  const tokenAttrOverlap = attrTokensA.filter((t) => attrTokensB.includes(t)).length;
  const attrBoost = attrs.colors.length + attrs.materials.length > 0 || tokenAttrOverlap > 0 ? 0.08 : 0;

  // Rarity / Discriminative Evidence Boost (Inverse Frequency):
  // Rare tokens (scratches, stickers, brands, engravings) provide high identity confidence.
  const rareOverlap = ta.filter((t) => tb.includes(t) && RARE_DISCRIMINATIVE_TOKENS.has(t)).length;
  const rarityBoost = Math.min(rareOverlap * 0.06, 0.18);

  // Contradiction penalties: conflicting attributes are active evidence AGAINST a match.
  const colorContradiction =
    a.colors.length > 0 && b.colors.length > 0 && attrs.colors.length === 0 ? 0.25 : 0;
  const materialContradiction =
    a.materials.length > 0 && b.materials.length > 0 && attrs.materials.length === 0 ? 0.15 : 0;

  return clamp01(base + attrBoost + rarityBoost - colorContradiction - materialContradiction);
}

function buildReasons(
  a: Item,
  b: Item,
  breakdown: Record<MatchDimension, number>,
  km: number,
  hours: number,
  attrs: { colors: string[]; materials: string[] },
): string[] {
  const reasons: string[] = [];
  if (breakdown.category >= 1) reasons.push("Same category");
  else if (breakdown.category >= 0.8) reasons.push("Related categories");
  reasons.push(`${formatDistanceKm(km)} apart`);
  if (hours < 12) reasons.push("Reported the same day");
  else if (hours < 48) reasons.push("Reported a day apart");
  const sharedWords = [
    ...attrs.colors.map((c) => `both mention “${c}”`),
    ...attrs.materials.map((m) => `both mention “${m}”`),
  ];
  if (sharedWords.length > 0) reasons.push(sharedWords.join(" · "));
  else if (breakdown.description >= 0.3) reasons.push("Descriptions overlap");
  return reasons;
}

export function scoreCandidates(
  target: Item,
  pool: Item[],
  settings: Settings = DEFAULT_SETTINGS,
): MatchDecision {
  const candidates: MatchCandidate[] = [];
  for (const other of pool) {
    if (other._id === target._id) continue;
    if (other.kind === target.kind) continue; // gate 1
    if (other.status !== "open") continue;

    const cat = categoryScore(target, other);
    if (cat < settings.categoryMin) continue; // gate 2

    const km = haversineKm(target.location, other.location);
    const geo = geoScore(target, other, settings);
    const hours = hoursBetween(target.occurredAt, other.occurredAt);
    const time = timeScore(target, other, settings);
    const desc = descriptionScore(target, other);

    const w = settings.weights;
    const score = w.category * cat + w.geo * geo + w.time * time + w.description * desc;
    if (score < settings.scoreThreshold) continue; // gate 3

    const breakdown: Record<MatchDimension, number> = { category: cat, geo, time, description: desc };
    const attrs = sharedAttributes(target, other);
    candidates.push({
      item: other,
      score,
      confidence: Math.round(clamp01(score) * 100),
      breakdown,
      reasons: buildReasons(target, other, breakdown, km, hours, attrs),
    });
  }
  candidates.sort((x, y) => y.score - x.score);

  // Calibrated Margin Rule: Check separation against second-best candidate
  let margin: number | undefined;
  let isAmbiguous: boolean | undefined;
  if (candidates.length >= 2) {
    margin = Math.round((candidates[0].score - candidates[1].score) * 100) / 100;
    isAmbiguous = margin < 0.08;
    candidates[0].margin = margin;
    candidates[0].isAmbiguous = isAmbiguous;
  }

  return {
    targetId: target._id,
    candidates,
    top: candidates[0] ?? null,
    margin,
    isAmbiguous,
  };
}
