"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Heart,
  ThumbsDown,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
  Coffee,
  CheckCircle2,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import type { Item, MatchDimension, MatchRecord } from "@/lib/types";
import { CategoryChip } from "@/components/board-map";
import { cn } from "@/lib/utils";

interface MatchDialogProps {
  open: boolean;
  a: Item | null;
  b: Item | null;
  match: MatchRecord | null;
  busy: boolean;
  onConfirm: (details: { safeHarbor: string; timeWindow: string }) => void;
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

type SafeHarborType = "metro" | "cafe" | "police" | "custom";

interface SafeHarborOption {
  id: string;
  name: string;
  desc: string;
  badge: string;
  type: SafeHarborType;
}

const DEFAULT_SAFE_HARBORS: SafeHarborOption[] = [
  {
    id: "metro",
    name: "Indiranagar Metro (Gate 2 Customer Desk)",
    desc: "CCTV Monitored · Station Officer Custody",
    badge: "Official Safe Harbor",
    type: "metro",
  },
  {
    id: "cafe",
    name: "Starbucks 100ft Road (Front Barista Counter)",
    desc: "Community Partner · Neutral High-Traffic Desk",
    badge: "Community Hub",
    type: "cafe",
  },
  {
    id: "police",
    name: "Indiranagar Police Assistance Kiosk",
    desc: "24/7 Guarded · High-Security Verification",
    badge: "High Security",
    type: "police",
  },
];

const TIME_WINDOWS = [
  { id: "express", label: "⚡ Express (Within 2 hrs)" },
  { id: "evening", label: "🌆 Today 5:00 – 7:00 PM" },
  { id: "tomorrow", label: "☀️ Tomorrow 10 AM – 12 PM" },
];

export default function MatchDialog({ open, a, b, match, busy, onConfirm, onReject, onClose }: MatchDialogProps) {
  const [narration, setNarration] = useState<{ text: string; source: "ai" | "fallback" } | null>(null);
  const [narrating, setNarrating] = useState(false);

  const safeHarborOptions = useMemo(() => {
    const list = [...DEFAULT_SAFE_HARBORS];
    const customNote = a?.handoverNote || b?.handoverNote;
    if (customNote && !list.some((o) => o.name.toLowerCase() === customNote.toLowerCase())) {
      list.unshift({
        id: "custom",
        name: customNote,
        desc: "Preferred location requested in report",
        badge: "Report Preferred",
        type: "custom" as const,
      });
    }
    return list;
  }, [a?.handoverNote, b?.handoverNote]);

  const [selectedSpot, setSelectedSpot] = useState<string>(DEFAULT_SAFE_HARBORS[0].name);
  const [selectedTime, setSelectedTime] = useState<string>(TIME_WINDOWS[0].label);

  useEffect(() => {
    if (safeHarborOptions.length > 0) {
      setSelectedSpot(safeHarborOptions[0].name);
    }
  }, [safeHarborOptions]);

  useEffect(() => {
    if (!open) {
      setNarration(null);
      setNarrating(false);
    }
  }, [open]);

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
    } catch (e) {
      const evidence = match.reasons.length > 0
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
            className="ln-glass flex h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/15">
                  <Heart className="h-5 w-5 text-rose-300" />
                </span>
                <h2 className="text-xl font-bold text-zinc-50">Possible reunion</h2>
              </div>
              <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 sm:h-8 sm:w-8" aria-label="Close">
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

            {/* Ownership Proof Verification Challenge */}
            {(a.secretChallenge || b.secretChallenge) && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-sm">Ownership Proof Challenge</span>
                </div>
                <p className="mt-1.5 text-zinc-100 font-semibold text-sm">
                  “{a.secretChallenge || b.secretChallenge}”
                </p>
                <p className="mt-1 text-xs text-zinc-300">
                  Please verify this detail with the claimant before releasing the item.
                </p>
              </div>
            )}

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

            {/* Safe Harbor Meetup & Handover Protocol */}
            <div className="mt-5 rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-indigo-950/40 via-zinc-900/60 to-zinc-950/80 p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                      Safe Harbor Meetup Protocol
                    </h4>
                    <p className="text-[11px] text-zinc-400">Zero phone numbers or home addresses leaked</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  🔒 Anonymous
                </span>
              </div>

              {/* Safe Harbor Drop-off Points */}
              <div className="mt-3.5 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Select Neutral Safe Desk</p>
                <div className="grid gap-2">
                  {safeHarborOptions.map((opt) => {
                    const isSelected = selectedSpot === opt.name;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedSpot(opt.name)}
                        className={cn(
                          "group flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                          isSelected
                            ? "border-indigo-400/80 bg-indigo-500/15 shadow-md shadow-indigo-950/50"
                            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                            isSelected ? "bg-indigo-500 text-white" : "bg-white/10 text-zinc-400 group-hover:text-zinc-200"
                          )}
                        >
                          {opt.type === "metro" && <Building2 className="h-4 w-4" />}
                          {opt.type === "cafe" && <Coffee className="h-4 w-4" />}
                          {opt.type === "police" && <ShieldCheck className="h-4 w-4" />}
                          {opt.type === "custom" && <MapPin className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn("text-xs font-semibold leading-tight", isSelected ? "text-zinc-100" : "text-zinc-300")}>
                              {opt.name}
                            </span>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />}
                          </div>
                          <p className="mt-0.5 text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Handover Time Window */}
              <div className="mt-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Custody Time Window</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {TIME_WINDOWS.map((tw) => {
                    const isSelected = selectedTime === tw.label;
                    return (
                      <button
                        key={tw.id}
                        type="button"
                        onClick={() => setSelectedTime(tw.label)}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all",
                          isSelected
                            ? "border-amber-400/80 bg-amber-500/15 text-amber-200 shadow-sm"
                            : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:bg-white/[0.05]"
                        )}
                      >
                        <Clock className={cn("h-3.5 w-3.5 mb-1", isSelected ? "text-amber-400" : "text-zinc-500")} />
                        <span className="text-[10px] font-medium leading-tight">{tw.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-2.5 flex items-center gap-2 text-[11px] text-zinc-400">
                <Lock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>
                  Generates an encrypted <strong className="text-zinc-200">#LN-XXXX</strong> token &amp; scannable Digital Return Pass for physical handover.
                </span>
              </div>
            </div>

            {/* actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm({ safeHarbor: selectedSpot, timeWindow: selectedTime })}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 transition flex items-center justify-center gap-2",
                  "bg-gradient-to-r from-rose-400 to-orange-300 shadow-lg shadow-rose-950/40 hover:brightness-110 disabled:opacity-50",
                )}
              >
                {busy ? "Issuing Return Pass…" : "Yes — Reunite & Issue Return Pass"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"
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
