import { NextResponse } from "next/server";
import { getProvider, resetProvider } from "@/lib/data";

/**
 * POST /api/demo/reset — reset demo board back to open items.
 * Supports both local in-memory provider and Sanity provider.
 */
export async function POST() {
  try {
    const provider = getProvider();
    if (provider.resetDemoData) {
      await provider.resetDemoData();
      return NextResponse.json({ ok: true, message: "Demo board reset to open items & reunions cleared." });
    }
    resetProvider();
    return NextResponse.json({ ok: true, message: "Local board reset to the seeded demo dataset." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
