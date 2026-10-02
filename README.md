# LostNet — The Living Map Where Lost Things Find Their Way Home

[![DEV × Sanity Challenge 2026](https://img.shields.io/badge/DEV%20%C3%97%20Sanity-Challenge%202026-F03E2F?style=for-the-badge&logo=sanity&logoColor=white)](https://dev.to)
[![Next.js 15+](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Sanity Content Lake](https://img.shields.io/badge/Sanity-Content%20Lake-F03E2F?style=for-the-badge&logo=sanity&logoColor=white)](https://www.sanity.io)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

> *"The tragedy of lost things isn't that they are gone; it's that they are almost always within 500 meters of someone who wants to give them back. What's missing is not human kindness, but a protocol of trust."*
> — **The LostNet Paradox**

### 💎 The Three LostNet Axioms
1. **“LostNet doesn't move the item — it moves the trust.”** (Physical items stay hyper-local; cryptographic coordination moves the custody).
2. **“We didn't invent the lost-property desk. We gave it an API.”** (Stations already have statutory custody duty; we replace paper ledgers with instant digital scan terminals).
3. **“The barista doesn't guard anything. The bin does — and the board keeps watch.”** (Zero partner liability; camera-monitored bins with timestamped deposit condition snapshots).

---

## 🌟 Overview

**LostNet** is a self-healing municipal operating system and interactive living map where lost items don't sit silently in dusty ledgers or scam-ridden forums. Instead, items have **gravitational mass and pull toward each other across space and time**.

Built for the **DEV × Sanity Challenge 2026** (*Path Two: "Vibe-Code Something Strange"*), LostNet replaces broken, adversarial lost-and-found systems with **autonomous Bayesian resonance**, **blind split-knowledge challenge gates**, **dual-tier safe harbor liability armor**, and **airline-grade digital return passes**.

---

## 🚀 Key Innovations

### 1. 🌌 Autonomous Gravitational Resonance (Not Dumb Matching)
- **Physics on Canvas**: Reports don't wait passively for someone to search. When a match clears similarity thresholds, the two items **animate across the map, collide at their midpoint, and burst into a rose marker** with real-time Web Audio synthesized sonification.
- **Calibrated Bayesian Log-Odds (LLR)**: Combines geospatial Haversine distance, temporal decay, taxonomic resonance, and **Inverse Document Frequency (IDF)** token rarity weighting. Contradictions (e.g., color/material mismatches) are heavily penalized.
- **The Margin Rule ($\Delta S = S_1 - S_2$)**: Eliminates the *"50 black keys"* problem. If multiple items are nearly identical, the system detects cluster ambiguity instead of auto-proposing false positives.

### 2. 🛡️ Safe Harbor Handover Protocol & Liability Armor (Active vs. Passive)
Solves the fundamental failure mode of lost-and-found projects: **The Attendant Liability Paradox**. We divide physical safe harbors into two clean legal classes:
- **🏛️ Active Statutory Desks (Metro & Police Stations)**:
  - Institutions with an existing statutory lost-property duty. We create zero new liability — we simply provide an API to replace paper registers with token lookups.
  - *Indiranagar Metro Gate 2 Customer Desk* & *Police Assistance Kiosk*.
- **☕ Passive Monitored Bins (Cafés & Stores)**:
  - Baristas and counter staff never touch items or accept custody. A camera-covered, labeled bin holds the object.
  - The finder snaps a **deposit condition snapshot**; the board keeps watch. Attendants are shielded with an "as-deposited" receipt alibi.

### 3. 🔐 Blind Split-Knowledge Challenge Gate (Say Zero-Knowledge & Mean It)
- **Zero Plaintext Leakage**: The terminal attendant **never sees the secret answer beforehand**.
- **The Protocol**: Attendant asks the claimant an open verbal challenge (*"What private engraving or identifying feature is on your item?"*), types the spoken answer into the terminal, and the system verifies the input against the cryptographic record.
- **2-Strike Fraud Lockout**: If two incorrect answers are entered, the terminal locks down automatically, freezing handover and impounding the item for station officer ID escalation.

### 4. 🎟️ The Airline Digital Return Pass
- Once a match is confirmed, an airline-style **Digital Return Pass** is generated:
  - Scannable QR code & cryptographically hashed Handover Token (`#LN-XXXX`).
  - Drop-off location, verified proof summary, and custody stage tracker.
  - Zero app install required: works directly in any mobile browser.

### 5. 🏢 Safe Harbor Custody Desk Portal (Terminal #04)
- A dedicated **Custody Attendant Terminal** for station officers:
  - Live token lookups (`#LN-8492`) with scannable QR integration.
  - Blind split-knowledge challenge verification with anti-fraud attempt metering.
  - 3-point officer checklist (*QR Scanned*, *Challenge Passed*, *Condition Inspected*).
  - One-click digital sign-off and permanent custody release certificate recorded directly into Sanity Content Lake.

---

## 🏗️ Architecture & Sanity Content Lake

```
                     ┌──────────────────────────────────────────────┐
                     │          SANITY CONTENT LAKE (GROQ)          │
                     │  - lostFoundItem                             │
                     │  - match (references itemA, itemB)           │
                     │  - reunion (references match)                │
                     │  - category (12-taxonomy aliases)            │
                     │  - settings (dynamic scoring weights)        │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     │           REAL-TIME GROQ LISTENERS           │
                     │   `client.listen('*[_type in [...]]')`       │
                     └──────────────────────┬───────────────────────┘
                                            │
             ┌──────────────────────────────┼──────────────────────────────┐
             ▼                              ▼                              ▼
    ┌─────────────────┐            ┌──────────────────┐           ┌─────────────────┐
    │  LIVING CANVAS  │            │ RETURN PASS &    │           │  CUSTODY DESK   │
    │  MapLibre GL    │            │ REUNION STORIES  │           │  Safe Harbor    │
    │  Physics Motion │            │ 4-Stage Stepper  │           │  Verification   │
    └─────────────────┘            └──────────────────┘           └─────────────────┘
```

- **Matches are Documents, Not UI State**: Claims have identity, audit trails, and status transitions (`proposed → pendingReview → confirmed | rejected`).
- **Live Reactive Updates**: Open two browser tabs or Sanity Studio; any state transition instantly vibrates across all connected clients via Sanity's real-time listener API.
- **Dual Data Provider Pattern**: Clean dependency inversion between `SanityProvider` (GROQ + mutations) and `LocalProvider` (in-memory zero-config demo mode).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19)
- **CMS / Database**: [Sanity Content Lake](https://www.sanity.io) + Sanity Studio v3 (`/studio`)
- **Interactive Mapping**: [MapLibre GL](https://maplibre.org) with Carto dark/light vector basemaps
- **Motion & Physics**: [Motion](https://motion.dev) (formerly Framer Motion)
- **Audio Sonification**: Native Web Audio API synthesizer (harmonic hums, snap, and reunion chimes)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + Lucide Icons + KokonutUI glassmorphism
- **Testing**: [Vitest](https://vitest.dev) (20 pure unit & integration test cases)

---

## 🏁 Quickstart & Setup

### Prerequisites
- Node.js `v20+` or `v22+`
- (Optional) Free Sanity project credentials from [sanity.io/manage](https://www.sanity.io/manage)

### 1. Clone & Install
```bash
git clone https://github.com/ANSUJKMEHER/LostNet.git
cd LostNet
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To run with Sanity Content Lake:
```env
DATA_PROVIDER=sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token
```
*(Or set `DATA_PROVIDER=local` for instant in-memory mode with zero configuration).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests & Quality Gates

```bash
# Run unit & integration test suite (20 tests)
npm test

# Run strict TypeScript typechecking
npm run typecheck

# Verify matcher precision & scoring report
npm run report
```

---

## 🎯 How to Demo for Judges (60-Second Walkthrough)

1. **The Vision**: Click **"✦ Manifesto"** in the top navbar to see the *LostNet Paradox*.
2. **The Physics**: Click **"Auto Demo"** — watch the lost Honda key gravitationally pull toward the found car key 150 meters away with sound synthesis and 79% resonance.
3. **Safe Harbor Protocol**: Select a neutral drop-off desk (*Indiranagar Metro Gate 2*) and confirm.
4. **The Boarding Pass**: Jump to `/reunions` and open the **Digital Return Pass** with the scannable `#LN-XXXX` QR token.
5. **The Custody Desk**: Click **"Custody Desk"** in the navbar, enter the token, verbally quiz the claimant through the Blind Split-Knowledge Challenge Gate, test the 2-strike lockout guard, and digitally sign the physical custody release certificate!

---

## 📄 License

MIT License. Built with ❤️ for the DEV × Sanity Challenge 2026.
