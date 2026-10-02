/**
 * Demo-data score report — the fastest way to verify the seed dataset still
 * produces the intended match gradient after any change to seed.ts / matcher.ts.
 *
 *   npm run report
 *
 * Expected (threshold 0.60):
 *   lost-01 x found-01   ~79%   MATCH   (the clean demo pair)
 *   lost-03 x found-03   ~69%   MATCH   (ambiguous: earbuds)
 *   lost-02 x found-02   ~65%   MATCH   (ambiguous: bags)
 *   lost-09 x found-09   —      NO MATCH (near-miss: silver carabiner keys vs brass key)
 *   lost-04 x found-04   —      NO MATCH (near-miss: bracelet vs necklace)
 *   lost-01 x found-09   —      NO MATCH (colour contradiction: black/red key vs gold key)
 */
import { scoreCandidates } from "../src/lib/matcher";
import { SEED_ITEMS } from "../src/lib/seed";
import { DEFAULT_SETTINGS } from "../src/lib/types";

const PAIRS: Array<[string, string, string]> = [
  ["lost-01", "found-01", "clean demo pair (Honda key)"],
  ["lost-03", "found-03", "ambiguous (earbuds)"],
  ["lost-02", "found-02", "ambiguous (bags)"],
  ["lost-09", "found-09", "near-miss (carabiner vs brass key)"],
  ["lost-04", "found-04", "near-miss (bracelet vs necklace)"],
  ["lost-01", "found-09", "colour contradiction (black/red vs gold)"],
];

const byId = new Map(SEED_ITEMS.map((i) => [i._id, i]));

console.log(`threshold=${DEFAULT_SETTINGS.scoreThreshold}  weights=${JSON.stringify(DEFAULT_SETTINGS.weights)}\n`);

let failures = 0;
for (const [aId, bId, label] of PAIRS) {
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) {
    console.log(`✗ ${aId} / ${bId} — missing from seed`);
    failures++;
    continue;
  }
  const result = scoreCandidates(a, [b]);
  const top = result.top;
  if (top) {
    console.log(`✓ MATCH    ${aId} x ${bId}  ${String(top.confidence).padStart(3)}%  ${label}`);
    console.log(`           reasons: ${top.reasons.join(" · ")}`);
  } else {
    console.log(`— NO MATCH ${aId} x ${bId}      ${label}`);
  }
}

// Also surface the full candidate list for the clean item, to catch new arrivals.
const clean = byId.get("lost-01");
if (clean) {
  const all = scoreCandidates(clean, SEED_ITEMS);
  console.log(`\nlost-01 full candidate list: ${all.candidates.length ? all.candidates.map((c) => `${c.item._id}(${c.confidence}%)`).join(", ") : "none"}`);
}

console.log(failures ? `\n${failures} pair(s) missing — fix seed.ts` : "\nSeed dataset intact.");
