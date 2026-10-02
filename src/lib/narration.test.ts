import { describe, it, expect } from "vitest";
import { buildFacts, fallbackText, passesFactGuard } from "./narration";
import type { Item, MatchRecord } from "./types";

/**
 * The fact guard is the thing that makes "the AI invents nothing" a claim a
 * judge can check rather than a promise in a README. These tests pin it.
 */

const lost: Item = {
  _id: "lost-01",
  kind: "lost",
  title: "Black Honda key with a red tag",
  description: "Black car key with a small red keychain.",
  categoryId: "keys",
  placeLabel: "100 Feet Road, near the café",
  location: { lat: 12.9719, lng: 77.6408 },
  occurredAt: "2026-09-28T18:00:00.000Z",
  reportedAt: "2026-09-28T18:42:00.000Z",
  colors: ["black", "red"],
  materials: ["metal"],
  status: "open",
};

const found: Item = {
  ...lost,
  _id: "found-01",
  kind: "found",
  title: "Found black car key",
  placeLabel: "Sony World Signal",
  location: { lat: 12.9731, lng: 77.6415 },
  occurredAt: "2026-09-29T09:00:00.000Z",
  reportedAt: "2026-09-29T09:35:00.000Z",
};

const match: MatchRecord = {
  _id: "match-1",
  itemAId: "lost-01",
  itemBId: "found-01",
  score: 0.79,
  confidence: 79,
  breakdown: { category: 1, geo: 0.923, time: 0.75, description: 0.5 },
  reasons: ["Same category", "153 m apart", "Reported a day apart", "both mention “black”"],
  status: "pendingReview",
  proposedBy: "system",
  createdAt: "2026-09-29T10:00:00.000Z",
};

describe("narration facts + guard", () => {
  it("assembles facts from stored fields only", () => {
    const facts = buildFacts(match, "match", lost, found);
    expect(facts.confidence).toBe(79);
    expect(facts.category).toBe("Keys");
    expect(facts.distanceKm).toBeCloseTo(0.15, 1);
    expect(facts.lost?.title).toBe("Black Honda key with a red tag");
    expect(facts.found?.placeLabel).toBe("Sony World Signal");
    expect(facts.sharedColors).toEqual(["black", "red"]);
    expect(facts.sharedMaterials).toEqual(["metal"]);
    // No free-form description text is forwarded to the model.
    expect(JSON.stringify(facts)).not.toContain("keychain");
  });

  it("accepts a sentence whose numerals all appear in the payload", () => {
    const facts = buildFacts(match, "match", lost, found);
    expect(passesFactGuard("The board pulled them together with 79% confidence.", facts)).toBe(true);
  });

  it("rejects a sentence that invents a number", () => {
    const facts = buildFacts(match, "match", lost, found);
    expect(passesFactGuard("They were found 300 metres apart near the metro.", facts)).toBe(false);
  });

  it("rejects empty, multi-paragraph and over-long output", () => {
    const facts = buildFacts(match, "match", lost, found);
    expect(passesFactGuard("   ", facts)).toBe(false);
    expect(passesFactGuard("line one\nline two", facts)).toBe(false);
    expect(passesFactGuard("x".repeat(400), facts)).toBe(false);
  });

  it("falls back to a fact-built sentence in both modes", () => {
    const matchFacts = buildFacts(match, "match", lost, found);
    expect(fallbackText(matchFacts, match, lost, found)).toContain("79%");

    const storyFacts = buildFacts(match, "story", lost, found);
    const story = fallbackText(storyFacts, match, lost, found);
    expect(story).toContain("Black Honda key with a red tag");
    expect(story).toContain("79%");
  });

  it("survives a missing side of the pair without throwing", () => {
    const facts = buildFacts(match, "match", lost, null);
    expect(facts.lost).not.toBeNull();
    expect(facts.found).toBeNull();
    expect(passesFactGuard("The board pulled them together with 79% confidence.", facts)).toBe(true);
  });
});
