import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";
import type { HandoverMode, HandoverPlan } from "@/lib/types";

/**
 * POST /api/matches/[id] — the ONLY path that transitions a match.
 *
 * Enforcement lives here, not in the Studio workflow board (the workflow plugin
 * tracks states; this route is the law). Accepted transitions:
 *   proposed | pendingReview  ->  confirmed | rejected
 * Confirming marks both items "matched" and creates a published reunion that
 * carries the handover plan and a one-time claim token.
 *
 * Body: { decision, handover?: { mode, label?, point?, time? } }
 */
const MODES: HandoverMode[] = ["public", "map", "finder"];

function normaliseHandover(raw: unknown): HandoverPlan | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Partial<HandoverPlan>;
  const mode = MODES.includes(input.mode as HandoverMode) ? (input.mode as HandoverMode) : "finder";
  const label = typeof input.label === "string" ? input.label.trim().slice(0, 120) : undefined;
  const time = typeof input.time === "string" ? input.time.trim().slice(0, 60) : undefined;
  const p = input.point;
  const point =
    p && typeof p.lat === "number" && typeof p.lng === "number" && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
      ? { lat: p.lat, lng: p.lng }
      : null;
  return { mode, ...(label ? { label } : {}), ...(point ? { point } : {}), ...(time ? { time } : {}) };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { decision?: string; handover?: unknown };
    if (body.decision !== "confirmed" && body.decision !== "rejected") {
      return NextResponse.json({ error: "decision must be 'confirmed' or 'rejected'" }, { status: 400 });
    }
    const provider = getProvider();
    const result = await provider.decideMatch(id, body.decision, normaliseHandover(body.handover));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("transition denied") ? 409 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
