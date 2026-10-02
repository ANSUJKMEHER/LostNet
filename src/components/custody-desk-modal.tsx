"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Building2,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  FileCheck2,
  Sparkles,
  QrCode,
  AlertCircle,
} from "lucide-react";
import type { Item, Reunion, MatchRecord } from "@/lib/types";
import { sounds } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface EnrichedReunion extends Reunion {
  match?: MatchRecord | null;
  itemA?: Item | null;
  itemB?: Item | null;
}

interface CustodyDeskModalProps {
  open: boolean;
  onClose: () => void;
  onReunionUpdated?: () => void;
}

export default function CustodyDeskModal({ open, onClose, onReunionUpdated }: CustodyDeskModalProps) {
  const [reunions, setReunions] = useState<EnrichedReunion[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [selectedReunionId, setSelectedReunionId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    qrScanned: true,
    challengeVerified: false,
    itemInspected: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);

  const fetchReunions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reunions");
      if (res.ok) {
        const data = await res.json();
        setReunions(data.reunions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchReunions();
      setReleaseSuccess(false);
      setChecklist({ qrScanned: true, challengeVerified: false, itemInspected: false });
    }
  }, [open, fetchReunions]);

  // Active selected reunion
  const activeReunion = useMemo(() => {
    if (selectedReunionId) {
      return reunions.find((r) => r._id === selectedReunionId) ?? null;
    }
    if (tokenInput.trim()) {
      const clean = tokenInput.trim().toUpperCase();
      return reunions.find((r) => r.claimToken?.toUpperCase().includes(clean)) ?? null;
    }
    return reunions[0] ?? null;
  }, [selectedReunionId, tokenInput, reunions]);

  const canRelease = checklist.qrScanned && checklist.challengeVerified && checklist.itemInspected;

  const handleRelease = async () => {
    if (!activeReunion) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reunions/${activeReunion._id}/custody`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ custodyState: "released" }),
      });
      if (!res.ok) throw new Error("Failed to release custody");
      sounds.playSnap();
      setReleaseSuccess(true);
      setReunions((prev) =>
        prev.map((r) => (r._id === activeReunion._id ? { ...r, custodyState: "released" as const } : r))
      );
      onReunionUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Release failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="ln-glass relative my-8 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/98 via-zinc-950/98 to-black/98 p-5 sm:p-7 shadow-2xl text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-[2px]">
                <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-50">Safe Harbor Custody Desk</h2>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    Official Station Portal
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Indiranagar Metro Station (Gate 2 Customer Desk) • Custody Terminal #04
                </p>
              </div>
            </div>

            {/* Search / Scan Token Bar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setSelectedReunionId(null);
                  }}
                  placeholder="Scan QR or enter Claim Token (e.g. #LN-8492)..."
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <QrCode className="h-4 w-4 text-indigo-400" />
                <span>Camera scanner ready</span>
              </div>
            </div>

            {/* Pending Custody List Chips */}
            {reunions.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Items in Safe Custody at this Hub:
                </p>
                <div className="flex flex-wrap gap-2">
                  {reunions.map((r) => {
                    const isSelected = activeReunion?._id === r._id;
                    const isReleased = r.custodyState === "released";
                    return (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => {
                          setSelectedReunionId(r._id);
                          setTokenInput("");
                          setReleaseSuccess(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition cursor-pointer",
                          isSelected
                            ? "border-emerald-400/80 bg-emerald-500/20 text-white font-semibold shadow-md"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:bg-white/10"
                        )}
                      >
                        <span className="font-mono text-zinc-400">{r.claimToken || "#LN-?????"}</span>
                        <span className="max-w-[120px] truncate">{r.title}</span>
                        {isReleased ? (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
                            Released
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                            Awaiting
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Custody Detail Card */}
            {activeReunion ? (
              <div className="mt-5 space-y-4">
                {/* Status banner */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Custody Token Identified
                    </span>
                    <h3 className="text-base font-bold text-zinc-100">{activeReunion.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Safe Harbor: <strong className="text-zinc-200">{activeReunion.safeHarbor || "Indiranagar Metro"}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-white/10 border border-white/15 px-3 py-1 rounded-xl text-zinc-100">
                      {activeReunion.claimToken || "#LN-XXXX"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
                        activeReunion.custodyState === "released" || releaseSuccess
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                      )}
                    >
                      {activeReunion.custodyState === "released" || releaseSuccess ? "Released to Owner" : "In Custody (Hold)"}
                    </span>
                  </div>
                </div>

                {/* Evidence Comparison Photos */}
                {(activeReunion.itemA || activeReunion.itemB) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeReunion.itemA && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                          <span className="font-bold text-indigo-400 uppercase">{activeReunion.itemA.kind} Report</span>
                          <span>{activeReunion.itemA.placeLabel}</span>
                        </div>
                        {activeReunion.itemA.imageUrl && (
                          <div className="h-24 w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeReunion.itemA.imageUrl}
                              alt={activeReunion.itemA.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <p className="mt-2 text-xs font-semibold text-zinc-200">{activeReunion.itemA.title}</p>
                      </div>
                    )}

                    {activeReunion.itemB && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                          <span className="font-bold text-amber-400 uppercase">{activeReunion.itemB.kind} Report</span>
                          <span>{activeReunion.itemB.placeLabel}</span>
                        </div>
                        {activeReunion.itemB.imageUrl && (
                          <div className="h-24 w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeReunion.itemB.imageUrl}
                              alt={activeReunion.itemB.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <p className="mt-2 text-xs font-semibold text-zinc-200">{activeReunion.itemB.title}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Secret Proof Challenge Verification Gate */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Zero-Knowledge Ownership Challenge Gate
                      </h4>
                      <p className="text-[11px] text-zinc-300">
                        Ask the claimant this unposted question before handing over the physical item:
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-400/20 bg-black/40 p-3">
                    <p className="text-xs text-zinc-400 uppercase font-semibold">Registered Challenge Question / Secret:</p>
                    <p className="mt-1 text-sm font-bold text-amber-200">
                      “{activeReunion.verifiedChallengeProof ||
                        activeReunion.itemA?.secretChallenge ||
                        activeReunion.itemB?.secretChallenge ||
                        "Physical trait & secret match confirmed"}”
                    </p>
                  </div>
                </div>

                {/* Attendant Handover Checklist */}
                {activeReunion.custodyState !== "released" && !releaseSuccess ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2.5">
                      Officer Verification Checklist
                    </h4>
                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2.5 text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.qrScanned}
                          onChange={(e) => setChecklist((c) => ({ ...c, qrScanned: e.target.checked }))}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-400"
                        />
                        <span>1. Digital Return Pass QR scanned &amp; matches token <strong className="text-zinc-100">{activeReunion.claimToken}</strong></span>
                      </label>
                      <label className="flex items-center gap-2.5 text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.challengeVerified}
                          onChange={(e) => setChecklist((c) => ({ ...c, challengeVerified: e.target.checked }))}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-400"
                        />
                        <span>2. Claimant correctly answered the secret challenge question</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.itemInspected}
                          onChange={(e) => setChecklist((c) => ({ ...c, itemInspected: e.target.checked }))}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-400"
                        />
                        <span>3. Physical item condition confirmed &amp; signed off by desk attendant</span>
                      </label>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                      <button
                        type="button"
                        disabled={!canRelease || submitting}
                        onClick={handleRelease}
                        className={cn(
                          "rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer",
                          canRelease
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-95"
                            : "bg-white/10 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        <FileCheck2 className="h-4 w-4" />
                        <span>{submitting ? "Signing Release…" : "Sign & Complete Custody Release"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-emerald-300">Physical Custody Released to Owner</h4>
                    <p className="mt-1 text-xs text-zinc-300 max-w-md mx-auto">
                      Physical item has been handed over at Indiranagar Metro Gate 2. Sanity Content Lake has permanently
                      recorded this reunion.
                    </p>
                    <p className="mt-2 font-mono text-xs text-zinc-400">
                      Certificate ID: {activeReunion._id} • Handover Complete
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-zinc-400">
                <AlertCircle className="mx-auto h-8 w-8 text-zinc-500 mb-2" />
                <p className="text-sm font-semibold text-zinc-300">No Pending Custody Item Selected</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Scan a claimant’s QR code or enter a token (#LN-XXXX) to begin custody verification.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
