# LostNet — Phases & Progress

> **Deadline:** DEV × Sanity Challenge — submissions close **Oct 4, 2026 11:59 PM PDT** = **Oct 5, 12:29 PM IST**.
> **Time left: ~4 days.** Treat the last 12 hours as buffer, not build time.
> Status legend: ✅ done · 🔵 in progress · ⬜ not started · ⛔ blocked
> **Last updated:** Thu Oct 1, ~11:55 IST — gaps #1–#3 fixed, four further bugs fixed, Phase 6a/6c/6d + Phase 7 draft done. **Only the Sanity project credentials remain.**

---

## Status snapshot (Oct 1, 2026, after the completion pass)

| Item | State |
|---|---|
| Matcher unit tests | ✅ **8/8 green** (`npm test`) |
| Full test suite | ✅ **20/20 green** — 8 matcher + 6 provider lifecycle + 6 narration/guard |
| Demo score gradient | ✅ verified (`npm run report`) — 79% / 69% / 65% matches, 3 near-misses/contradictions correctly rejected |
| Production build | ✅ passes (Next 16 Turbopack + Workflow plugin; needs ~3 GB free memory — see Gaps) |
| Demo loop | ✅ re-verified against a **production server build** (API + server-rendered HTML), not just dev |
| Sanity schema + Studio + seed script + Workflows Kanban | ✅ complete (Phase 5 + 6a) |
| **Sanity project wired live** | ⛔ **BLOCKED — needs `NEXT_PUBLIC_SANITY_PROJECT_ID` + `SANITY_API_TOKEN` from the user** |
| Gaps #1–#3 | ✅ all fixed, each with a regression test |
| AI narration + fact guard (6c) | ✅ done — optional, degrades to the fact-built sentence with no key |
| Polish (6d) | ✅ favicon, empty-board state, demo reset helper · ⬜ demo capture (needs WebGL + tiles) |
| App SDK desk (6b) | ⬜ not started — needs an authenticated Sanity account |
| DEV post (Phase 7) | 🔵 **drafted** in `SUBMISSION.md`; needs the project id / dataset URL + demo URL pasted in |

### 🚨 Critical path — a Sanity project (~5 minutes, unblocks everything)

The challenge **requires a Sanity project ID or a public dataset URL**; without it the entry is *incomplete*. So this is not optional, and it is the only thing blocking Phases 5–6:

1. Sign in at **sanity.io/manage** → **Create project** → name `LostNet`, dataset `production` (free plan is fine).
2. Copy the **Project ID** from the project overview.
3. Project → **API** → **Tokens** → **Add API token** → name `lostnet-seed`, role **Editor** → copy the token (**shown once**).
4. Project → **API** → **CORS origins** → add `http://localhost:3000` **with credentials allowed** (add the Vercel domain later). *Skipping this makes Studio/API calls fail in the browser with opaque CORS errors.*
5. Create `personal/lostnet/.env`:
   ```
   DATA_PROVIDER=sanity
   NEXT_PUBLIC_SANITY_PROJECT_ID=<project id>
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=<editor token>
   ```
6. `npm run seed:sanity`, restart `npm run dev`, open `/studio`.

### Sprint plan for the closing window

| Day (IST) | Target | Deliverable |
|---|---|---|
| **Thu Oct 1** (today) | Phase 5 activation + gaps | `.env` filled, seed run, demo loop verified against Content Lake; **story gap + duplicate-match gap fixed**; Workflows Kanban (6a) |
| **Fri Oct 2** | App SDK desk (6b) | “Reunion Desk” live in the Sanity Dashboard; judge login created |
| **Sat Oct 3** | AI narration (6c) + polish (6d) | Narration route with fact-only guard; empty states; favicon; **screen recording + GIF + Studio screenshots captured** |
| **Sun Oct 4** | Writeup + submit (Phase 7) | DEV post published with `#sanitychallenge`, project ID / public dataset URL, honest failures — **submit Sunday evening IST** |
| **Mon Oct 5** | Buffer only | Deadline 12:29 PM IST — only for verifying the published post and demo URL work logged out |

> If credentials never arrive, Path Two cannot be submitted properly. Escalate early rather than burning Oct 2–4 on unsubmittable work — and spend that time instead on the writeup + demo recording, which are reusable.

> **Update (Oct 1, ~11:55 IST):** the Thu Oct 1 target is done except for the part that needs
> credentials — gaps fixed, tests at 20/20, Workflows Kanban wired, narration + guard shipped,
> polish done, and the DEV post drafted in `SUBMISSION.md`. **Thu Oct 2 should now be: create the
> Sanity project, seed it, verify the Sanity path end to end, and capture the demo.** If credentials
> still have not arrived by end of Thu Oct 2, skip straight to the demo recording + submission
> prep on the local provider and say so plainly in the post.

---

## ✅ Phase 0 — Foundation & scaffold
- **Done:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `globals.css`, `layout.tsx`, `.gitignore`, `.env.example`, `context.md`, `phases.md`.
- **Verify:** `npm run dev` boots; `/` renders; `npm run build` passes.

## ✅ Phase 1 — Matching engine (pure, tested)
- **Done:** `src/lib/types.ts`, `utils.ts`, `categories.ts`, `matcher.ts`, `matcher.test.ts` (**8 tests**: clean pair, same-kind exclusion, cross-category exclusion, far/stale exclusion, weight-sum invariant, confidence rounding, **2 near-miss guards**).
- **Score model:** `0.30*category + 0.30*geo + 0.20*time + 0.20*description`, threshold **0.60**, radius **2 km**, time window **60 h**, category floor **0.80**, plus a **−0.25 colour-contradiction penalty** (both items declare colours and none overlap).
- **Verify:** `npm test` → 8 passed. `npm run report` → prints the full demo gradient.

## ✅ Phase 2 — Data layer + seed dataset
- **Done:** `src/lib/data/{provider,local,sanity,index}.ts` (one `LostNetData` interface, two providers), `src/lib/seed.ts` (**20 items: 10 lost / 10 found**, Indiranagar Bengaluru, fixed ISO timestamps for deterministic scores).
- **Designed gradient (verified):**
  - `lost-01 × found-01` **79%** — the clean demo pair (Honda key ↔ black car key, 153 m, shared black/red/metal)
  - `lost-03 × found-03` **69%** — ambiguous (earbuds, 337 m)
  - `lost-02 × found-02` **65%** — ambiguous (grey bags, 956 m)
  - `lost-09 × found-09`, `lost-04 × found-04`, `lost-01 × found-09` — **correctly NO MATCH** (near-misses + colour contradiction)
- **Verify:** `npm run report`.

## ✅ Phase 3 — Board UI (map + markers + report form)
- **Done:** `board-map.tsx` (MapLibre + markers + magnetize overlay + board-view fallback), `board-client.tsx` (state machine), `item-panel.tsx`, `report-dialog.tsx`, `app/page.tsx`, API routes.
- **Fixes that mattered (do not regress):**
  1. MapLibre CSS forces `position:relative` on its container → **never give the map container Tailwind `absolute`**; position an outer wrapper and pass an inner `h-full w-full` div to MapLibre.
  2. Marker pulse rings must keep `pointer-events-none` or they steal clicks from neighbours.
  3. Marker centring offset is **baked into the animated x/y values** (`pos.x - 14`), never a `translate(-50%)` style — Motion and inline transforms fight otherwise.
  4. Items are spread over the neighbourhood so only designed pairs sit close; keep it that way or markers overlap and block clicks.
  5. `map.fitBounds()` on load (or the bounds-scaled fallback projector) so all markers are visible.
- **Verify:** `npm run dev` → markers pulse, click selects, report form posts, pin mode works.

## ✅ Phase 4 — Magnetize flow + confirm/reject (signature moment)
- **Done:** `match-dialog.tsx`, flow phases in `board-client.tsx` (`pulling` → `merged`), overlay animation in `board-map.tsx`, `reunions/page.tsx`, `/api/matches/[id]` with **server-enforced transitions**.
- **Verified in Playwright:** click Honda key → “Find its match” → two dots pull to a midpoint and merge → dialog (79%, four breakdown bars, reasons) → “Yes — reunite them” → header counter becomes “Reunions 1” → `/reunions` shows a published card with the fact-built story.
- **Verify:** repeat that click path; or API-level: `POST /api/matches/propose {"itemId":"lost-01"}` then `POST /api/matches/<id> {"decision":"confirmed"}`.

## ✅ Phase 5 (code) — Sanity integration
- **Done:** `src/sanity/schema.ts` (`lostFoundItem`, `match`, `reunion`, `category`, `settings`), `sanity.config.ts` (embedded Studio), `src/app/studio/[[...tool]]/page.tsx` (graceful “Studio not configured” without env), `scripts/seed-sanity.ts` (`npm run seed:sanity`), dep upgrades (**Next 15 → 16.3**, `sanity` 6, `next-sanity` 13, `@sanity/vision`, `tsx`).
- **Verify (no creds needed):** `npm run build` succeeds and `/studio` renders the not-configured note.

---

## ⛔ STEP 1 (code done — activation still blocked): the real backend

> **The code half of this step is finished.** Gaps #1 and #2 are fixed and covered by tests,
> and the Sanity provider is typechecked and mirrors the tested local provider. What remains
> is account work only — it needs a project id and `SANITY_API_TOKEN`.
>
> Credentials: follow the **Critical path** block above. Once `.env` is filled in:

1. `npm run seed:sanity` → creates `settings`, 12 `category` docs, 20 `lostFoundItem` docs (deterministic `_id`s, re-runnable).
2. ✅ **Story gap fixed** — `SanityProvider.decideMatch` now writes a **published** reunion with the shared fact-built story (`src/lib/reunion.ts`), identical to the local provider. It previously wrote `title: "A reunion"`, `story: ""`, `status: "draft"`, which would have left `/reunions` empty on the real backend.
3. ✅ **Duplicate-match gap fixed** — both providers now reuse an existing undecided match for a pair instead of inserting a second one, and still return it at the candidate's index (the UI reads `matches[0]`).
4. `npm run dev` → board must render from GROQ; open `/studio`, confirm the documents look right, and run a GROQ query in **Vision**.
5. Re-run the demo loop **against Sanity**: propose → confirm. In Studio you should see a `match` with `status: confirmed` and a `reunion`.
6. Make it judge-readable: keep the `production` dataset **public** so you can paste a public dataset URL in the submission (alongside the project ID).
7. Capture evidence: screenshot the Studio (documents list, the confirmed match, a Vision query, the reunion) — these go in the DEV post.

**Gate to move on:** the full loop runs against Sanity and is visible in Studio.

---

## 🔵 Phase 6 — Reunion Desk (App SDK) + Workflows + AI narration + polish

**Status: 6a ✅ · 6b ⬜ blocked (needs an authenticated Sanity account) · 6c ✅ · 6d 🔵 mostly done.**

### ✅ 6a. Workflows (Studio Kanban) — done

`npm i sanity-plugin-workflow` done; wired in `sanity.config.ts` scoped to `match` with the four states.

- Note: the plugin's colour enum is `primary | success | warning | danger` — the original plan's `"critical"` would not typecheck, so `rejected` uses `danger`.
- **Critical, and commented in `sanity.config.ts`:** the plugin tracks state in a metadata document and is **Studio-only — it enforces nothing**. `/api/matches/[id]` stays the single source of truth. Dragging a card must never be what reunites two items.
- **Verify (credential-gated):** drag a match across the board in Studio; then `POST /api/matches/<decided-id>` and confirm **409**. The 409 half is already verified locally.

### ⬜ 6b. App SDK “Reunion Desk” — **not built; blocked**

Needs an authenticated Sanity account (`npx sanity@latest app create`), so it could not be scaffolded here. Plan unchanged:
1. Scaffold the app: `npx sanity@latest app create lostnet-desk` (adds `sanity.cli.ts` + `App.tsx` in its own folder).
2. Build the desk with the SDK hooks (`@sanity/sdk-react`): `useDocuments` for `match` where `status == "pendingReview"`, `useDocument` per item, `useEditDocument` for the decision. Auth is automatic in the Dashboard.
   - Left: pending match cards (pair + confidence + reasons).
   - Right: a “confirm / reject” action that calls the **same** `/api/matches/[id]` route (never a second write path).
   - Nice-to-have if time: drag one item card onto a partner to force-propose a pair.
3. Deploy: `npx sanity deploy`, then add the returned `appId` to `deployment: { appId }` in `sanity.config.ts`.
4. **Judges need access:** add a viewer account (e.g. `sanity.judges@…`) or rely on the public dataset link. Research note: the strongest Path Two entries shipped a judge login — do this.
5. **Verify:** open the app from the Sanity Dashboard, confirm a pending match, watch the public board update (live hooks, no refresh).

### ✅ 6c. AI narration — done (`src/app/api/narrate/route.ts`, `src/lib/narration.ts`)

1. Provide `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY` in `.env` (both optional — see `.env.example`). `NARRATE_MODEL` overrides the model.
2. `POST /api/narrate { matchId, mode?: "match" | "story" }` returns `{ text, source: "ai" | "fallback", model?, facts }`. Returning `facts` is deliberate: a reviewer can diff the sentence against the payload it was allowed to use.
3. **Guardrail is code, not just prompt text.** `passesFactGuard()` rejects empty / multi-paragraph / over-long output and any sentence containing a numeral absent from the facts payload. The prompt additionally forbids invented facts and forbids claiming ownership.
4. `POST /api/reunions/[id] { story }` is the human curation step: narrate → edit → publish.
5. The model is **never** called from `matcher.ts` or a provider's decision path.
6. **Verified:** with no key configured the route returns `source: "fallback"` and the fact-built sentence; the guard is covered by 6 unit tests. Verifying real model output needs a key.

### 🔵 6d. Polish — mostly done

- ✅ Empty-board state (“nothing reported yet”) on `/`.
- ✅ No-match toast copy.
- ✅ `lost-01` demo reset helper — `POST /api/demo/reset` (local provider only; 403 otherwise).
- ✅ Favicon (`src/app/icon.svg`).
- ⬜ **Still to capture:** 30–60 s screen recording of the magnetize moment + GIF, and Studio screenshots (documents, Vision query, workflow board). This needs a machine with WebGL **and** network for map tiles, plus a live Sanity project.

---

## 🔵 Phase 7 — Writeup + submission (~3–4 h, do NOT leave to the last hour)

**Drafted:** the full post is written in **`SUBMISSION.md`** — pitch, schema rationale, engine
weights, the two Sanity-native moves, a long honest-failures section (including the bugs found
while finishing this pass), what Workflows/App SDK do, and the demo-capture recipe. Three
placeholders remain: **project ID**, **public dataset URL**, **live demo URL**.

1. **Post on DEV** using the **Path Two submission template**, tagged **`#sanitychallenge`**.
2. **Must include:** Sanity project ID **or** a public dataset URL (otherwise “incomplete”), a live demo URL, and testing notes.
3. **Writeup shape (judges score honesty + schema + creativity):**
   - The 5-second pitch: “lost and found items physically pull toward each other and magnetize into a match.”
   - The schema: `lostFoundItem` → `match` (with breakdown + reasons) → `reunion`; why matches are *documents*, not UI state.
   - The engine: deterministic scoring with the exact weights; why the LLM is banned from deciding.
   - The two Sanity-native moves: Content Lake as the board's memory; the API route (not the UI) as the only transition authority.
   - **Honest failures section** (this is graded): the MapLibre `position:relative` trap, marker click interception, the seed-density problem, the threshold rebalance (0.55 → 0.60) and why tests guard it.
   - What the App SDK desk and Workflows do, and the explicit note that workflow enforcement lives server-side.
4. **Optional but encouraged:** upload the agent session transcript (Claude Code / Codex / etc.), curate it, **scrub keys**, and hit **Make Public** (unlisted uploads can't be opened by judges).
5. Submit, then verify the post renders and the demo URL works **while logged out** (a login wall has cost submissions before).

---

## Gaps / known issues

### ✅ Fixed in this pass (each has a regression test where testable)

1. ✅ **Sanity reunion story gap** — the providers had diverged; both now call `buildReunionContent()`. `local.test.ts`.
2. ✅ **Duplicate matches** — undecided pairs are reused, not re-inserted. `local.test.ts`.
3. ✅ **No favicon** — `src/app/icon.svg`.
4. ✅ **Seed data was mutated by the app** — `LocalProvider` held references to `SEED_ITEMS`, so confirming a match poisoned the seed and reset was impossible. Now deep-copied. `local.test.ts`.
5. ✅ **In-memory provider forked per server bundle** — the API and the server-rendered pages each had their own board, so `/reunions` stayed empty in a production build. Anchored to `globalThis`.
6. ✅ **`matcher.ts` documented the wrong weights** — comment now matches `DEFAULT_SETTINGS.weights`.

### Still open

1. **Build memory** — Next 16 + Turbopack + Studio deps needs ~3 GB free; in a constrained container it can be `Killed` mid-build. Re-run, or `NODE_OPTIONS=--max-old-space-size=3072 npx next build` (verified at 3072 MB).
2. **App SDK desk (6b) not built** — needs an authenticated Sanity account.
3. **Sanity path is typechecked but never executed** — it mirrors the tested local provider, but verify before demoing.
4. **LocalProvider is in-memory** — state resets on server restart (fine for demo; Sanity is the real persistence). `POST /api/demo/reset` restores the seeded board on demand.
5. **Map tiles need network.** Without WebGL (headless/old devices) the app intentionally degrades to the **board view**: dotted grid + markers projected by pure math. Not a bug — but if a demo machine shows the grid instead of streets, that's why. Do not record the demo on it.
6. **Demo capture still pending** — needs WebGL + tiles + a live project.

## Active decisions to preserve (do not silently revert)
1. The LLM never decides matches — narration only.
2. Confirming publishes the reunion immediately with a fact-built story; no blocking “story pending” step in the demo loop.
3. Backend swap is env-only (`DATA_PROVIDER`); never fork behaviour by provider.
4. Keep the 8 matcher tests green after any change to `matcher.ts`, `types.ts` (settings) or `seed.ts`; re-run `npm run report` to confirm the gradient.
5. Magnetize = DOM overlay dots driven by projection math, not map GL layers.
6. `/api/matches/[id]` is the only transition authority; Workflows/Studio only visualise.

---

## ✅ Submission checklist (tick before hitting publish)

Done in this pass:

- [x] **Honest-failures section written** — in `SUBMISSION.md`, and it now includes the MapLibre trap, click interception, seed density, the threshold rebalance **and** the bugs found while finishing (seed mutation, bundle-split singleton, provider divergence, stale doc comment).
- [x] `npm test` green (**20/20**) and `npm run report` shows the intended gradient — output pasted in the post.
- [x] Writeup drafted end to end (`SUBMISSION.md`).
- [x] Favicon, empty-board state, demo-reset helper, AI narration + fact guard, Workflows Kanban.

Still to do (all credential- or machine-gated):

- [ ] Live demo URL works **logged out** (no SSO wall, no localhost link)
- [ ] **Sanity project ID** pasted into the post (and/or a **public dataset URL** that returns data unauthenticated) — *the one hard requirement left*
- [ ] `DATA_PROVIDER=sanity` actually set in the deployed environment (not just locally)
- [ ] Demo GIF/recording of the magnetize moment embedded (this is the 30-second wow) — needs WebGL + tiles
- [ ] Studio screenshots: documents, a confirmed `match`, a Vision GROQ query, the reunion, the workflow board
- [ ] Post tagged **`#sanitychallenge`** and built from the **Path Two** submission template
- [ ] App SDK desk reachable by a judge (viewer account created, **or** the post clearly explains it was not built)
- [ ] Transcript uploaded → curated → **Make Public** → keys/sensitive data scrubbed (`grep -i "sk-\|token\|secret"`)
- [ ] Submitted with hours to spare — deadline is **Oct 5, 12:29 PM IST**
