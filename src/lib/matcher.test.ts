import { describe, it, expect } from "vitest";
import { scoreCandidates } from "./matcher";
import type { Item, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const base: Item = {
  _id: "x",
  kind: "lost",
  title: "",
  description: "",
  categoryId: "keys",
  placeLabel: "Test",
  location: { lat: 12.9719, lng: 77.6408 },
  occurredAt: "2026-09-28T18:00:00.000Z",
  reportedAt: "2026-09-28T18:10:00.000Z",
  colors: [],
  materials: [],
  status: "open",
};

const lostKey = (over: Partial<Item> = {}): Item => ({
  ...base,
  _id: "lost-key",
  kind: "lost",
  title: "Black Honda key with a red tag",
  description: "Black car key with a small red 'R' keychain, dropped near the café",
  categoryId: "keys",
  occurredAt: "2026-09-28T18:00:00.000Z",
  colors: ["black", "red"],
  materials: ["metal"],
  ...over,
});

const foundKey = (over: Partial<Item> = {}): Item => ({
  ...base,
  _id: "found-key",
  kind: "found",
  title: "Found black car key",
  description: "Black car key with a red tag found at the signal",
  categoryId: "keys",
  location: { lat: 12.9731, lng: 77.6415 },
  occurredAt: "2026-09-29T09:00:00.000Z",
  colors: ["black", "red"],
  materials: ["metal"],
  ...over,
});

const foundUmbrella = (): Item => ({
  ...base,
  _id: "found-umbrella",
  kind: "found",
  title: "Blue umbrella",
  description: "Blue umbrella left at the bus stop",
  categoryId: "other",
  location: { lat: 12.985, lng: 77.652 },
  occurredAt: "2026-09-29T09:00:00.000Z",
});

const farAwayKey = (): Item => ({
  ...base,
  _id: "found-key-far",
  kind: "found",
  title: "Black key found",
  description: "Black key found near the mall",
  categoryId: "keys",
  location: { lat: 12.99, lng: 77.7 }, // ~6.6 km away
  occurredAt: "2026-09-20T09:00:00.000Z", // 8 days earlier
});

describe("scoreCandidates", () => {
  it("matches the obvious clean pair with high confidence", () => {
    const r = scoreCandidates(lostKey(), [foundKey(), foundUmbrella(), farAwayKey()]);
    expect(r.top).not.toBeNull();
    expect(r.top!.item._id).toBe("found-key");
    expect(r.top!.confidence).toBeGreaterThanOrEqual(75);
    expect(r.top!.reasons).toContain("Same category");
  });

  it("never matches same-kind items", () => {
    const r = scoreCandidates(lostKey(), [lostKey({ _id: "other-lost" })]);
    expect(r.candidates).toHaveLength(0);
  });

  it("never matches across unrelated categories", () => {
    const r = scoreCandidates(lostKey(), [foundUmbrella()]);
    expect(r.candidates).toHaveLength(0);
    expect(r.top).toBeNull();
  });

  it("excludes far-and-stale candidates through the geo/time dimensions", () => {
    const r = scoreCandidates(lostKey(), [farAwayKey()]);
    expect(r.candidates).toHaveLength(0);
  });

  it("keeps breakdown weights summing to the score", () => {
    const r = scoreCandidates(lostKey(), [foundKey()]);
    const c = r.top!;
    const s = DEFAULT_SETTINGS.weights;
    const recomputed =
      s.category * c.breakdown.category +
      s.geo * c.breakdown.geo +
      s.time * c.breakdown.time +
      s.description * c.breakdown.description;
    expect(recomputed).toBeCloseTo(c.score, 5);
  });

  it("confidence is a 0..100 rounding of score", () => {
    const r = scoreCandidates(lostKey(), [foundKey()]);
    expect(r.top!.confidence).toBe(Math.round(r.top!.score * 100));
  });

  // ---- demo-gradient guard: these seeded pairs must NOT match ---------------
  it("near-miss: carabiner bunch vs single brass house key stays below threshold", () => {
    const bunch: Item = {
      ...base,
      _id: "lost-09",
      kind: "lost",
      title: "Bunch of keys on a carabiner",
      description: "House keys and a small flashlight on a silver carabiner clip.",
      categoryId: "keys",
      location: { lat: 12.9682, lng: 77.6428 },
      occurredAt: "2026-09-27T19:10:00.000Z",
      colors: ["silver"],
      materials: ["metal"],
    };
    const single: Item = {
      ...base,
      _id: "found-09",
      kind: "found",
      title: "Found a single house key",
      description: "Single brass house key found near the footpath drain.",
      categoryId: "keys",
      location: { lat: 12.979, lng: 77.646 },
      occurredAt: "2026-09-28T08:10:00.000Z",
      colors: ["gold"],
      materials: ["metal"],
    };
    expect(scoreCandidates(bunch, [single]).candidates).toHaveLength(0);
  });

  it("near-miss: silver bracelet vs silver chain necklace stays below threshold", () => {
    const bracelet: Item = {
      ...base,
      _id: "lost-04",
      kind: "lost",
      title: "Silver bracelet",
      description: "Thin silver bracelet, plain, no charms. Lost while walking back from the gym.",
      categoryId: "jewelry",
      location: { lat: 12.9752, lng: 77.6442 },
      occurredAt: "2026-09-25T20:00:00.000Z",
      colors: ["silver"],
      materials: ["metal"],
    };
    const necklace: Item = {
      ...base,
      _id: "found-04",
      kind: "found",
      title: "Silver chain necklace",
      description: "Silver chain necklace found on the footpath. Has a tiny pendant.",
      categoryId: "jewelry",
      location: { lat: 12.9798, lng: 77.6451 },
      occurredAt: "2026-09-29T11:00:00.000Z",
      colors: ["silver"],
      materials: ["metal"],
    };
    expect(scoreCandidates(bracelet, [necklace]).candidates).toHaveLength(0);
  });
});
