import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * POST /api/reunions/lookup — resolve a one-time claim token.
 *
 * The custody desk looks a handover up by the token the claimant presents,
 * rather than downloading every reunion. This is what makes the ownership
 * question token-gated: no token, no question, no lookup.
 *
 * Body: { token: string }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };
    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    const provider = getProvider();
    const reunion = await provider.getReunionByToken(body.token);
    if (!reunion) {
      return NextResponse.json({ error: "No handover matches that token." }, { status: 404 });
    }
    return NextResponse.json({ reunion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
