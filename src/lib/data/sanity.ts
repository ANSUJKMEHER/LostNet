import { createClient, type SanityClient } from "@sanity/client";
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
import { buildReunionContent, pairKey } from "../reunion";
import { SEED_ITEMS } from "../seed";
import type { LostNetData } from "./provider";

/**
 * SanityProvider — the real backend.
 *
 * Sanity document types (see src/sanity/schema in Phase 5):
 *   lostFoundItem, match, reunion, settings, category
 *
 * GROQ projections below map those documents onto the domain types in
 * lib/types.ts. The matching engine itself stays in lib/matcher.ts and is
 * provider-independent: Sanity supplies structured candidates, the engine
 * scores them, and match documents are written back with the breakdown.
 */

type SanityItemDoc = {
  _id: string;
  kind: "lost" | "found";
  title: string;
  description: string;
  categoryId?: string; // projected: coalesce(category->_id, "other")
  placeLabel: string;
  location: { lat: number; lng: number } | null;
  occurredAt: string;
  _createdAt: string;
  colors?: string[];
  materials?: string[];
  status?: ItemStatus;
  imageUrl?: string;
  secretChallenge?: string;
  handoverNote?: string;
};

const ITEM_PROJECTION = `{
  _id, kind, title, description,
  "categoryId": coalesce(category->_id, "other"),
  placeLabel,
  "location": location,
  occurredAt, _createdAt,
  colors, materials, status,
  imageUrl, secretChallenge, handoverNote
}`;

const MATCH_PROJECTION = `{
  _id,
  "itemAId": itemA->_id, "itemBId": itemB->_id,
  score, confidence, breakdown, reasons, status, _createdAt, decidedAt, decidedBy
}`;

type SanityMatchDoc = {
  _id: string;
  itemAId: string;
  itemBId: string;
  score: number;
  confidence: number;
  breakdown: MatchRecord["breakdown"];
  reasons: string[];
  status: MatchStatus;
  _createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

function mapMatch(d: SanityMatchDoc): MatchRecord {
  return {
    _id: d._id,
    itemAId: d.itemAId,
    itemBId: d.itemBId,
    score: d.score,
    confidence: d.confidence,
    breakdown: d.breakdown,
    reasons: d.reasons ?? [],
    status: d.status,
    proposedBy: "system",
    createdAt: d._createdAt,
    decidedAt: d.decidedAt,
    decidedBy: d.decidedBy,
  };
}

function mapItem(doc: SanityItemDoc): Item {
  return {
    _id: doc._id,
    kind: doc.kind,
    title: doc.title,
    description: doc.description,
    categoryId: doc.categoryId ?? "other",
    placeLabel: doc.placeLabel,
    location: doc.location ?? { lat: 0, lng: 0 },
    occurredAt: doc.occurredAt,
    reportedAt: doc._createdAt,
    colors: doc.colors ?? [],
    materials: doc.materials ?? [],
    status: doc.status ?? "open",
    imageUrl: doc.imageUrl,
    secretChallenge: doc.secretChallenge,
    handoverNote: doc.handoverNote,
  };
}

export class SanityProvider implements LostNetData {
  private client: SanityClient;

  constructor() {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
    const token = process.env.SANITY_API_TOKEN;
    if (!projectId) {
      throw new Error("SANITY_PROJECT_ID is missing. Set DATA_PROVIDER=local for the demo provider.");
    }
    this.client = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
      token,
    });
  }

  async getSettings(): Promise<Settings> {
    const raw = await this.client.fetch<{ geoRadiusKm?: number; timeWindowHours?: number; scoreThreshold?: number; categoryMin?: number } | null>(
      `*[_type == "settings"][0]{geoRadiusKm, timeWindowHours, scoreThreshold, categoryMin}`,
    );
    return {
      ...DEFAULT_SETTINGS,
      geoRadiusKm: raw?.geoRadiusKm ?? DEFAULT_SETTINGS.geoRadiusKm,
      timeWindowHours: raw?.timeWindowHours ?? DEFAULT_SETTINGS.timeWindowHours,
      scoreThreshold: raw?.scoreThreshold ?? DEFAULT_SETTINGS.scoreThreshold,
      categoryMin: raw?.categoryMin ?? DEFAULT_SETTINGS.categoryMin,
    };
  }

  async listItems(status?: ItemStatus): Promise<Item[]> {
    const filter = status ? ` && status == $status` : "";
    const docs = await this.client.fetch<SanityItemDoc[]>(
      `*[_type == "lostFoundItem"${filter}] | order(_createdAt desc)${ITEM_PROJECTION}`,
      status ? { status } : {},
    );
    return docs.map(mapItem);
  }

  async getItem(id: string): Promise<Item | null> {
    const doc = await this.client.fetch<SanityItemDoc | null>(
      `*[_id == $id][0]${ITEM_PROJECTION}`,
      { id },
    );
    return doc ? mapItem(doc) : null;
  }

  async getItemsByIds(ids: string[]): Promise<Item[]> {
    const docs = await this.client.fetch<SanityItemDoc[]>(
      `*[_type == "lostFoundItem" && _id in $ids]${ITEM_PROJECTION}`,
      { ids },
    );
    return docs.map(mapItem);
  }

  async createItem(
    input: NewItemInput,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }> {
    const doc = await this.client.create({
      _type: "lostFoundItem",
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      category: { _type: "reference", _ref: input.categoryId },
      placeLabel: input.placeLabel.trim(),
      location: { _type: "geopoint", lat: input.lat, lng: input.lng },
      occurredAt: new Date(input.occurredAt).toISOString(),
      colors: input.colors,
      materials: input.materials,
      status: "open",
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      ...(input.secretChallenge ? { secretChallenge: input.secretChallenge.trim() } : {}),
      ...(input.handoverNote ? { handoverNote: input.handoverNote.trim() } : {}),
    });
    const item = await this.getItem(doc._id);
    if (!item) throw new Error("Created item could not be read back");
    const { decision, matches } = await this.runMatch(item);
    return { item, decision, matches };
  }

  async proposeMatches(
    itemId: string,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }> {
    const item = await this.getItem(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    const { decision, matches } = await this.runMatch(item);
    return { item, decision, matches };
  }

  private async runMatch(target: Item): Promise<{ decision: MatchDecision; matches: MatchRecord[] }> {
    const settings = await this.getSettings();
    const pool = await this.listItems("open");
    const decision = scoreCandidates(target, pool, settings);

    // Reuse undecided matches that already exist for these pairs so repeated
    // "Find its match" runs never stack duplicates. `matches[i]` must stay
    // aligned with `decision.candidates[i]` (the UI reads matches[0] as the
    // top candidate), so existing records are returned rather than skipped.
    const existingDocs = await this.client.fetch<SanityMatchDoc[]>(
      `*[_type == "match" && status in ["proposed", "pendingReview"] && (itemA._ref == $target || itemB._ref == $target)]${MATCH_PROJECTION}`,
      { target: target._id },
    );
    const existing = new Map<string, MatchRecord>();
    for (const doc of existingDocs) {
      const record = mapMatch(doc);
      existing.set(pairKey(record.itemAId, record.itemBId), record);
    }

    const candidateIds = decision.candidates.map((_, i) => `match-${Date.now().toString(36)}-${i}`);
    const matches: MatchRecord[] = [];
    const txn = this.client.transaction();
    let created = 0;

    decision.candidates.forEach((c, i) => {
      const key = pairKey(target._id, c.item._id);
      const prior = existing.get(key);
      if (prior) {
        matches.push(prior);
        return;
      }
      txn.create({
        _id: candidateIds[i],
        _type: "match",
        itemA: { _type: "reference", _ref: target._id },
        itemB: { _type: "reference", _ref: c.item._id },
        score: c.score,
        confidence: c.confidence,
        breakdown: c.breakdown,
        reasons: c.reasons,
        status: "pendingReview",
        proposedBy: "system",
      });
      const record: MatchRecord = {
        _id: candidateIds[i],
        itemAId: target._id,
        itemBId: c.item._id,
        score: c.score,
        confidence: c.confidence,
        breakdown: c.breakdown,
        reasons: c.reasons,
        status: "pendingReview",
        proposedBy: "system",
        createdAt: new Date().toISOString(),
      };
      existing.set(key, record);
      matches.push(record);
      created++;
    });

    if (created > 0) await txn.commit();
    return { decision, matches };
  }

  async listMatches(status?: MatchStatus): Promise<MatchRecord[]> {
    const filter = status ? ` && status == $status` : "";
    const docs = await this.client.fetch<SanityMatchDoc[]>(
      `*[_type == "match"${filter}] | order(_createdAt desc)${MATCH_PROJECTION}`,
      status ? { status } : {},
    );
    return docs.map(mapMatch);
  }

  async getMatch(id: string): Promise<MatchRecord | null> {
    const doc = await this.client.fetch<SanityMatchDoc | null>(
      `*[_type == "match" && _id == $id][0]${MATCH_PROJECTION}`,
      { id },
    );
    return doc ? mapMatch(doc) : null;
  }

  async decideMatch(
    id: string,
    decision: "confirmed" | "rejected",
    details?: { safeHarbor?: string; timeWindow?: string },
  ): Promise<{ match: MatchRecord; reunion?: Reunion }> {
    const match = await this.getMatch(id);
    if (!match) throw new Error(`Match ${id} not found`);
    if (match.status === "confirmed" || match.status === "rejected") {
      throw new Error(`Match already ${match.status} — transition denied`);
    }
    const decidedAt = new Date().toISOString();
    const patch = {
      status: decision,
      decidedAt,
      decidedBy: "volunteer",
    };
    const txn = this.client.transaction().patch(id, (p) => p.set(patch));
    if (decision === "confirmed") {
      const [itemA, itemB] = await this.getItemsByIds([match.itemAId, match.itemBId]);
      // Same fact-built, immediately published story the local provider
      // writes: /reunions must look identical whichever backend is live.
      const { title, story } = buildReunionContent(match, itemA, itemB);
      const token = `#LN-${Math.abs(id.split("").reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) % 9000 + 1000)}`;
      const safePoint = details?.safeHarbor || itemA?.handoverNote || itemB?.handoverNote || "Indiranagar Metro Station Customer Desk, Gate 2";
      const challengeProof = itemA?.secretChallenge || itemB?.secretChallenge || "Physical trait & secret match confirmed";
      txn
        .patch(match.itemAId, (p) => p.set({ status: "matched" }))
        .patch(match.itemBId, (p) => p.set({ status: "matched" }))
        .create({
          _type: "reunion",
          match: { _type: "reference", _ref: id },
          title,
          story,
          status: "published",
          publishedAt: decidedAt,
          safeHarbor: safePoint,
          claimToken: token,
          custodyState: "deposited",
          verifiedChallengeProof: challengeProof,
        });
    }
    await txn.commit();
    const updated = await this.getMatch(id);
    if (!updated) throw new Error("Match disappeared after transition");
    let reunion: Reunion | undefined;
    if (decision === "confirmed") {
      const reunionDocs = await this.client.fetch<
        {
          _id: string;
          matchId: string;
          title: string;
          story: string;
          status: "draft" | "published";
          _createdAt: string;
          publishedAt?: string;
          safeHarbor?: string;
          claimToken?: string;
          custodyState?: "deposited" | "verified" | "released";
          verifiedChallengeProof?: string;
        }[]
      >(`*[_type == "reunion" && match._ref == $id][0...1]{
          _id, "matchId": match._ref, title, story, status, _createdAt, publishedAt,
          safeHarbor, claimToken, custodyState, verifiedChallengeProof
        }`, { id });
      if (reunionDocs[0]) {
        reunion = {
          _id: reunionDocs[0]._id,
          matchId: reunionDocs[0].matchId,
          title: reunionDocs[0].title,
          story: reunionDocs[0].story,
          status: reunionDocs[0].status,
          createdAt: reunionDocs[0]._createdAt,
          publishedAt: reunionDocs[0].publishedAt,
          safeHarbor: reunionDocs[0].safeHarbor,
          claimToken: reunionDocs[0].claimToken,
          custodyState: reunionDocs[0].custodyState,
          verifiedChallengeProof: reunionDocs[0].verifiedChallengeProof,
        };
      }
    }
    return { match: updated, reunion };
  }

  async listReunions(): Promise<Reunion[]> {
    const docs = await this.client.fetch<
      {
        _id: string;
        matchId: string;
        title: string;
        story: string;
        status: "draft" | "published";
        _createdAt: string;
        publishedAt?: string;
        safeHarbor?: string;
        claimToken?: string;
        custodyState?: "deposited" | "verified" | "released";
        verifiedChallengeProof?: string;
      }[]
    >(`*[_type == "reunion"] | order(_createdAt desc){
        _id, "matchId": match->_id, title, story, status, _createdAt, publishedAt,
        safeHarbor, claimToken, custodyState, verifiedChallengeProof
      }`);
    return docs.map((d) => ({
      _id: d._id,
      matchId: d.matchId ?? "",
      title: d.title,
      story: d.story,
      status: d.status,
      createdAt: d._createdAt,
      publishedAt: d.publishedAt,
      safeHarbor: d.safeHarbor,
      claimToken: d.claimToken,
      custodyState: d.custodyState,
      verifiedChallengeProof: d.verifiedChallengeProof,
    }));
  }

  async getReunion(id: string): Promise<Reunion | null> {
    const all = await this.listReunions();
    return all.find((r) => r._id === id) ?? null;
  }

  async publishReunion(id: string, story?: string): Promise<Reunion> {
    const set: Record<string, unknown> = { status: "published", publishedAt: new Date().toISOString() };
    if (story) set.story = story;
    await this.client.patch(id).set(set).commit();
    const r = await this.getReunion(id);
    if (!r) throw new Error(`Reunion ${id} not found`);
    return r;
  }

  async updateCustodyState(id: string, custodyState: "deposited" | "verified" | "released"): Promise<Reunion> {
    await this.client.patch(id).set({ custodyState }).commit();
    const r = await this.getReunion(id);
    if (!r) throw new Error(`Reunion ${id} not found`);
    return r;
  }

  async resetDemoData(): Promise<void> {
    const tx = this.client.transaction();
    for (const item of SEED_ITEMS) {
      tx.patch(item._id, (p) => p.set({ status: "open" }));
    }
    await tx.commit();

    // Clear all existing reunions first, then matches (reunions hold references to matches)
    const reunions = await this.client.fetch<{ _id: string }[]>(`*[_type == "reunion"]{_id}`);
    for (const r of reunions) {
      await this.client.delete(r._id).catch(() => {});
    }
    const matches = await this.client.fetch<{ _id: string }[]>(`*[_type == "match"]{_id}`);
    for (const m of matches) {
      await this.client.delete(m._id).catch(() => {});
    }
  }
}

/** Same globalThis anchoring as the local provider — see the note in local.ts. */
const globalStore = globalThis as unknown as { __lostnetSanityProvider?: SanityProvider | null };

export function getSanityProvider(): LostNetData {
  if (process.env.NODE_ENV === "development" || !globalStore.__lostnetSanityProvider) {
    globalStore.__lostnetSanityProvider = new SanityProvider();
  }
  return globalStore.__lostnetSanityProvider;
}
