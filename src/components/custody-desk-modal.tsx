"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  Lock,
  AlertCircle,
  PackageCheck,
  FileCheck2,
  MapPin,
  MessageSquare,
} from "lucide-react";
import type { Reunion } from "@/lib/types";
import { sounds } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface CustodyDeskModalProps {
  open: boolean;
  onClose: () => void;
  onReunionUpdated?: () => void;
  initialToken?: string;
  onOpenChat?: (reunion: Reunion) => void;
}

type VerifyState = "idle" | "verified" | "failed" | "locked" | "none";

/**
 * The custody desk is the counter-staff surface. It does exactly three things:
 * look a claim token up, ask the owner's private question and check the spoken
 * answer on the server, and record the handover. It never receives the answer
 * hash, and it cannot fabricate a verification.
 */
export default function CustodyDeskModal({ open, onClose, onReunionUpdated, initialToken, onOpenChat }: CustodyDeskModalProps) {
  const [tokenInput, setTokenInput] = useState(initialToken ?? "");
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [attemptsLeft, setAttemptsLeft] = useState<number>(2);
  const [checking, setChecking] = useState(false);

  const [itemInspected, setItemInspected] = useState(false);
  const [manualAttest, setManualAttest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);

  const resetAll = useCallback(() => {
    setTokenInput("");
    setReunion(null);
    setLookupError(null);
    setAnswer("");
    setVerifyState("idle");
    setAttemptsLeft(2);
    setChecking(false);
    setItemInspected(false);
    setManualAttest(false);
    setSubmitting(false);
    setReleaseSuccess(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetAll();
      if (initialToken) {
        setTokenInput(initialToken);
      }
    }
  }, [open, initialToken, resetAll]);

  const lookup = useCallback(async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;
    setLoading(true);
    setLookupError(null);
    setReunion(null);
    setVerifyState("idle");
    setAnswer("");
    setAttemptsLeft(2);
    setItemInspected(false);
    setManualAttest(false);
    setReleaseSuccess(false);
    try {
      const res = await fetch("/api/reunions/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      const found = data.reunion as Reunion;
      setReunion(found);
      setVerifyState(found.challengeQuestion ? "idle" : "none");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-lookup when the desk is opened from a scanned QR / Return Pass.
  useEffect(() => {
    if (open && initialToken && initialToken.trim()) {
      void lookup(initialToken);
    }
  }, [open, initialToken, lookup]);

  const checkAnswer = useCallback(async () => {
    if (!reunion || !answer.trim() || checking) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      if (data.verified) {
        setVerifyState("verified");
        sounds.playSnap();
      } else if (data.locked) {
        setVerifyState("locked");
      } else {
        setVerifyState("failed");
      }
      setAttemptsLeft(Math.max(0, 2 - (data.attempts ?? 0)));
    } catch {
      setVerifyState("failed");
    } finally {
      setChecking(false);
    }
  }, [reunion, answer, checking]);

  const markDeposited = useCallback(async () => {
    if (!reunion) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/custody`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ custodyState: "deposited" }),
      });
      if (!res.ok) throw new Error("Failed to record deposit");
      const data = await res.json();
      setReunion(data.reunion as Reunion);
      sounds.playSnap();
      onReunionUpdated?.();
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setSubmitting(false);
    }
  }, [reunion, onReunionUpdated]);

  const releaseItem = useCallback(async () => {
    if (!reunion) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/custody`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ custodyState: "released" }),
      });
      if (!res.ok) throw new Error("Failed to release");
      const data = await res.json();
      setReunion(data.reunion as Reunion);
      sounds.playSnap();
      setReleaseSuccess(true);
      onReunionUpdated?.();
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Release failed");
    } finally {
      setSubmitting(false);
    }
  }, [reunion, onReunionUpdated]);

  // The challenge is satisfied either by a verified answer, or — when no
  // question was ever set — by the operator attesting they checked the item
  // against the report and photo.
  const challengeSatisfied = verifyState === "verified" || (verifyState === "none" && manualAttest);
  const canRelease = Boolean(reunion) && challengeSatisfied && itemInspected;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="ln-glass flex h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl p-5 sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-zinc-50">Custody desk</h2>
                  <p className="text-[11px] text-zinc-500">Counter staff · no account needed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Token */}
            <div className="mt-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Claim token</label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void lookup(tokenInput);
                    }}
                    placeholder="e.g. #LN-8492"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400/50"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !tokenInput.trim()}
                  onClick={() => void lookup(tokenInput)}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-40"
                >
                  {loading ? "Looking…" : "Look up"}
                </button>
              </div>
              {lookupError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {lookupError}
                </p>
              )}
            </div>

            {reunion && (
              <>
                {/* Handover summary */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <p className="text-sm font-semibold text-zinc-100">{reunion.title}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {reunion.handover?.label ?? "No place chosen"}
                      </span>
                      <span>Mode: {reunion.handover?.mode ?? "finder"}</span>
                      <span className="font-mono text-emerald-300">{reunion.claimToken}</span>
                      {reunion.custodyState && <span>Custody: {reunion.custodyState}</span>}
                    </div>

                    {onOpenChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenChat(reunion);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Handover Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Ownership challenge */}
                <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Ownership challenge
                  </p>

                  {reunion.challengeQuestion ? (
                    <>
                      <p className="mt-1.5 text-sm font-semibold text-zinc-100">
                        Ask the claimant: “{reunion.challengeQuestion}”
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Type exactly what they say. The answer is checked on the server — this screen never stores or
                        shows it.
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <input
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void checkAnswer();
                          }}
                          disabled={verifyState === "verified" || verifyState === "locked"}
                          placeholder="Their spoken answer"
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400/50 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          disabled={checking || !answer.trim() || verifyState === "verified" || verifyState === "locked"}
                          onClick={() => void checkAnswer()}
                          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-40"
                        >
                          {checking ? "Checking…" : "Check"}
                        </button>
                      </div>

                      {verifyState === "verified" && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Answer matched.
                        </p>
                      )}
                      {verifyState === "failed" && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                          <AlertCircle className="h-3.5 w-3.5" /> Did not match. {attemptsLeft} attempt
                          {attemptsLeft === 1 ? "" : "s"} left. You can also chat directly with the owner to verify.
                        </p>
                      )}
                      {verifyState === "locked" && (
                        <div className="mt-2 space-y-2">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                            <AlertCircle className="h-3.5 w-3.5" /> Two attempts did not match the stored hash.
                          </p>
                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChat(reunion);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/30 transition cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Open Handover Chat with Owner</span>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-[11px] text-zinc-300">
                        Neither report set a private question. Check the claimant against the item photo and the
                        original report before releasing.
                      </p>
                      <label className="mt-2.5 flex items-start gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={manualAttest}
                          onChange={(e) => setManualAttest(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-amber-500"
                        />
                        I checked this claimant against the report and photo.
                      </label>
                    </>
                  )}
                </div>

                {/* 3. Item inspection */}
                <label className="mt-3 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={itemInspected}
                    onChange={(e) => setItemInspected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-500"
                  />
                  I have the item in front of me and it matches the report.
                </label>

                {/* Actions */}
                <div className="mt-4 flex flex-col gap-2">
                  {releaseSuccess ? (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
                      <FileCheck2 className="mx-auto h-6 w-6 text-emerald-300" />
                      <p className="mt-1.5 text-sm font-semibold text-emerald-200">Released. It&apos;s home.</p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        The handover is recorded against {reunion.claimToken}.
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={
                          submitting || reunion.custodyState === "deposited" || reunion.custodyState === "released"
                        }
                        onClick={() => void markDeposited()}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
                      >
                        <PackageCheck className="h-4 w-4" />
                        {reunion.custodyState === "deposited" ? "Already at this desk" : "Log the item in at this desk"}
                      </button>
                      <button
                        type="button"
                        disabled={submitting || !canRelease}
                        onClick={() => void releaseItem()}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition",
                          canRelease
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 hover:brightness-110"
                            : "bg-white/5 text-zinc-500",
                        )}
                      >
                        {submitting ? "Recording…" : "Release to the claimant"}
                      </button>
                      {!canRelease && (
                        <p className="text-center text-[11px] text-zinc-500">
                          Both checks above are required before the item can be released.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {!reunion && !loading && (
              <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-500">
                Enter the token from the Return Pass. Without a token there is nothing to release — that&apos;s the
                point.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
