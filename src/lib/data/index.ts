import { getLocalProvider, resetLocalProvider } from "./local";
import { getSanityProvider } from "./sanity";
import type { LostNetData } from "./provider";

/**
 * Provider factory — resolves once per process.
 *
 *   DATA_PROVIDER=local  -> in-memory seeded provider (default)
 *   DATA_PROVIDER=sanity -> Sanity Content Lake (needs project id + token)
 *
 * Everything else in the app depends on the LostNetData interface, so
 * swapping backends is a config change, never a code change.
 */

/** Same globalThis anchoring as the local provider — see the note in local.ts. */
const globalStore = globalThis as unknown as { __lostnetProvider?: LostNetData | null };

export function getProvider(): LostNetData {
  if (globalStore.__lostnetProvider) return globalStore.__lostnetProvider;
  const mode = (process.env.DATA_PROVIDER ?? "local").toLowerCase();
  globalStore.__lostnetProvider = mode === "sanity" ? getSanityProvider() : getLocalProvider();
  return globalStore.__lostnetProvider;
}

/**
 * Clears the memoised provider so the next getProvider() re-resolves.
 * Only the local (in-memory) provider has state to drop; Sanity is durable
 * and is never reset by the app.
 */
export function resetProvider(): void {
  globalStore.__lostnetProvider = null;
  resetLocalProvider();
}
