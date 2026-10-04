"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Search, MapPin, Clock, ShieldCheck } from "lucide-react";
import type { Item } from "@/lib/types";
import { CategoryChip } from "@/components/board-map";
import { timeAgo, cn } from "@/lib/utils";

interface ItemPanelProps {
  item: Item | null;
  onClose: () => void;
  onPropose: (item: Item) => void;
  busy: boolean;
}

export default function ItemPanel({ item, onClose, onPropose, busy }: ItemPanelProps) {
  return (
    <AnimatePresence>
      {item && (
        <motion.aside
          key={item._id}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="ln-glass fixed inset-x-0 bottom-0 z-[4] w-full max-h-[60vh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl shadow-black/50 sm:absolute sm:top-20 sm:right-4 sm:bottom-auto sm:inset-x-auto sm:max-h-none sm:w-[360px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl"
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20 sm:hidden" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 sm:h-8 sm:w-8 sm:p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                item.kind === "lost" ? "bg-indigo-500/15 text-indigo-300" : "bg-amber-500/15 text-amber-300",
              )}
            >
              {item.kind === "lost" ? "Lost" : "Found"}
            </span>
            {item.status === "matched" && (
              <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-rose-300 uppercase">
                Reunited
              </span>
            )}
          </div>

          {item.imageUrl && (
            <div className="mt-3.5 relative h-40 w-full rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
            </div>
          )}

          <h2 className="mt-3.5 text-xl font-bold leading-snug text-zinc-50">{item.title}</h2>
          <CategoryChip categoryId={item.categoryId} className="mt-2" />

          <p className="mt-3 text-sm leading-relaxed text-zinc-300">{item.description}</p>

          {item.secretChallenge && (
            <div className="mt-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Proof Challenge Attached</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-200 italic leading-relaxed">“{item.secretChallenge}”</p>
            </div>
          )}

          {item.handoverNote && (
            <div className="mt-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Current Status / Handover Location</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-200 leading-relaxed">“{item.handoverNote}”</p>
            </div>
          )}

          <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-zinc-600" />
              {item.placeLabel}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-zinc-600" />
              {timeAgo(item.occurredAt)}
            </div>
          </div>

          {item.status === "open" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onPropose(item)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Find its match
            </button>
          ) : (
            <p className="mt-5 flex items-center gap-2 text-sm text-rose-300">
              <Search className="h-4 w-4" /> This item found its way back.
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
