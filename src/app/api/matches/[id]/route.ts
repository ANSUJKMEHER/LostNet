import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * POST /api/matches/[id] — the ONLY path that transitions a match.
 *
 * Enforcement lives here, not in the Studio workflow UI (the workflow
 * plugin tracks states; this route is the law). Accepted transitions:
 *   proposed | pendingReview  ->  confirmed | rejected
 * Confirming marks both items "matched" and creates a reunion draft.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { decision?: string; safeHarbor?: string; timeWindow?: string };
    if (body.decision !== "confirmed" && body.decision !== "rejected") {
      return NextResponse.json({ error: "decision must be 'confirmed' or 'rejected'" }, { status: 400 });
    }
    const provider = getProvider();
    const result = await provider.decideMatch(id, body.decision, {
      safeHarbor: body.safeHarbor,
      timeWindow: body.timeWindow,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("transition denied") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
