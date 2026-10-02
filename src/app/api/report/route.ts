import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";
import type { NewItemInput } from "@/lib/types";

/** POST /api/report — create a lost/found report and propose matches immediately. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NewItemInput>;
    const { kind, title, description, categoryId, placeLabel, lat, lng, occurredAt } = body;
    if (!kind || !title || !description || !categoryId || !placeLabel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (kind !== "lost" && kind !== "found") {
      return NextResponse.json({ error: "kind must be 'lost' or 'found'" }, { status: 400 });
    }
    if (typeof lat !== "number" || isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "lat must be a number between -90 and 90" }, { status: 400 });
    }
    if (typeof lng !== "number" || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "lng must be a number between -180 and 180" }, { status: 400 });
    }
    if (!occurredAt || isNaN(new Date(occurredAt).getTime())) {
      return NextResponse.json({ error: "occurredAt must be a valid date string" }, { status: 400 });
    }
    const provider = getProvider();
    const result = await provider.createItem(body as NewItemInput);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
