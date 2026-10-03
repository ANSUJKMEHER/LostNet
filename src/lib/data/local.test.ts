import { describe, it, expect, beforeEach } from "vitest";
import { getLocalProvider, resetLocalProvider } from "./local";
import type { LostNetData } from "./provider";

/**
 * Regression guards for the two provider-level gaps that were open before
 * this pass (see context.md "Known issues"):
 *   #1 confirming writes a published, fact-built reunion (not an empty draft)
 *   #2 re-running the engine on the same item never stacks duplicate pairs
 *
 * SanityProvider mirrors this behaviour; these tests pin the shared contract
 * on the provider that runs without credentials.
 */

let provider: LostNetData;

beforeEach(() => {
  resetLocalProvider();
  provider = getLocalProvider();
});

describe("LocalProvider match lifecycle", () => {
  it("re-running propose on the same item reuses the pair instead of duplicating it", async () => {
    const first = await provider.proposeMatches("lost-01");
    expect(first.decision.top?.item._id).toBe("found-01");
    const firstMatchId = first.matches[0]._id;

    const second = await provider.proposeMatches("lost-01");
    // Same record, and still aligned with decision.candidates[0].
    expect(second.matches[0]._id).toBe(firstMatchId);
    expect(second.matches[0].itemBId).toBe(second.decision.candidates[0].item._id);

    const all = await provider.listMatches();
    const samePair = all.filter(
      (m) => [m.itemAId, m.itemBId].sort().join("|") === ["lost-01", "found-01"].sort().join("|"),
    );
    expect(samePair).toHaveLength(1);
  });

  it("proposing from the other side of the pair reuses the same match", async () => {
    const first = await provider.proposeMatches("lost-01");
    const firstMatchId = first.matches[0]._id;
    const key = ["lost-01", "found-01"].sort().join("|");

    // The engine is symmetric here: asking from the found side must resolve to
    // the match that already exists rather than creating a mirrored twin.
    const fromFound = await provider.proposeMatches("found-01");
    const reused = fromFound.matches.find((m) => [m.itemAId, m.itemBId].sort().join("|") === key);
    expect(reused?._id).toBe(firstMatchId);

    const samePair = (await provider.listMatches()).filter(
      (m) => [m.itemAId, m.itemBId].sort().join("|") === key,
    );
    expect(samePair).toHaveLength(1);
  });

  it("confirming publishes a fact-built reunion and marks both items matched", async () => {
    const { matches } = await provider.proposeMatches("lost-01");
    const { match, reunion } = await provider.decideMatch(matches[0]._id, "confirmed");

    expect(match.status).toBe("confirmed");
    expect(match.decidedAt).toBeTruthy();
    expect(reunion).toBeDefined();
    expect(reunion!.status).toBe("published");
    expect(reunion!.publishedAt).toBeTruthy();
    expect(reunion!.title).toBe("Black Honda key with a red tag × Found black car key");
    // The story is built from stored facts, not a placeholder.
    expect(reunion!.story).toContain("Black Honda key with a red tag");
    expect(reunion!.story).toContain("79%");
    expect(reunion!.story).not.toBe("");

    expect((await provider.getItem("lost-01"))?.status).toBe("matched");
    expect((await provider.getItem("found-01"))?.status).toBe("matched");

    const published = (await provider.listReunions()).filter((r) => r.status === "published");
    expect(published.map((r) => r._id)).toContain(reunion!._id);
  });

  it("refuses to re-decide an already decided match", async () => {
    const { matches } = await provider.proposeMatches("lost-03");
    await provider.decideMatch(matches[0]._id, "rejected");
    await expect(provider.decideMatch(matches[0]._id, "confirmed")).rejects.toThrow(/transition denied/);
  });

  it("allows a rejected pair to be proposed again as a new match", async () => {
    const first = await provider.proposeMatches("lost-03");
    await provider.decideMatch(first.matches[0]._id, "rejected");
    const second = await provider.proposeMatches("lost-03");
    expect(second.matches[0]._id).not.toBe(first.matches[0]._id);
  });

  it("publishReunion is the human curation step and replaces the story", async () => {
    const { matches } = await provider.proposeMatches("lost-01");
    const { reunion } = await provider.decideMatch(matches[0]._id, "confirmed");
    const updated = await provider.publishReunion(reunion!._id, "Edited by a volunteer.");
    expect(updated.story).toBe("Edited by a volunteer.");
    expect(updated.status).toBe("published");
  });
});

describe("Ownership challenge is a real gate", () => {
  const newLost = () => ({
    kind: "lost" as const,
    title: "Black Honda key with a red tag",
    description: "Black car key with a small red keychain.",
    categoryId: "keys",
    placeLabel: "Sony World signal",
    lat: 12.9731,
    lng: 77.6415,
    occurredAt: "2026-09-29T08:00:00.000Z",
    colors: ["black", "red"],
    materials: ["metal"],
    secretChallenge: "What is engraved on the keyring?",
    secretAnswer: "the letter R",
  });

  it("never hands the salt or the hash back to a caller", async () => {
    const { item } = await provider.createItem(newLost());
    expect(item.secretChallenge).toBe("What is engraved on the keyring?");
    expect((item as unknown as Record<string, unknown>).secretAnswerHash).toBeUndefined();
    expect((item as unknown as Record<string, unknown>).secretSalt).toBeUndefined();

    const read = await provider.getItem(item._id);
    expect((read as unknown as Record<string, unknown>).secretAnswerHash).toBeUndefined();
    expect((read as unknown as Record<string, unknown>).secretSalt).toBeUndefined();
  });

  it("accepts the right answer, but only through verifyClaim", async () => {
    const { decision, matches } = await provider.createItem(newLost());
    expect(decision.top?.item._id).toBe("found-01");
    const { reunion } = await provider.decideMatch(matches[0]._id, "confirmed", {
      mode: "public",
      label: "Indiranagar Metro Station — Gate 2",
      time: "As soon as we can",
    });

    expect(reunion).toBeDefined();
    expect(reunion!.claimToken).toMatch(/^#LN-\d{4}$/);
    // The question is snapshotted for the desk; the answer never appears anywhere.
    expect(reunion!.challengeQuestion).toBe("What is engraved on the keyring?");
    expect(JSON.stringify(reunion)).not.toContain("the letter R");
    expect(reunion!.handover?.mode).toBe("public");

    const ok = await provider.verifyClaim(reunion!._id, "The Letter R");
    expect(ok.verified).toBe(true);
    expect(ok.hasChallenge).toBe(true);
  });

  it("locks after two wrong answers and reports no challenge when none was set", async () => {
    const { matches } = await provider.createItem(newLost());
    const { reunion } = await provider.decideMatch(matches[0]._id, "confirmed", { mode: "finder" });

    const wrong1 = await provider.verifyClaim(reunion!._id, "blue");
    expect(wrong1.verified).toBe(false);
    expect(wrong1.locked).toBe(false);

    const wrong2 = await provider.verifyClaim(reunion!._id, "green");
    expect(wrong2.locked).toBe(true);

    // Correct answer after lockout must not succeed.
    const afterLock = await provider.verifyClaim(reunion!._id, "the letter R");
    expect(afterLock.verified).toBe(false);

    // An item with no question is reported honestly, not faked.
    const { matches: plainMatches } = await provider.createItem({
      ...newLost(),
      secretChallenge: undefined,
      secretAnswer: undefined,
      title: "Plain grey backpack",
      description: "Grey canvas backpack left in an auto.",
      categoryId: "bag",
    });
    if (plainMatches[0]) {
      const { reunion: plain } = await provider.decideMatch(plainMatches[0]._id, "confirmed", { mode: "finder" });
      expect(plain!.challengeQuestion).toBeUndefined();
      const res = await provider.verifyClaim(plain!._id, "anything");
      expect(res.hasChallenge).toBe(false);
      expect(res.verified).toBe(false);
    }
  });

  it("resolves a reunion from the token a claimant presents", async () => {
    const { matches } = await provider.createItem(newLost());
    const { reunion } = await provider.decideMatch(matches[0]._id, "confirmed", { mode: "finder" });

    const found = await provider.getReunionByToken(reunion!.claimToken!.toLowerCase());
    expect(found?._id).toBe(reunion!._id);
    expect(await provider.getReunionByToken("#LN-0000")).toBeNull();
  });
});
