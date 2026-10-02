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
