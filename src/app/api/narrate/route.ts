import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";
import {
  STORY_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  buildFacts,
  fallbackText,
  passesFactGuard,
  type Facts,
  type NarrationMode,
} from "@/lib/narration";

/**
 * POST /api/narrate — the ONLY place a language model is allowed to speak.
 *
 * Hard rules (see context.md "Active decisions to preserve"):
 *   1. The model NEVER decides matches. It only describes a pair the
 *      deterministic engine already scored, or rewrites a reunion story.
 *   2. It is never called from matcher.ts or a provider's decision path.
 *      This route is read-only with respect to match state.
 *   3. Only structured fields already stored are sent — titles, place labels,
 *      timestamps, distance, shared attributes, reasons, confidence.
 *   4. `passesFactGuard` (src/lib/narration.ts) rejects any sentence that
 *      introduces a numeral the payload does not contain. On any failure —
 *      including no API key — the route returns the fact-built sentence, so
 *      narration is never a hard dependency of the demo loop.
 *
 * Body: { matchId: string, mode?: "match" | "story" }
 * Response: { text, source: "ai" | "fallback", model?, facts }
 */

async function generateWithOpenAI(system: string, facts: Facts): Promise<{ text: string; model: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.NARRATE_MODEL ?? "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(facts) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  return text ? { text, model } : null;
}

async function generateWithAnthropic(system: string, facts: Facts): Promise<{ text: string; model: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.NARRATE_MODEL ?? "claude-3-5-haiku-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text;
  return text ? { text, model } : null;
}

export async function POST(req: Request) {
  let matchId = "";
  let mode: NarrationMode = "match";
  try {
    const body = (await req.json()) as { matchId?: string; mode?: string };
    matchId = body.matchId ?? "";
    if (body.mode === "story") mode = "story";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const match = await provider.getMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: `Match ${matchId} not found` }, { status: 404 });
    }
    const [a, b] = await provider.getItemsByIds([match.itemAId, match.itemBId]);
    const itemA = a ?? null;
    const itemB = b ?? null;
    const facts = buildFacts(match, mode, itemA, itemB);

    const system = mode === "story" ? STORY_SYSTEM_PROMPT : SYSTEM_PROMPT;
    let generated: { text: string; model: string } | null = null;

    try {
      // OpenAI first, then Anthropic; whichever key is present.
      generated = await generateWithOpenAI(system, facts);
      if (!generated) generated = await generateWithAnthropic(system, facts);
    } catch {
      generated = null; // network/timeout — fall through to the fact-built text
    }

    const clean = generated?.text.trim().replace(/^["'“]|["'”]$/g, "") ?? "";
    if (clean && passesFactGuard(clean, facts)) {
      return NextResponse.json({ text: clean, source: "ai", model: generated?.model, facts });
    }
    return NextResponse.json({
      text: fallbackText(facts, match, itemA, itemB),
      source: "fallback",
      facts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
