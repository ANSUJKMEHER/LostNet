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

/**
 * LostNetData — the single contract both data providers implement.
 *
 * The app never talks to a database directly. API routes call this
 * interface; the chosen implementation is resolved once per process in
 * getProvider() based on DATA_PROVIDER.
 *
 *   - LocalProvider  (lib/data/local.ts)   in-memory, seeded, zero setup
 *   - SanityProvider (lib/data/sanity.ts)  Sanity Content Lake via GROQ
 */
export interface LostNetData {
  getSettings(): Promise<Settings>;
  listItems(status?: ItemStatus): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  getItemsByIds(ids: string[]): Promise<Item[]>;
  /**
   * Creates an item and immediately proposes matches against the board.
   * `matches` are the persisted match records, aligned with
   * `decision.candidates` (matches[i] pairs target with candidates[i].item).
   */
  createItem(
    input: NewItemInput,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }>;
  /** Proposes matches for an existing open item. */
  proposeMatches(
    itemId: string,
  ): Promise<{ item: Item; decision: MatchDecision; matches: MatchRecord[] }>;
  listMatches(status?: MatchStatus): Promise<MatchRecord[]>;
  getMatch(id: string): Promise<MatchRecord | null>;
  /**
   * The ONLY path that transitions a match. Enforced here, not in UI:
   *   proposed|pendingReview -> confirmed|rejected
   * Confirming marks both items matched and creates a reunion draft.
   */
  decideMatch(
    id: string,
    decision: "confirmed" | "rejected",
    details?: { safeHarbor?: string; timeWindow?: string },
  ): Promise<{ match: MatchRecord; reunion?: Reunion }>;
  listReunions(): Promise<Reunion[]>;
  getReunion(id: string): Promise<Reunion | null>;
  publishReunion(id: string, story?: string): Promise<Reunion>;
  updateCustodyState?(id: string, custodyState: "deposited" | "verified" | "released"): Promise<Reunion>;
  resetDemoData?(): Promise<void>;
}
