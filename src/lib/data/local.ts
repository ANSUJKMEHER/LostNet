import type {
  Item,
  ItemStatus,
  MatchDecision,
  MatchRecord,
  MatchStatus,
  NewItemInput,
  Reunion,
  Settings,
} from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { scoreCandidates } from "../matcher";
import { SEED_ITEMS } from "../seed";
import { buildReunionContent, pairKey } from "../reunion";
import type { LostNetData } from "./provider";

/**
 * LocalProvider — in-memory implementation used for development and the
 * sandbox demo. State lives for the lifetime of the Node process and is
 * seeded from SEED_ITEMS. It implements the same contract (including
 * transition enforcement) as the Sanity provider, so the UI is identical.
 *
 * Seed items are deep-copied on construction: confirming a match mutates an
 * item's `status`, and mutating the shared SEED_ITEMS array would poison the
 * module for every later instance — including the demo reset below.
 */
function cloneItem(item: Item): Item {
  return {
    ...item,
    location: { ...item.location },
    colors: [...item.colors],
    materials: [...item.materials],
  };
}

class LocalProvider implements LostNetData {
  private items = new Map<string, Item>();
  private matches = new Map<string, MatchRecord>();
  private reunions = new Map<string, Reunion>();
  private seq = 1;

  constructor() {
    for (const item of SEED_ITEMS) this.items.set(item._id, cloneItem(item));
  }

  private nextId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${this.seq++}`;
  }

  async getSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS };
  }

  async listItems(status?: ItemStatus): Promise<Item[]> {
    let all = [...this.items.values()];
    if (status) all = all.filter((i) => i.status === status);
    return all.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  }

  async getItem(id: string): Promise<Item | null> {
    return this.items.get(id) ?? null;
  }

  async getItemsByIds(ids: string[]): Promise<Item[]> {
    return ids.map((id) => this.items.get(id)).filter((i): i is Item => Boolean(i));
  }

  async createItem(
    input: NewItemInput,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }> {
    const item: Item = {
      _id: this.nextId("item"),
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId,
      placeLabel: input.placeLabel.trim(),
      location: { lat: input.lat, lng: input.lng },
      occurredAt: new Date(input.occurredAt).toISOString(),
      reportedAt: new Date().toISOString(),
      colors: input.colors,
      materials: input.materials,
      status: "open",
      imageUrl: input.imageUrl,
      secretChallenge: input.secretChallenge?.trim(),
      handoverNote: input.handoverNote?.trim(),
    };
    this.items.set(item._id, item);
    const { decision, matches } = this.runMatch(item);
    return { item, decision, matches };
  }

  async proposeMatches(
    itemId: string,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }> {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    if (item.status === "matched" || item.status === "resolved") {
      return { item, decision: { targetId: item._id, candidates: [], top: null }, matches: [] };
    }
    const { decision, matches } = this.runMatch(item);
    return { item, decision, matches };
  }

  /** Existing undecided matches, keyed by unordered item pair. */
  private openMatchesByPair(): Map<string, MatchRecord> {
    const map = new Map<string, MatchRecord>();
    for (const m of this.matches.values()) {
      if (m.status === "proposed" || m.status === "pendingReview") {
        map.set(pairKey(m.itemAId, m.itemBId), m);
      }
    }
    return map;
  }

  private runMatch(target: Item): { decision: MatchDecision; matches: MatchRecord[] } {
    const settings = DEFAULT_SETTINGS;
    const pool = [...this.items.values()];
    const decision = scoreCandidates(target, pool, settings);
    // Persist proposed matches so the desk + feed see them. Re-running the
    // engine on the same item must not stack duplicate pairs: reuse the
    // existing undecided match when the pair is already on the board, while
    // keeping `matches[i]` aligned with `decision.candidates[i]`.
    const existing = this.openMatchesByPair();
    const matches: MatchRecord[] = [];
    for (const candidate of decision.candidates) {
      const key = pairKey(target._id, candidate.item._id);
      const prior = existing.get(key);
      if (prior) {
        matches.push(prior);
        continue;
      }
      const match: MatchRecord = {
        _id: this.nextId("match"),
        itemAId: target._id,
        itemBId: candidate.item._id,
        score: candidate.score,
        confidence: candidate.confidence,
        breakdown: candidate.breakdown,
        reasons: candidate.reasons,
        status: "pendingReview",
        proposedBy: "system",
        createdAt: new Date().toISOString(),
      };
      this.matches.set(match._id, match);
      existing.set(key, match);
      matches.push(match);
    }
    return { decision, matches };
  }

  async listMatches(status?: MatchStatus): Promise<MatchRecord[]> {
    let all = [...this.matches.values()];
    if (status) all = all.filter((m) => m.status === status);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getMatch(id: string): Promise<MatchRecord | null> {
    return this.matches.get(id) ?? null;
  }

  async decideMatch(
    id: string,
    decision: "confirmed" | "rejected",
    details?: { safeHarbor?: string; timeWindow?: string },
  ): Promise<{ match: MatchRecord; reunion?: Reunion }> {
    const match = this.matches.get(id);
    if (!match) throw new Error(`Match ${id} not found`);
    if (match.status === "confirmed" || match.status === "rejected") {
      throw new Error(`Match already ${match.status} — transition denied`);
    }
    match.status = decision;
    match.decidedAt = new Date().toISOString();
    match.decidedBy = "volunteer";

    if (decision === "confirmed") {
      for (const itemId of [match.itemAId, match.itemBId]) {
        const item = this.items.get(itemId);
        if (item) item.status = "matched";
      }
      const reunion = this.buildReunion(match, details);
      this.reunions.set(reunion._id, reunion);
      return { match, reunion };
    }
    return { match };
  }

  /** Story drafted purely from structured facts — AI narration swaps in later behind the same shape. */
  private buildReunion(match: MatchRecord, details?: { safeHarbor?: string; timeWindow?: string }): Reunion {
    const a = this.items.get(match.itemAId);
    const b = this.items.get(match.itemBId);
    const { title, story } = buildReunionContent(match, a, b);
    const token = `#LN-${Math.abs(match._id.split("").reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) % 9000 + 1000)}`;
    const safePoint = details?.safeHarbor || a?.handoverNote || b?.handoverNote || "Indiranagar Metro Station Customer Desk, Gate 2";
    const challengeProof = a?.secretChallenge || b?.secretChallenge || "Physical trait & secret match confirmed";
    return {
      _id: this.nextId("reunion"),
      matchId: match._id,
      title,
      story,
      status: "published",
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      safeHarbor: safePoint,
      claimToken: token,
      custodyState: "deposited",
      verifiedChallengeProof: challengeProof,
    };
  }

  async listReunions(): Promise<Reunion[]> {
    return [...this.reunions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getReunion(id: string): Promise<Reunion | null> {
    return this.reunions.get(id) ?? null;
  }

  async publishReunion(id: string, story?: string): Promise<Reunion> {
    const r = this.reunions.get(id);
    if (!r) throw new Error(`Reunion ${id} not found`);
    if (story) r.story = story;
    r.status = "published";
    r.publishedAt = new Date().toISOString();
    return r;
  }

  async updateCustodyState(id: string, custodyState: "deposited" | "verified" | "released"): Promise<Reunion> {
    const r = this.reunions.get(id);
    if (!r) throw new Error(`Reunion ${id} not found`);
    r.custodyState = custodyState;
    return r;
  }

  async resetDemoData(): Promise<void> {
    this.reunions.clear();
    this.matches.clear();
    this.items.clear();
    for (const item of SEED_ITEMS) {
      this.items.set(item._id, { ...item });
    }
  }
}

/**
 * The in-memory board is anchored to globalThis, not a module-local variable.
 * Next.js bundles server pages and route handlers separately, so a module-level
 * singleton would be instantiated once per bundle and the board would silently
 * fork: confirm a match through /api/matches/[id] and the server-rendered
 * /reunions page would still show an empty board. globalThis is the real Node
 * global, shared by every bundle in the process.
 */
const globalStore = globalThis as unknown as { __lostnetLocalProvider?: LocalProvider | null };

export function getLocalProvider(): LostNetData {
  if (!globalStore.__lostnetLocalProvider) globalStore.__lostnetLocalProvider = new LocalProvider();
  return globalStore.__lostnetLocalProvider;
}

/** Drops the in-memory board so the next call re-seeds from SEED_ITEMS. Demo helper only. */
export function resetLocalProvider(): void {
  globalStore.__lostnetLocalProvider = null;
}
