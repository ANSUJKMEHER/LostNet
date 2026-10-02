import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * GET /api/reunions — returns all reunions enriched with match and item data
 * for display and Safe Harbor custody desk verification.
 */
export async function GET() {
  try {
    const provider = getProvider();
    const reunions = await provider.listReunions();
    const matches = await provider.listMatches();
    const items = await provider.listItems();

    const itemMap = new Map(items.map((i) => [i._id, i]));
    const matchMap = new Map(matches.map((m) => [m._id, m]));

    const enriched = reunions.map((r) => {
      const match = matchMap.get(r.matchId) ?? null;
      const a = match ? itemMap.get(match.itemAId) ?? null : null;
      const b = match ? itemMap.get(match.itemBId) ?? null : null;
      return {
        ...r,
        match,
        itemA: a,
        itemB: b,
      };
    });

    return NextResponse.json({ reunions: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch reunions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
