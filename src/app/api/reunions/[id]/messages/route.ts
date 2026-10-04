import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const provider = getProvider();
    const messages = provider.getChatMessages ? await provider.getChatMessages(id) : [];
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { text?: unknown; sender?: unknown };
    if (typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }
    const sender = body.sender === "owner" ? "owner" : "finder";
    const provider = getProvider();
    if (!provider.addChatMessage) {
      return NextResponse.json({ error: "Chat not supported by data provider" }, { status: 500 });
    }
    const messages = await provider.addChatMessage(id, { text: body.text.trim(), sender });
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
