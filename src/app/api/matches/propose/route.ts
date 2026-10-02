import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/** POST /api/matches/propose — run the engine for an existing open item. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { itemId?: string };
    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    const provider = getProvider();
    const result = await provider.proposeMatches(body.itemId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
