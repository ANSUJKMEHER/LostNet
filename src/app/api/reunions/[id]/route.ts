import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

/**
 * POST /api/reunions/[id] — publish a reunion story.
 *
 * Reunions are already published at confirm time with a fact-built story, so
 * this route is for the human curation step: take the AI-narrated (or edited)
 * text from /api/narrate, let a volunteer review it, then publish.
 *
 * Note this route only touches reunion text/status — it is NOT a match
 * transition path. Only /api/matches/[id] may change a match's status.
 *
 * Body: { story?: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let story: string | undefined;
    try {
      const body = (await req.json()) as { story?: unknown };
      if (typeof body.story === "string" && body.story.trim()) story = body.story.trim();
    } catch {
      // no body is fine — publish as-is
    }
    const provider = getProvider();
    const reunion = await provider.publishReunion(id, story);
    return NextResponse.json({ reunion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
