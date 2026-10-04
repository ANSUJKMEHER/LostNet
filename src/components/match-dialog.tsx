"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Heart,
  ThumbsDown,
  Sparkles,
  Info,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import type { HandoverPlan, Item, MatchDimension, MatchRecord } from "@/lib/types";
import { CategoryChip } from "@/components/board-map";
import { cn } from "@/lib/utils";

interface MatchDialogProps {
  open: boolean;
  a: Item | null;
  b: Item | null;
  match: MatchRecord | null;
  busy: boolean;
  onConfirm: (handover: HandoverPlan) => void;
  onReject: () => void;
  onClose: () => void;
}

const DIMENSION_LABELS: Record<MatchDimension, string> = {
  category: "Category",
  geo: "Distance",
  time: "Timing",
  description: "Description",
};

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
        <span>{label}</span>
        <span className="font-bold text-zinc-100">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
        />
      </div>
    </div>
  );
}

export default function MatchDialog({
  open,
  a,
  b,
  match,
  busy,
  onConfirm,
  onReject,
  onClose,
}: MatchDialogProps) {
  const [narration, setNarration] = useState<{ text: string; source: "ai" | "fallback" } | null>(null);
  const [narrating, setNarrating] = useState(false);

  useEffect(() => {
    if (!open) {
      setNarration(null);
      setNarrating(false);
    }
  }, [open]);

  // The finder already told us what they did with the item at report time.
  // We just pass that through as the handover plan.
  const foundItem = a?.kind === "found" ? a : b?.kind === "found" ? b : null;
  const handoverNote = foundItem?.handoverNote || a?.handoverNote || b?.handoverNote;

  const buildPlan = (): HandoverPlan => {
    return {
      mode: "finder",
      label: handoverNote || "Contact the finder",
    };
  };

  const handleNarrate = async () => {
    if (!match) return;
    setNarrating(true);
    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: match._id, mode: "match" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNarration({ text: data.text, source: data.source });
    } catch {
      const evidence =
        match.reasons.length > 0
          ? ` — ${match.reasons.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join(" · ")}`
          : "";
      setNarration({
        text: `The board pulled these two reports together with ${match.confidence}% confidence${evidence}.`,
        source: "fallback",
      });
    } finally {
      setNarrating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && a && b && match && (
        <motion.div
          className="absolute inset-0 z-[6] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="ln-glass flex h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/15">
                  <Heart className="h-5 w-5 text-rose-300" />
                </span>
                <h2 className="text-xl font-bold text-zinc-50">Possible reunion</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 sm:h-8 sm:w-8"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* the pair */}
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
              <div className="rounded-xl bg-white/5 p-3 flex flex-col">
                <p className="text-xs font-bold tracking-wider text-indigo-300 uppercase">{a.kind}</p>
                {a.imageUrl && (
                  <div className="mt-2 h-20 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.imageUrl} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-100">{a.title}</p>
                <CategoryChip categoryId={a.categoryId} className="mt-2" />
              </div>
              <span className="text-2xl text-rose-400 font-bold">♥</span>
              <div className="rounded-xl bg-white/5 p-3 flex flex-col">
                <p className="text-xs font-bold tracking-wider text-amber-300 uppercase">{b.kind}</p>
                {b.imageUrl && (
                  <div className="mt-2 h-20 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-100">{b.title}</p>
                <CategoryChip categoryId={b.categoryId} className="mt-2" />
              </div>
            </div>

            {/* confidence */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-400">The board pulls these together</p>
              <p className="text-2xl font-bold tracking-tight text-zinc-50">
                {match.confidence}
                <span className="text-base font-medium text-zinc-500">%</span>
              </p>
            </div>

            {/* breakdown */}
            <div className="mt-3 space-y-2.5">
              {(Object.keys(DIMENSION_LABELS) as MatchDimension[]).map((dim) => (
                <BreakdownBar key={dim} label={DIMENSION_LABELS[dim]} value={match.breakdown[dim]} />
              ))}
            </div>

            {/* reasons */}
            <ul className="mt-4 space-y-1">
              {match.reasons.map((r) => (
                <li key={r} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {r}
                </li>
              ))}
            </ul>

            {/* narration */}
            <div className="mt-5">
              {!narration ? (
                <button
                  type="button"
                  disabled={narrating}
                  onClick={handleNarrate}
                  className="ln-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-white/10 hover:text-indigo-200 disabled:opacity-50"
                >
                  {narrating ? "Narrating…" : "✨ Narrate"}
                </button>
              ) : (
                <div className="ln-glass relative rounded-xl p-4">
                  <p className="text-sm text-zinc-200 leading-relaxed">{narration.text}</p>
                  <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2 py-1 shadow-md">
                    {narration.source === "ai" ? (
                      <>
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-400 uppercase">ai</span>
                      </>
                    ) : (
                      <>
                        <Info className="h-3 w-3 text-zinc-400" />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase">fallback</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Where is the item? — from the finder's report */}
            {handoverNote && (
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Where to pick it up</span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-200">{handoverNote}</p>
              </div>
            )}

            {/* actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm(buildPlan())}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-950 transition flex items-center justify-center gap-2 cursor-pointer",
                  "bg-gradient-to-r from-emerald-400 to-teal-300 shadow-lg shadow-emerald-950/40 hover:brightness-110 disabled:opacity-50",
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Confirming…" : "That's mine — confirm!"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 disabled:opacity-50 cursor-pointer"
              >
                <ThumbsDown className="h-4 w-4" />
                Not the same
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
