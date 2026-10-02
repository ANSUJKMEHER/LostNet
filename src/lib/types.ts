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
  secretChallenge?: string;
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

export interface Reunion {
  _id: string;
  matchId: string;
  title: string;
  story: string;
  status: "draft" | "published";
  createdAt: string;
  publishedAt?: string;
  safeHarbor?: string;
  claimToken?: string;
  custodyState?: "deposited" | "verified" | "released";
  verifiedChallengeProof?: string;
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
