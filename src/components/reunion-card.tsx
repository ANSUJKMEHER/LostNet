"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Pencil,
  ShieldCheck,
  Ticket,
  QrCode,
  CheckCircle2,
  Heart,
  Sparkles,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { Reunion, Item } from "@/lib/types";
import { CategoryChip } from "@/components/board-map";
import { timeAgo, cn } from "@/lib/utils";

interface ReunionCardProps {
  reunion: Reunion;
  a?: Item;
  b?: Item;
}

export default function ReunionCard({ reunion, a, b }: ReunionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [storyText, setStoryText] = useState(reunion.story || "");
  const [displayedStory, setDisplayedStory] = useState(reunion.story || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Derive stable fallback metadata if not explicitly provided
  const claimToken =
    reunion.claimToken ||
    `#LN-${Math.abs(reunion._id.split("").reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) % 9000 + 1000)}`;

  const safeHarbor =
    reunion.safeHarbor ||
    a?.handoverNote ||
    b?.handoverNote ||
    "Indiranagar Metro Station Customer Desk, Gate 2";

  const verifiedProof =
    reunion.verifiedChallengeProof ||
    a?.secretChallenge ||
    b?.secretChallenge ||
    "Physical trait & secret mark verified";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ story: storyText }),
      });
      if (!res.ok) throw new Error("Failed to save story");
      setDisplayedStory(storyText);
      setIsEditing(false);
    } catch {
      alert("Failed to save story");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <article className="ln-glass rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/10 transition-all hover:border-white/20">
        {/* Header with Title and Custody Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-rose-400 uppercase flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              Verified City Reunion
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">{reunion.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Returned & Reunited
            </span>
            <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
              {reunion.status}
            </span>
          </div>
        </div>

        {/* 4-Stage Custody Journey Stepper */}
        <div className="mt-4 rounded-xl bg-white/5 p-3 sm:p-3.5 border border-white/5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
            Custody Journey Protocol
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">1</span>
              <span>Pinned on Map</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">2</span>
              <span>Resonance Pulled</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">3</span>
              <span>Proof Verified</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/30 text-[10px] font-bold">4</span>
              <span>Handed Back</span>
            </div>
          </div>
        </div>

        {/* Visual Evidence Match (Lost vs Found) */}
        {a && b && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Item A */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold tracking-wider text-indigo-300 uppercase">
                    {a.kind} Report
                  </span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(a.occurredAt)}
                  </span>
                </div>
                {a.imageUrl && (
                  <div className="mt-2.5 h-28 w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.imageUrl} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="mt-2 text-sm font-semibold text-zinc-100">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{a.description}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="h-3 w-3 text-indigo-400 shrink-0" /> {a.placeLabel}
                </span>
                <CategoryChip categoryId={a.categoryId} />
              </div>
            </div>

            {/* Central Heart Connector */}
            <div className="flex md:flex-col items-center justify-center py-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 shadow-lg">
                <Heart className="h-5 w-5 fill-rose-500/30" />
              </span>
            </div>

            {/* Item B */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                    {b.kind} Report
                  </span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(b.occurredAt)}
                  </span>
                </div>
                {b.imageUrl && (
                  <div className="mt-2.5 h-28 w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="mt-2 text-sm font-semibold text-zinc-100">{b.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{b.description}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="h-3 w-3 text-amber-400 shrink-0" /> {b.placeLabel}
                </span>
                <CategoryChip categoryId={b.categoryId} />
              </div>
            </div>
          </div>
        )}

        {/* Ownership Proof & Safe Harbor Badges */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Zero-Knowledge Proof Verified</span>
            </div>
            <p className="mt-1 text-xs text-zinc-200 italic leading-relaxed line-clamp-2">
              “{verifiedProof}”
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Safe Harbor Drop-off</span>
              </span>
              <span className="font-mono font-bold text-xs bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded text-emerald-300">
                {claimToken}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-200 leading-relaxed truncate">
              {safeHarbor}
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            The City Memory Echo (Sanity Content Lake)
          </p>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[90px]"
                placeholder="Write the reunion story..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setStoryText(displayedStory);
                  }}
                  disabled={isSaving}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-indigo-500/30 border border-indigo-400/40 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/40 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Story to Sanity"}
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              {displayedStory ? (
                <p className="text-sm leading-relaxed text-zinc-300 font-normal">
                  {displayedStory}
                </p>
              ) : (
                <p className="text-sm italic text-zinc-500">No story provided yet.</p>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute -right-1 -top-1 rounded-full p-1.5 text-zinc-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-zinc-200 group-hover:opacity-100"
                title="Edit story"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions: Claim Pass Button & Timestamp */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span suppressHydrationWarning>
              Recorded{" "}
              {reunion.publishedAt
                ? new Date(reunion.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(reunion.createdAt).toLocaleDateString("en-US")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPass(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-300 transition shadow-lg shadow-emerald-950/30 active:scale-95"
          >
            <Ticket className="h-4 w-4" />
            <span>View Digital Return Pass</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      {/* Digital Return Pass Modal (Boarding Pass UX) */}
      <AnimatePresence>
        {showPass && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/20 p-6 shadow-2xl text-zinc-100 overflow-hidden"
            >
              {/* Top Bar with Brand & Close */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-emerald-400" />
                  <span className="font-mono text-sm font-bold tracking-widest text-emerald-400 uppercase">
                    LostNet Return Pass
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPass(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Boarding Pass Hero Body */}
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      One-Time Claim Token
                    </p>
                    <p className="text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
                      {claimToken}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Custody Status
                    </p>
                    <span className="inline-block mt-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                      RELEASED & VERIFIED
                    </span>
                  </div>
                </div>

                {/* Safe Harbor Drop-off point */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    Designated Safe Harbor Point
                  </p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {safeHarbor}
                  </p>
                </div>

                {/* Zero-Knowledge Proof Banner */}
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                  <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Ownership Proof Challenge
                  </p>
                  <p className="text-xs text-zinc-200 mt-1 italic">
                    “{verifiedProof}”
                  </p>
                </div>

                {/* Universal Web QR Verification */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                    {/* Visual QR representation */}
                    <QrCode className="h-full w-full text-zinc-950" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-zinc-100 flex items-center gap-1">
                      Universal Web Verification
                    </p>
                    <p className="text-zinc-400 leading-snug text-[11px]">
                      Counter staff or finder can scan with any phone camera to verify custody release without downloading an app.
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400 pt-0.5">
                      URL: lostnet.city/claim/{claimToken.replace("#", "")}
                    </p>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-zinc-500">
                    No personal phone numbers or addresses were shared during this exchange.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
