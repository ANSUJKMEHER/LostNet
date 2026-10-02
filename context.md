# LostNet — Project Context

> Handoff document. Read this first, then `phases.md` for what's done and exactly what to do next.
> **Deadline: Oct 4, 2026 11:59 PM PDT** (= Oct 5, 12:29 PM IST).

## What this is

LostNet is a **Path Two** entry for the DEV × Sanity Challenge 2026 (“Vibe-Code Something Strange”): a lost-and-found board where lost and found items **physically pull toward each other on a map and magnetize into a match**. The magnetization is the signature moment — it is the product, not decoration.

## Current status

- ✅ Matcher: **8/8 tests green**. Demo gradient verified via `npm run report`:
  `lost-01 × found-01` **79%** (clean demo pair) · `lost-03 × found-03` **69%** (earbuds) · `lost-02 × found-02` **65%** (bags closed) · keys/jewellery near-misses and the colour-contradiction pair correctly **NO MATCH**.
- ✅ **Test suite: 20/20 green** (8 matcher + 6 local-provider lifecycle + 6 narration/guard). Up from 8.
- ✅ Production build passes (Next 16 + Turbopack), including the Workflow plugin and all new routes.
- ✅ Full demo loop re-verified against a **production server build** (not just dev): propose → 79% → confirm → `/reunions` card → counter. Verified at API level and in server-rendered HTML.
- ✅ Phase 5 code written (schema, Studio, seed script) — **not yet wired to a real Sanity project**.
- ✅ **All three open gaps fixed** (Sanity reunion story, duplicate matches, favicon) — plus four more bugs found and fixed while doing it. See “Known issues” below.
- ✅ Phase 6a (Workflows Kanban), 6c (AI narration + fact guard), most of 6d (favicon, empty state, demo reset), and Phase 7 (submission draft) done.
- ⛔ **Blocker:** needs `NEXT_PUBLIC_SANITY_PROJECT_ID` + `SANITY_API_TOKEN` from the user to activate the real backend and to seed/verify against Content Lake.
- ⬜ Not done: App SDK desk (Phase 6b) — needs an authenticated Sanity account (`sanity app create`).

## What changed in this pass (Oct 1, 2026)

| Area | Change |
|---|---|
| `src/lib/reunion.ts` | **New.** One shared `buildReunionContent()` + `pairKey()`, so local and Sanity can never diverge again. |
| `src/lib/data/sanity.ts` | Reunion is now published with a fact-built story; duplicate pairs are reused, not re-created; `getMatch` is a direct GROQ query instead of fetching every match. |
| `src/lib/data/local.ts` | Deep-copies seed items on construction (the app was mutating the shared `SEED_ITEMS` array); reuses undecided pairs; anchored to `globalThis`. |
| `src/lib/data/index.ts` | Provider memo anchored to `globalThis`; `resetProvider()` added. |
| `src/lib/narration.ts` | **New.** Pure facts builder + `passesFactGuard()` + fact-built fallback. |
| `src/app/api/narrate/route.ts` | **New.** The only place a model may speak; OpenAI or Anthropic; degrades to the fact-built sentence with no key. |
| `src/app/api/reunions/[id]/route.ts` | **New.** Human/curated publish of a reunion story. |
| `src/app/api/demo/reset/route.ts` | **New.** Restores the seeded board between rehearsal takes (local provider only). |
| `src/app/icon.svg` | **New.** Favicon; kills the 404. |
| `sanity.config.ts` | Workflow plugin wired to `match` with the four states. Visualisation only. |
| `src/components/board-client.tsx` | Empty-board state. |
| `SUBMISSION.md` | **New.** The DEV post draft, including the honest-failures section. |

## Product loop (the only loop that matters)

1. User reports a **lost** (or found) item: title, description, category, place, map pin, time, optional colour/material chips.
2. The **deterministic matching engine** (pure TS — no LLM) scores opposite-kind open items.
3. If a candidate clears the gates, the UI plays the **magnetize animation** (two glowing dots pull to a midpoint and merge) → match dialog with confidence, per-dimension breakdown, and plain-language reasons.
4. A human confirms or rejects. Confirming marks both items `matched` and creates a **published reunion** with a story built from structured facts.
5. Reunions accumulate on `/reunions` — the public proof the board works.

**Hard rules:** the LLM never decides matches (narration only); `/api/matches/[id]` is the only code path allowed to change a match's status.

## Matching engine — exact model

`src/lib/matcher.ts`, settings in `src/lib/types.ts` (`DEFAULT_SETTINGS`):

```
score = 0.30*category + 0.30*geo + 0.20*time + 0.20*description

category    1.0 same category · 0.85 alias hit (e.g. "car keys" ↔ keys) · 0.25 otherwise
geo         1 - min(1, haversineKm / 2 km)
time        1 - min(1, |Δhours| / 60 h)
description jaccard(tokens) + 0.10 attribute boost (shared colour/material)
            − 0.25 colour contradiction (both declare colours, none overlap)

Hard gates (ALL must pass):
  1. opposite kinds (lost ↔ found)
  2. category >= 0.80
  3. total   >= 0.60
```

Every candidate carries `breakdown` (the four dimensions) + `reasons[]` so the UI can *explain* the pull. Scores are deterministic and unit-tested; `npm run report` prints the demo gradient and fails loudly if the seed drifts.

## Architecture

```
UI (React client components)
  └─ API routes (server-enforced transitions)
       └─ LostNetData interface      src/lib/data/provider.ts
            ├─ LocalProvider         src/lib/data/local.ts   (in-memory, seeded, default)
            └─ SanityProvider        src/lib/data/sanity.ts  (Content Lake via GROQ)
                 └─ matcher engine   src/lib/matcher.ts      (pure, deterministic)
```

- Provider chosen once per process by `DATA_PROVIDER` (`local` default, `sanity` needs project id + token). Behaviour must never fork by provider.
- `sanity.config.ts` + `src/sanity/schema.ts` hold the content model; **schema field names mirror the GROQ projections in `sanity.ts`** — change them in both places or nothing loads.
- Embedded Studio at `/studio`; renders a friendly “not configured” note when env vars are absent, so the board keeps working.

## Stack & conventions

- **Next.js 16.3** (App Router, Turbopack) · TypeScript strict · Tailwind v4 (`@tailwindcss/postcss`) · MapLibre GL 5 · Motion (`motion`) · lucide-react · `@sanity/client` 6 · `sanity` 6 + `next-sanity` 13 + `@sanity/vision` (embedded Studio) · `tsx` (scripts) · vitest.
- Path alias `@/*` → `src/*`. Scripts: `dev`, `build`, `start`, `test`, `typecheck`, `report`, `seed:sanity`.
- **No shadcn** — hand-rolled Tailwind components sharing the `.ln-glass` style; keeps deps and bundle small.
- Look: dark map-first UI; lost = indigo, found = amber, reunited = rose; system font stack (no Google Fonts → no build-time network dependency).
- Map base style: Carto Positron (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`).

## Key files

| Path | What |
|---|---|
| `src/lib/types.ts` | Domain types + `DEFAULT_SETTINGS` (the scoring model's knobs) |
| `src/lib/matcher.ts` | Deterministic scoring + reasons generation |
| `src/lib/matcher.test.ts` | 8 tests incl. two near-miss guards (keep green) |
| `src/lib/utils.ts` | tokenize · jaccard · haversine · hoursBetween · formatting |
| `src/lib/categories.ts` | 12-category taxonomy with aliases |
| `src/lib/seed.ts` | 20 seeded items (10 lost / 10 found), Indiranagar Bengaluru, designed gradient |
| `src/lib/data/{provider,local,sanity,index}.ts` | Data layer + provider factory |
| `src/app/api/report/route.ts` | POST report → create + auto-propose |
| `src/app/api/matches/propose/route.ts` | POST propose for an item |
| `src/app/api/matches/[id]/route.ts` | POST confirm/reject — **the only transition authority** |
| `src/app/api/items/route.ts` | GET board (client refresh) |
| `src/components/board-map.tsx` | MapLibre + markers + magnetize overlay + board-view fallback |
| `src/components/board-client.tsx` | Orchestrator: flow state machine, dialogs, toasts |
| `src/components/{item-panel,report-dialog,match-dialog}.tsx` | UI surfaces |
| `src/app/page.tsx` · `src/app/reunions/page.tsx` | Server pages |
| `src/lib/reunion.ts` | Shared fact-built reunion content (both providers) + `pairKey` dedupe key |
| `src/lib/narration.ts` | Pure facts builder + `passesFactGuard` + fact-built fallback |
| `src/app/api/narrate/route.ts` | POST — the only LLM call site (facts only, guarded, optional) |
| `src/app/api/reunions/[id]/route.ts` | POST — publish a curated reunion story |
| `src/app/api/demo/reset/route.ts` | POST — restore the seeded board (local provider only) |
| `src/lib/data/local.test.ts` | Provider lifecycle tests (dedupe, published reunion, 409, reset) |
| `src/lib/narration.test.ts` | Fact-guard tests |
| `SUBMISSION.md` | The DEV post draft (Phase 7) |
| `src/sanity/schema.ts` · `sanity.config.ts` · `src/app/studio/[[...tool]]/page.tsx` | Content model + embedded Studio + Workflow Kanban |
| `scripts/seed-sanity.ts` | `npm run seed:sanity` — settings, 12 categories, 20 items (deterministic `_id`s) |
| `scripts/score-report.ts` | `npm run report` — verifies the demo gradient |

## Engineering gotchas (learned the hard way — do not regress)

1. **MapLibre CSS forces `position: relative` on its container**, which overrides Tailwind's `absolute` and collapses the map to height 0 (everything inside gets clipped). Never put `absolute inset-0` on the MapLibre container: position an **outer wrapper** and hand MapLibre an **inner `h-full w-full` div**.
2. **Marker hit-testing:** keep `pointer-events-none` on the animated pulse ring, or it steals clicks from neighbouring markers. Bake the centring offset into the animated values (`pos.x - 14`) — never mix an inline `translate(-50%)` with Motion's `x/y` (they fight).
3. **Seed density is a feature.** Items are spread across the neighbourhood so only designed pairs sit close; if you cluster them again, markers overlap and clicks get swallowed.
4. **Fit the view to the items** (`map.fitBounds` with padding, and the bounds-scaled fallback projector) — otherwise markers land off-screen.
5. **No WebGL → board view.** In headless/old environments the app degrades to a dotted grid with mathematically projected markers (`.ln-board-grid` + `makeFallbackProjector`). Intentional; tiles need network.
6. **Motion overlay dots** are DOM elements on top of the map, not GL layers — that's what makes the magnetize animation easy; keep it that way.

## How to run

```bash
cd personal/lostnet
npm install            # if node_modules is missing
npm run dev            # http://localhost:3000
npm test               # 20 tests (8 matcher + 6 provider + 6 narration)
npm run report         # print the demo match gradient (fails loudly if the seed drifts)
npm run build          # production build (~3 GB free memory needed)
npm run seed:sanity    # populate a Sanity project (needs .env)
```

Demo helpers (local provider only):

```bash
curl -X POST localhost:3000/api/demo/reset                 # restore the seeded board between takes
curl -X POST localhost:3000/api/matches/propose \
     -H 'content-type: application/json' -d '{"itemId":"lost-01"}'
curl -X POST localhost:3000/api/matches/<matchId> \
     -H 'content-type: application/json' -d '{"decision":"confirmed"}'
```

With `DATA_PROVIDER=local` (default) everything works with **zero credentials** — that's the demo mode. `DATA_PROVIDER=sanity` + project id/token switches to the real Content Lake.

## Known issues

### Fixed (do not regress)

1. ✅ **Sanity reunion story gap** — the two providers had diverged: Sanity wrote `title: "A reunion"`, `story: ""`, `status: "draft"` while local wrote a published, fact-built story, so `/reunions` would have looked empty on the real backend. Both now call the shared `buildReunionContent()` in `src/lib/reunion.ts`. Test: `local.test.ts`.
2. ✅ **Duplicate matches** — re-running “Find its match” stacked the same pair. Undecided matches are now reused (and returned at the same index as the candidate, because the UI reads `matches[0]`). Tests: `local.test.ts`.
3. ✅ **No favicon** — `src/app/icon.svg` added.
4. ✅ **The app mutated its own seed data.** `LocalProvider` stored *references* to `SEED_ITEMS`, so confirming a match set `status = "matched"` on the shared module-level objects and the demo reset could never restore the board. Now deep-copied on construction.
5. ✅ **The in-memory board forked in production.** Next.js bundles server pages and route handlers separately, so the module-scope singleton existed once *per bundle*: the API reported “1 published reunion” while server-rendered `/reunions` said “Nothing yet”. Providers are now anchored to `globalThis`.
6. ✅ **`matcher.ts` documented the wrong weights** (`0.40/0.30/0.15/0.15` vs the real `0.30/0.30/0.20/0.20`). Fixed, with a note that the comment must track `DEFAULT_SETTINGS.weights`.

### Still open

1. **Build memory** — Next 16 + Turbopack + Studio deps needs ~3 GB free; in a constrained container it can be `Killed` mid-build. Re-run, or `NODE_OPTIONS=--max-old-space-size=3072 npx next build` (verified working at 3072 MB).
2. **App SDK desk not built** — Phase 6b needs an authenticated Sanity account (`sanity app create`). Not scaffolded.
3. **LocalProvider is in-memory** — resets on server restart. Expected; Sanity is real persistence. `POST /api/demo/reset` restores the seeded board on demand.
4. **Map tiles need network.** Without WebGL (headless/old devices) the app intentionally degrades to the **board view**: dotted grid + markers projected by pure math. Not a bug — but if a demo machine shows the grid instead of streets, that's why. Do not record the demo on it.
5. **Sanity path is written but unverified.** Every Sanity code path is typechecked and mirrors the tested local provider, but it has never run against a real Content Lake. Verify it first thing after credentials arrive.

## Next actions (short version — full detail in `phases.md`)

1. Get **Sanity project id + editor token** from the user → fill `.env` → `npm run seed:sanity` → set `DATA_PROVIDER=sanity` → re-run the demo loop and look at Studio/Vision. **This unblocks the only remaining submission requirement.**
2. Verify the Sanity path end to end (the four fixes above all touch `sanity.ts`) — propose → confirm → `/reunions` → Studio documents → Vision query.
3. Phase 6b: App SDK “Reunion Desk” (optional; nice-to-have) → capture demo screenshots + GIF on a machine with WebGL and tiles.
4. Phase 7: paste the project id / public dataset URL and the live demo URL into `SUBMISSION.md`, publish to DEV with `#sanitychallenge`, and check the post + demo URL **while logged out**.
