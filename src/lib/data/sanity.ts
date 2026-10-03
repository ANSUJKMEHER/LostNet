import { createClient, type SanityClient } from "@sanity/client";
import type {
  HandoverPlan,
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
import { hashAnswer, newClaimToken, newSalt, stripItemSecrets, stripReunionSecrets, verifyAnswer } from "../secret";
import type { LostNetData } from "./provider";

/**
 * SanityProvider — the real backend.
 *
 * Sanity document types (see src/sanity/schema.ts):
 *   lostFoundItem, match, reunion, settings, category
 *
 * GROQ projections below map those documents onto the domain types in
 * lib/types.ts. The matching engine itself stays in lib/matcher.ts and is
 * provider-independent.
 *
 * Secrets: an item's `secretSalt` and `secretAnswerHash` are projected only
 * inside verifyClaim(), which runs on the server. Every other read path maps
 * through mapItem(), which strips them — so the hash cannot leak to a browser.
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
  secretSalt?: string;
  secretAnswerHash?: string;
  handoverNote?: string;
};

const ITEM_PROJECTION = `{
  _id, kind, title, description,
  "categoryId": coalesce(category->_id, "other"),
  placeLabel,
  "location": location,
  occurredAt, _createdAt,
  colors, materials, status,
  imageUrl, secretChallenge, secretSalt, secretAnswerHash, handoverNote
}`;

const MATCH_PROJECTION = `{
  _id,
  "itemAId": itemA->_id, "itemBId": itemB->_id,
  score, confidence, breakdown, reasons, status, _createdAt, decidedAt, decidedBy
}`;

const REUNION_PROJECTION = `{
  _id, "matchId": match._ref, title, story, status, _createdAt, publishedAt,
  safeHarbor, handover, claimToken, custodyState, challengeQuestion, claimAttempts, verifiedAt
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

type SanityReunionDoc = {
  _id: string;
  matchId: string | null;
  title: string;
  story: string;
  status: "draft" | "published";
  _createdAt: string;
  publishedAt?: string;
  safeHarbor?: string;
  handover?: HandoverPlan;
  claimToken?: string;
  custodyState?: "deposited" | "verified" | "released";
  challengeQuestion?: string;
  claimAttempts?: number;
  verifiedAt?: string;
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

/** Public shape — secrets never survive this function. */
function mapItem(doc: SanityItemDoc): Item {
  return stripItemSecrets({
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
    secretSalt: doc.secretSalt,
    secretAnswerHash: doc.secretAnswerHash,
    handoverNote: doc.handoverNote,
  });
}

function mapReunion(d: SanityReunionDoc): Reunion {
  return {
    _id: d._id,
    matchId: d.matchId ?? "",
    title: d.title,
    story: d.story,
    status: d.status,
    createdAt: d._createdAt,
    publishedAt: d.publishedAt,
    safeHarbor: d.safeHarbor,
    handover: d.handover,
    claimToken: d.claimToken,
    custodyState: d.custodyState,
    challengeQuestion: d.challengeQuestion,
    claimAttempts: d.claimAttempts ?? 0,
    verifiedAt: d.verifiedAt,
  };
}

/** Internal only: keeps the salt + hash so verifyClaim can compare on the server. */
function mapItemRaw(doc: SanityItemDoc): Item {
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
    secretSalt: doc.secretSalt,
    secretAnswerHash: doc.secretAnswerHash,
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
      `*[_type == "lostFoundItem" && _id == $id][0]${ITEM_PROJECTION}`,
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
    // The challenge exists only as a question + answer pair; a question with no
    // answer is not a gate, so neither is stored.
    const challenge = input.secretChallenge?.trim() || undefined;
    const answer = input.secretAnswer?.trim() || undefined;
    const secrets =
      challenge && answer
        ? (() => {
            const secretSalt = newSalt();
            return { secretSalt, secretAnswerHash: hashAnswer(answer, secretSalt) };
          })()
        : {};

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
      ...(challenge && answer ? { secretChallenge: challenge } : {}),
      ...secrets,
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
    if (item.status === "matched" || item.status === "resolved") {
      return { item, decision: { targetId: item._id, candidates: [], top: null }, matches: [] };
    }
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
    handover?: HandoverPlan,
  ): Promise<{ match: MatchRecord; reunion?: Reunion }> {
    const match = await this.getMatch(id);
    if (!match) throw new Error(`Match ${id} not found`);
    if (match.status === "confirmed" || match.status === "rejected") {
      throw new Error(`Match already ${match.status} — transition denied`);
    }
    const decidedAt = new Date().toISOString();
    const patch = { status: decision, decidedAt, decidedBy: "volunteer" };
    const txn = this.client.transaction().patch(id, (p) => p.set(patch));

    if (decision === "confirmed") {
      const [itemA, itemB] = await this.getItemsByIds([match.itemAId, match.itemBId]);
      // Same fact-built, immediately published story the local provider writes:
      // /reunions must look identical whichever backend is live.
      const { title, story } = buildReunionContent(match, itemA, itemB);
      // No fabricated defaults: an unset plan means the finder keeps it.
      const plan: HandoverPlan = handover && handover.mode ? handover : { mode: "finder" };
      const challengeQuestion = itemA?.secretChallenge || itemB?.secretChallenge || undefined;
      const point = plan.point
        ? { _type: "geopoint", lat: plan.point.lat, lng: plan.point.lng }
        : undefined;

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
          safeHarbor: plan.label,
          handover: {
            mode: plan.mode,
            ...(plan.label ? { label: plan.label } : {}),
            ...(point ? { point } : {}),
            ...(plan.time ? { time: plan.time } : {}),
          },
          claimToken: newClaimToken(),
          // Nothing is in custody until someone actually deposits it.
          claimAttempts: 0,
          ...(challengeQuestion ? { challengeQuestion } : {}),
        });
    }
    await txn.commit();
    const updated = await this.getMatch(id);
    if (!updated) throw new Error("Match disappeared after transition");

    let reunion: Reunion | undefined;
    if (decision === "confirmed") {
      const docs = await this.client.fetch<SanityReunionDoc[]>(
        `*[_type == "reunion" && match._ref == $id][0...1]${REUNION_PROJECTION}`,
        { id },
      );
      if (docs[0]) reunion = mapReunion(docs[0]);
    }
    return { match: updated, reunion };
  }

  /** Public listing — the ownership question is not included. */
  async listReunions(): Promise<Reunion[]> {
    const docs = await this.client.fetch<SanityReunionDoc[]>(
      `*[_type == "reunion"] | order(_createdAt desc)${REUNION_PROJECTION}`,
    );
    return docs.map((d) => stripReunionSecrets(mapReunion(d)));
  }

  async getReunion(id: string): Promise<Reunion | null> {
    const doc = await this.client.fetch<SanityReunionDoc | null>(
      `*[_type == "reunion" && _id == $id][0]${REUNION_PROJECTION}`,
      { id },
    );
    return doc ? mapReunion(doc) : null;
  }

  /**
   * Token lookup. Returns the challenge question too — the question is only
   * useful to someone who already holds the token, and the desk needs to read
   * it aloud. The answer never appears here at any point.
   */
  async getReunionByToken(token: string): Promise<Reunion | null> {
    const clean = token.trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
    if (!clean) return null;
    const docs = await this.client.fetch<SanityReunionDoc[]>(
      `*[_type == "reunion" && defined(claimToken)]${REUNION_PROJECTION}`,
    );
    const found = docs.find((d) => (d.claimToken ?? "").toUpperCase().replace(/^#/, "") === clean);
    return found ? mapReunion(found) : null;
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

  /**
   * Server-side ownership check against the stored PBKDF2 hash. Nothing about
   * the secret leaves this method except a boolean. Two failures lock it.
   */
  async verifyClaim(
    reunionId: string,
    answer: string,
  ): Promise<{ verified: boolean; attempts: number; locked: boolean; hasChallenge: boolean }> {
    const reunion = await this.getReunion(reunionId);
    if (!reunion) throw new Error(`Reunion ${reunionId} not found`);
    const match = await this.getMatch(reunion.matchId);
    // Deliberately the raw projection: the salt and hash are needed here and
    // nowhere else, and they are never returned to the caller.
    const rawDocs = match
      ? await this.client.fetch<SanityItemDoc[]>(
          `*[_type == "lostFoundItem" && _id in $ids]${ITEM_PROJECTION}`,
          { ids: [match.itemAId, match.itemBId] },
        )
      : [];
    const challenged = rawDocs.map(mapItemRaw).find((i) => i.secretAnswerHash && i.secretSalt);

    const attempts = reunion.claimAttempts ?? 0;
    if (!challenged?.secretAnswerHash || !challenged.secretSalt) {
      return { verified: false, attempts, locked: false, hasChallenge: false };
    }
    if (attempts >= 2) {
      return { verified: false, attempts, locked: true, hasChallenge: true };
    }

    const ok = verifyAnswer(answer, challenged.secretSalt, challenged.secretAnswerHash);
    if (ok) {
      await this.client.patch(reunionId).set({ verifiedAt: new Date().toISOString() }).commit();
      return { verified: true, attempts, locked: false, hasChallenge: true };
    }
    const next = attempts + 1;
    await this.client.patch(reunionId).set({ claimAttempts: next }).commit();
    return { verified: false, attempts: next, locked: next >= 2, hasChallenge: true };
  }
}

/** Same globalThis anchoring as the local provider — see the note in local.ts. */
const globalStore = globalThis as unknown as { __lostnetSanityProvider?: SanityProvider | null };

export function getSanityProvider(): LostNetData {
  if (!globalStore.__lostnetSanityProvider) globalStore.__lostnetSanityProvider = new SanityProvider();
  return globalStore.__lostnetSanityProvider;
}
