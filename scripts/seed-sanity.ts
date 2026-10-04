/**
 * Seed script: populate a Sanity project with the LostNet demo board.
 *
 * Usage:
 *   SANITY_API_TOKEN=... NEXT_PUBLIC_SANITY_PROJECT_ID=... \
 *   npx tsx scripts/seed-sanity.ts
 *
 * Deterministic _ids => safe to re-run (createOrReplace).
 */
import { createClient } from "@sanity/client";
import { CATEGORIES } from "../src/lib/categories";
import { SEED_ITEMS, SEED_CENTER } from "../src/lib/seed";
import { DEFAULT_SETTINGS } from "../src/lib/types";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token,
});

async function main() {
  // 1. Settings
  await client.createOrReplace({
    _id: "settings",
    _type: "settings",
    geoRadiusKm: DEFAULT_SETTINGS.geoRadiusKm,
    timeWindowHours: DEFAULT_SETTINGS.timeWindowHours,
    scoreThreshold: DEFAULT_SETTINGS.scoreThreshold,
    categoryMin: DEFAULT_SETTINGS.categoryMin,
  });
  console.log(`✓ settings (${JSON.stringify(DEFAULT_SETTINGS)})`);

  // 2. Categories
  for (const cat of CATEGORIES) {
    await client.createOrReplace({
      _id: `category-${cat.id}`,
      _type: "category",
      title: cat.title,
      emoji: cat.emoji,
      aliases: cat.aliases,
    });
  }
  console.log(`✓ ${CATEGORIES.length} categories`);

  // 3. Items (documents need no published/draft distinction for the board —
  //    the public board reads published docs via GROQ)
  for (const item of SEED_ITEMS) {
    const doc = {
      _id: item._id,
      _type: "lostFoundItem",
      kind: item.kind,
      title: item.title,
      description: item.description,
      category: { _type: "reference", _ref: `category-${item.categoryId}` },
      placeLabel: item.placeLabel,
      location: { _type: "geopoint", lat: item.location.lat, lng: item.location.lng },
      occurredAt: item.occurredAt,
      colors: item.colors,
      materials: item.materials,
      status: item.status,
      ...(item.handoverNote ? { handoverNote: item.handoverNote } : {}),
    };
    await client.createOrReplace(doc);
  }
  console.log(`✓ ${SEED_ITEMS.length} items (board center ${SEED_CENTER.lat}, ${SEED_CENTER.lng})`);

  console.log("\nDone. Set DATA_PROVIDER=sanity in .env and restart the app.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
