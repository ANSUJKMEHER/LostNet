/**
 * LostNet domain types.
 * These shapes are provider-agnostic: the local in-memory provider and the
 * Sanity provider both speak this language, and the GROQ projections in
 * lib/data/sanity.ts map Sanity documents onto them.
 */

export type ItemKind = "lost" | "found";

export type ItemStatus = "open" | "matched" | "resolved";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Item {
  _id: string;
  kind: ItemKind;
  title: string;
  description: string;
  categoryId: string;
  placeLabel: string;
  location: GeoPoint;
  occurredAt: string; // ISO datetime
  reportedAt: string; // ISO datetime
  /** Structured attributes captured at report time (optional). */
  colors: string[];
  materials: string[];
  status: ItemStatus;
  imageUrl?: string;
  /**
   * The public half of the ownership challenge: the question a claimant must
   * answer. Safe to show; useless on its own.
   */
  secretChallenge?: string;
  /** SERVER ONLY — never returned by a read path. Random per-item salt. */
  secretSalt?: string;
  /** SERVER ONLY — never returned by a read path. PBKDF2 hash of the answer. */
  secretAnswerHash?: string;
  /** Free-text note from the reporter about where they'd like to hand it over. */
  handoverNote?: string;
}

export interface NewItemInput {
  kind: ItemKind;
  title: string;
  description: string;
  categoryId: string;
  placeLabel: string;
  lat: number;
  lng: number;
  occurredAt: string;
  colors: string[];
  materials: string[];
  imageUrl?: string;
  secretChallenge?: string;
  /** Plaintext answer supplied by the reporter; hashed before it is stored. */
  secretAnswer?: string;
  handoverNote?: string;
}

export type MatchDimension = "category" | "geo" | "time" | "description";

export type MatchStatus = "proposed" | "pendingReview" | "confirmed" | "rejected";

export interface MatchBreakdown {
  category: number;
  geo: number;
  time: number;
  description: number;
}

export interface MatchCandidate {
  item: Item;
  score: number; // 0..1
  confidence: number; // 0..100, rounded
  breakdown: MatchBreakdown;
  reasons: string[];
  margin?: number;
  isAmbiguous?: boolean;
}

export interface MatchDecision {
  targetId: string;
  candidates: MatchCandidate[]; // sorted desc, only above threshold
  top: MatchCandidate | null;
  margin?: number;
  isAmbiguous?: boolean;
}

export interface MatchRecord {
  _id: string;
  itemAId: string;
  itemBId: string;
  score: number;
  confidence: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  status: MatchStatus;
  proposedBy: "system";
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  margin?: number;
  isAmbiguous?: boolean;
}

/** How the two sides plan to physically hand the item over. */
export type HandoverMode = "public" | "map" | "finder";

export interface HandoverPlan {
  mode: HandoverMode;
  /** Human-readable place name ("Metro Gate 2", "corner shop, 5th Main"). */
  label?: string;
  /** Exact point when the place was chosen on the map. */
  point?: GeoPoint | null;
  /** Rough agreed time, free text. */
  time?: string;
}

export interface ChatMessage {
  id: string;
  sender: "finder" | "owner";
  text: string;
  timestamp: string;
}

export interface Reunion {
  _id: string;
  matchId: string;
  title: string;
  story: string;
  status: "draft" | "published";
  createdAt: string;
  publishedAt?: string;
  /** Where the handover happens. `safeHarbor` mirrors `handover.label` for display. */
  safeHarbor?: string;
  handover?: HandoverPlan;
  claimToken?: string;
  custodyState?: "deposited" | "verified" | "released";
  /**
   * Snapshot of the ownership question, revealed only to someone holding the
   * claim token. The answer is never stored here — only its hash, on the item.
   */
  challengeQuestion?: string;
  /** Failed verification attempts; the desk locks after two. */
  claimAttempts?: number;
  /** Set when the desk verifies the challenge. */
  verifiedAt?: string;
  /** Chat messages exchanged between finder and claimant to coordinate handover. */
  messages?: ChatMessage[];
}

export interface Settings {
  geoRadiusKm: number;
  timeWindowHours: number;
  scoreThreshold: number;
  categoryMin: number;
  weights: Record<MatchDimension, number>;
}

export const DEFAULT_SETTINGS: Settings = {
  geoRadiusKm: 2,
  timeWindowHours: 60,
  scoreThreshold: 0.6,
  categoryMin: 0.8,
  weights: {
    category: 0.3,
    geo: 0.3,
    time: 0.2,
    description: 0.2,
  },
};
