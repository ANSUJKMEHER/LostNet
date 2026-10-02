import { getProvider } from "@/lib/data";
import { SEED_CENTER } from "@/lib/seed";
import BoardClient from "@/components/board-client";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const provider = getProvider();
  const items = await provider.listItems();
  const reunions = await provider.listReunions();

  return (
    <main>
      <BoardClient
        items={items}
        center={SEED_CENTER}
        reunionCount={reunions.filter((r) => r.status === "published").length}
      />
    </main>
  );
}
