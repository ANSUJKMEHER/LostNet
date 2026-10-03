import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * POST /api/reunions/[id]/verify — check a spoken answer against the stored hash.
 *
 * The answer is compared on the server. The browser never receives the salt,
 * the hash, or the expected answer — only whether the answer matched and how
 * many attempts remain. Two failures lock the handover so the desk must
 * escalate instead of guessing.
 *
 * Body: { answer: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { answer?: unknown };
    if (typeof body.answer !== "string" || !body.answer.trim()) {
      return NextResponse.json({ error: "answer is required" }, { status: 400 });
    }
    const provider = getProvider();
    const result = await provider.verifyClaim(id, body.answer);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
