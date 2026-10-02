import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/** GET /api/items — the open board, for client refreshes. */
export async function GET() {
  try {
    const provider = getProvider();
    const items = await provider.listItems();
    const reunions = await provider.listReunions();
    return NextResponse.json({
      items,
      publishedReunions: reunions.filter((r) => r.status === "published").length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
