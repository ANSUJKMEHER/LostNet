# LostNet — a lost-and-found board where things pull toward each other

> **Submission for the DEV × Sanity Challenge 2026 — "Vibe-Code Something Strange" (Path Two).**
> Tagged `#sanitychallenge`.
>
> **Status: code complete, Sanity project pending credentials.** Everything that can be
> built and verified without a Sanity account is done, tested and green. The two items
> that require *your* Sanity login are listed under [What still needs you](#what-still-needs-you).

---

## The 5-second pitch

A lost-and-found board where lost and found items **physically pull toward each other on a map and magnetize into a match**.

Two reports are pinned on a map — one indigo (lost), one amber (found). A deterministic engine scores them. If they clear the gates, the two dots **animate across the map, collide at the midpoint, and burst into a rose marker**. A dialog explains *why* they were pulled together — confidence, four per-dimension bars, plain-language reasons. A human confirms. The board writes a reunion with a story built from the structured facts, and the counter ticks up.

The magnetization is the product. It is not decoration on top of a CRUD form.

---

## The schema: matches are documents, not UI state

Three documents, each doing one job:

```
lostFoundItem ─┐
               ├─►  match  ──►  reunion
lostFoundItem ─┘   (a scored,     (the public
                    decidable       proof it
                    claim)          worked)
```

- **`lostFoundItem`** — kind (`lost`/`found`), title, description, category reference, `geopoint` location, `placeLabel`, `occurredAt`, colour/material tag arrays, `status`.
- **`match`** — `itemA`/`itemB` references, `score`, `confidence`, a `breakdown` object with all four dimensions, `reasons[]`, and a `status` of `proposed → pendingReview → confirmed | rejected`.
- **`reunion`** — `match` reference, `title`, `story`, `status`, `publishedAt`.
- Plus **`category`** (12-document taxonomy with aliases) and **`settings`** (the scoring knobs, so thresholds are content, not code).
- The Workflow plugin adds its own metadata documents; those track *display* state only.

**Why `match` is a document and not component state:** a match is a claim that two people's
reports are the same object. Claims need an identity, an author, a status, a decision
timestamp, and an audit trail. They need to be queryable ("show me everything waiting on a
volunteer"), and they need to survive a page refresh. Every one of those is a document
concern. When a match lived only in React state, "why did this pair get rejected?" had no
answer.

**Field names are load-bearing.** The GROQ projections in `src/lib/data/sanity.ts` read
exactly the paths declared in `src/sanity/schema.ts`. Rename one side and nothing loads.
That coupling is deliberate and commented in both files.

---

## The engine: deterministic, pure, and the LLM is banned

`src/lib/matcher.ts` is a pure TypeScript function with no I/O and no model call anywhere
near it.

```
score = 0.30·category + 0.30·geo + 0.20·time + 0.20·description
```

| Dimension | Formula |
|---|---|
| `category` | `1.0` same category · `0.85` alias hit (`"car keys"` ↔ `keys`) · `0.25` otherwise |
| `geo` | `1 − min(1, haversineKm / 2 km)` |
| `time` | `1 − min(1, \|Δhours\| / 60 h)` |
| `description` | `jaccard(tokens) + 0.10` shared-attribute boost `− 0.25` colour contradiction |

**Hard gates — a candidate must pass all three:**

1. Opposite kinds (`lost` ↔ `found`)
2. `category ≥ 0.80`
3. `total ≥ 0.60`

Every surviving candidate carries its `breakdown` and its `reasons[]`, which is what lets
the dialog *explain the pull* instead of asserting it.

**Why the LLM is not allowed to decide.** A match tells someone "your keys are at this
address." That is a consequential, occasionally unsafe claim. It must be
**reproducible** (same two reports ⇒ same score, forever), **explicable** (which dimension
carried the weight?), **unit-testable**, and **cheap** (it runs on every report). A
sampled token stream is none of those. So the model is confined to narration — and even
there, `passesFactGuard` rejects any generated sentence containing a numeral that is not
present in the facts payload it was given. If the model is unavailable, the fact-built
sentence renders instead. Narration is never a dependency of the demo loop.

### Verification (paste-ready)

```
$ npm test
 ✓ src/lib/data/local.test.ts (6 tests)
 ✓ src/lib/matcher.test.ts (8 tests)
 ✓ src/lib/narration.test.ts (6 tests)
 Test Files  3 passed (3)
      Tests  20 passed (20)
```

```
$ npm run report
threshold=0.6  weights={"category":0.3,"geo":0.3,"time":0.2,"description":0.2}

✓ MATCH    lost-01 x found-01   79%  clean demo pair (Honda key)
— NO MATCH lost-09 x found-09      near-miss (carabiner vs brass key)
— NO MATCH lost-04 x found-04      near-miss (bracelet vs necklace)
— NO MATCH lost-01 x found-09      colour contradiction (black/red vs gold)

Seed dataset intact.
```

The seed is a **designed gradient**: one clean 79% pair, two ambiguous pairs (69%, 65%),
two near-misses that must stay *below* threshold, and a colour-contradiction pair. The
`report` script fails loudly if a change to `seed.ts` or `matcher.ts` drifts the gradient,
and two of the tests exist purely to guard the near-misses.

---

## The two Sanity-native moves

**1. Content Lake is the board's memory.** The reunion feed is not a screenshot gallery or
a hardcoded "success stories" array — it is `*[_type == "reunion"]`. Confirming a match
writes a document; the same write makes the pair appear on `/reunions`. The swap between
the demo backend and the real one is a single env var (`DATA_PROVIDER`), and the providers
implement one `LostNetData` interface so behaviour never forks by backend.

**2. The API route — not the UI — is the only authority that can transition a match.**
`/api/matches/[id]` is the sole code path that may move a match out of
`proposed`/`pendingReview`. It rejects re-deciding an already decided match with **409**:

```
$ curl -X POST /api/matches/$ID -d '{"decision":"rejected"}'
http=409
{"error":"Match already confirmed — transition denied"}
```

The Studio Kanban board is **visualisation only**. Dragging a card in Studio changes the
plugin's metadata document and enforces nothing — because a workflow board that can silently
reunite two people's belongings is a workflow board that will eventually do it by accident.

---

## Honest failures

Graded section, so here is the real list — including three found while finishing this pass.

**The map container trap.** MapLibre's own CSS forces `position: relative` on its container,
which overrode Tailwind's `absolute inset-0` and collapsed the map to **height 0** — every
marker clipped and invisible, with no error anywhere. The fix is structural: an outer wrapper
owns the page positioning and MapLibre gets an inner `h-full w-full` div.

**Markers that ate each other's clicks.** The animated pulse ring around each marker was
capturing pointer events, so clicking one marker would select a *neighbouring* one. Fix:
`pointer-events-none` on the pulse.

**Motion and inline transforms fight.** Centring the marker with an inline `translate(-50%)`
while Motion animated `x`/`y` produced markers that drifted. Fix: bake the offset into the
animated values (`pos.x - 14`).

**Marker density is a design constraint.** Clustering the seed items made markers overlap
and swallow clicks. The seed is deliberately spread across the neighbourhood; if you
compress it, clicks break. Documented in `context.md` so it does not get "tidied up".

**The threshold had to move, and the tests now defend it.** The original `0.55` threshold
admitted the silver-bracelet × silver-chain-necklace pair — same category, same colour, same
material, genuinely different objects. Rather than hand-tune the jaccard weight, the
threshold moved to `0.60` and two **near-miss guard tests** were added so that no future
description tweak can quietly re-admit them.

**The stale comment.** `matcher.ts`'s header documented the weights as
`0.40/0.30/0.15/0.15` while `DEFAULT_SETTINGS` actually used `0.30/0.30/0.20/0.20` — the
comment had drifted and was lying about the model. Fixed, with a note that the comment must
match `DEFAULT_SETTINGS.weights`. A scoring model whose documentation disagrees with its
constants is worse than an undocumented one.

**The providers had quietly diverged.** `LocalProvider` wrote a *published* reunion with a
fact-built story, while `SanityProvider` wrote `title: "A reunion"`, `story: ""`,
`status: "draft"`. The demo looked perfect locally and `/reunions` would have been empty on
the real backend — the exact failure mode that only shows up in front of judges. Both
providers now call one shared `buildReunionContent()`.

**Re-running "Find its match" stacked duplicate pairs.** Asking twice for the same item
created the same match twice, polluting the review queue. Now the engine reuses an existing
undecided match for the pair — and returns it at the *same index* as the candidate, because
the UI reads `matches[0]` as the top candidate.

**The seed array was being mutated by the app.** `LocalProvider` stored *references* to the
module-level `SEED_ITEMS`. Confirming a match sets `item.status = "matched"` — on the shared
seed object. So the "demo reset" could never actually restore the demo board. Caught by a
test that asserted a fresh provider still matches `lost-01`. Fixed by deep-copying on
construction.

**The in-memory board silently forked in production.** Next.js bundles server pages and
route handlers separately, so a module-scope singleton was instantiated **once per bundle**.
The API said "1 published reunion"; the server-rendered `/reunions` page said "Nothing yet".
Confirmed by diffing the API response against the server-rendered HTML. Fixed by anchoring
the provider to `globalThis` (the real Node global, shared by every bundle in the process).

**Still open and honest:**

- The **App SDK "Reunion Desk"** is not built. It needs `sanity app create`, which requires
  an authenticated Sanity account. It is scaffolded in plan only.
- The seed dataset is **20 items in one Bengaluru neighbourhood**. The engine's geo/time
  weights are tuned to that density and would need re-tuning for a city-wide board.
- `LocalProvider` is in-memory by design; it is the zero-credential demo mode, not
  persistence.

---

## What the App SDK desk and Workflows do

**Workflows (`sanity-plugin-workflow`, configured on `match`)** give reviewers a Kanban view
of `Proposed → Pending review → Confirmed → Rejected`. It is a **read-only lens over state
that the API already owns** — it changes nothing about whether two items are actually
reunited.

**The Reunion Desk (`@sanity/sdk-react`)** — planned, not built — would list `pendingReview`
matches, show each pair with its confidence and reasons, and offer confirm/reject that calls
the **same** `/api/matches/[id]` route. One write path, two entry points. It also gives the
AI a seat: narrate → human edits → publish.

---

## What still needs you

Two things genuinely require your Sanity account, and one is a hard submission requirement.

1. **Create the Sanity project** (≈5 minutes): `sanity.io/manage` → Create project `LostNet`
   → dataset `production` → API → Tokens → add an **Editor** token → API → CORS origins →
   add `http://localhost:3000` **with credentials**. Then:

   ```
   cp .env.example .env
   # DATA_PROVIDER=sanity
   # NEXT_PUBLIC_SANITY_PROJECT_ID=<project id>
   # NEXT_PUBLIC_SANITY_DATASET=production
   # SANITY_API_TOKEN=<editor token>
   npm run seed:sanity     # 1 settings doc, 12 categories, 20 items (deterministic _ids)
   npm run dev             # board now reads from Content Lake
   ```

2. **Paste the project ID (or the public dataset URL) into this post.** The challenge treats
   a missing project ID / public dataset URL as an *incomplete* entry. Keep the `production`
   dataset public so the URL returns data unauthenticated.

> **Required before submitting:** replace the placeholder below and verify it works while
> logged out.
>
> - Sanity **project ID**: `<<PASTE PROJECT ID>>`
> - Public dataset URL: `<<PASTE PUBLIC DATASET URL>>`
> - Live demo URL: `<<PASTE DEPLOYED URL>>`

Everything else on the checklist is done: `npm test` green, `npm run report` shows the
intended gradient, the production build passes, favicon added, empty-board state added,
`/studio` degrades gracefully without env vars, and the full loop was re-verified against a
production server build.

---

## Capturing the demo (30 seconds that sell it)

With `npm run dev` and a browser that has WebGL and network (for map tiles):

1. Click the **black Honda key** marker → panel → **Find its match**.
2. Watch the two dots pull to the midpoint and burst.
3. Screenshot the dialog: 79%, four breakdown bars, the reasons list.
4. **Yes — reunite them** → the header counter becomes **Reunions 1**.
5. Open `/reunions` → the published card with its fact-built story.
6. In Studio: the documents list, the confirmed `match`, a Vision GROQ query, the Kanban board.

Without WebGL the board intentionally degrades to a dotted **board view** with mathematically
projected markers (`.ln-board-grid` + `makeFallbackProjector`) — that is a feature for old
devices, not a bug, but do not record the demo on it.

Handy: `curl -X POST localhost:3000/api/demo/reset` restores the seeded board between takes
(local provider only; it refuses when a real backend is configured).

---

## Stack

Next.js 16.3 (App Router, Turbopack) · TypeScript strict · Tailwind v4 · MapLibre GL 5 ·
Motion · lucide-react · Sanity 6 + `next-sanity` 13 + `@sanity/vision` +
`sanity-plugin-workflow` · vitest · tsx. No component library — hand-rolled Tailwind sharing
one `.ln-glass` style. No Google Fonts (system stack), so the build has no network
dependency.
