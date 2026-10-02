import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { getProvider } from "@/lib/data";
import ReunionCard from "@/components/reunion-card";

export const dynamic = "force-dynamic";

export default async function ReunionsPage() {
  const provider = getProvider();
  const reunions = await provider.listReunions();
  const matches = await provider.listMatches("confirmed");
  const matchIds = matches.map((m) => m._id);
  const itemIds = matches.flatMap((m) => [m.itemAId, m.itemBId]);
  const itemsById = new Map((await provider.getItemsByIds(itemIds)).map((i) => [i._id, i]));
  const itemsByMatch = new Map(matchIds.map((id, i) => [id, matches[i]]));

  const cards = reunions.map((r) => {
    const match = itemsByMatch.get(r.matchId);
    const a = match ? itemsById.get(match.itemAId) : undefined;
    const b = match ? itemsById.get(match.itemBId) : undefined;
    return { reunion: r, a, b };
  });

  return (
    <main className="min-h-dvh bg-zinc-950">
      <div className="mx-auto max-w-3xl lg:max-w-4xl px-4 py-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the board
        </Link>

        <header className="mt-2 sm:mt-6">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-50">Reunions</h1>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Every time two reports find each other and a human confirms the pair, the board writes it down.
            {cards.length === 0 && " Nothing yet — go pull some things together."}
          </p>
        </header>

        <section className="mt-8 space-y-4">
          {cards.map(({ reunion, a, b }) => (
            <ReunionCard key={reunion._id} reunion={reunion} a={a} b={b} />
          ))}
        </section>

        <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
          LostNet — a lost-and-found board where things find their way back.
        </footer>
      </div>
    </main>
  );
}
