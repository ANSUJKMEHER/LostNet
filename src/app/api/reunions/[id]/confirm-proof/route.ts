import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const provider = getProvider();
    if (!provider.confirmProof) {
      return NextResponse.json({ error: "Proof confirmation not supported by data provider" }, { status: 500 });
    }
    const reunion = await provider.confirmProof(id);
    return NextResponse.json({ ok: true, reunion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
