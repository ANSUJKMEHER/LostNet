import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * POST /api/reunions/[id]/custody
 *
 * Safe Harbor custody transition:
 *   deposited -> verified -> released
 *
 * Body: { custodyState: "deposited" | "verified" | "released" }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { custodyState?: "deposited" | "verified" | "released" };
    if (!body.custodyState || !["deposited", "verified", "released"].includes(body.custodyState)) {
      return NextResponse.json({ error: "Invalid custodyState" }, { status: 400 });
    }

    const provider = getProvider();
    if (!provider.updateCustodyState) {
      return NextResponse.json({ error: "Provider does not support custody transitions" }, { status: 501 });
    }

    const updated = await provider.updateCustodyState(id, body.custodyState);
    return NextResponse.json({ reunion: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Custody update failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
