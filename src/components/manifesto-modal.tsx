"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Shield, Compass, Heart, Radio, ArrowRight, CheckCircle2, Lock, Building2 } from "lucide-react";

interface ManifestoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ManifestoModal({ open, onClose }: ManifestoModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto"
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
            className="ln-glass relative my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black/95 p-6 sm:p-8 shadow-2xl text-zinc-100"
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

            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-amber-400 p-[1.5px]">
                <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                The LostNet Manifesto &amp; Thesis
              </span>
            </div>

            {/* Core Paradox Quote Banner */}
            <div className="mt-5 relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-indigo-500/10 p-5 sm:p-6 shadow-inner">
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Heart className="h-40 w-40 text-rose-400" />
              </div>
              <p className="font-serif italic text-lg sm:text-xl text-zinc-100 leading-relaxed font-light">
                “The tragedy of lost things isn’t that they are gone; it’s that they are almost always within 500 meters
                of someone who wants to give them back. What’s missing is not human kindness, but a protocol of trust.”
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-amber-300/80 font-medium">
                <span>— The Lost &amp; Found Paradox</span>
                <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 border border-amber-400/20 text-[11px]">
                  DEV × Sanity Challenge 2026
                </span>
              </div>
            </div>

            {/* The Historical Problem */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Why Traditional Lost &amp; Found Has Failed for 100 Years
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">⏳</span>
                    <h4 className="mt-2 text-xs font-bold text-zinc-200">Asymmetry of Attention</h4>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                      Losers search frantically for 48 hours. Finders discover items days later. By then, both have given up.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">🛡️</span>
                    <h4 className="mt-2 text-xs font-bold text-zinc-200">The Privacy &amp; Stalker Trap</h4>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                      Nobody wants to post their personal phone number or meet strangers in a dark lot. People stay silent out of fear.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">🔑</span>
                    <h4 className="mt-2 text-xs font-bold text-zinc-200">Commodity Blindness</h4>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                      50 black Honda keys are lost weekly. Dumb text search produces false positives and opens the door to scammers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* The LostNet 4-Pillar Civic Solution */}
            <div className="mt-7 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                The 4 Pillars of the LostNet Protocol
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-200">
                      1. Autonomous Gravitational Resonance (Not Dumb Matching)
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                      Reports don&apos;t sit in quiet silos. A deterministic engine scores every opposite-kind pair on category (0.30),
                      geospatial distance (0.30), timing (0.20) and description overlap (0.20), with a colour-contradiction
                      penalty — so items visibly pull toward each other on a living canvas. No model decides anything.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-200">
                      2. Hashed Ownership Challenge (The Answer Never Leaves the Server)
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                      The owner writes a question and an answer. Only a PBKDF2-SHA256 hash and a random salt are stored — never the
                      plaintext. The desk reads the question aloud, types the claimant&apos;s spoken words and sends them to the server,
                      which compares hashes and returns a single boolean. This screen can&apos;t leak what it never holds. Two wrong
                      attempts lock the handover.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-200">
                      3. Safe Harbor Liability Armor (Active Desks vs. Passive Bins)
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                      Solves the attendant liability paradox: <strong>Active Civic Desks</strong> (Metro/Police) utilize existing statutory lost-property duties via our digital API. <strong>Passive Monitored Bins</strong> (Cafés) require zero staff custody — items are dropped with a condition snapshot alibi, keeping partners completely shielded.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200">
                      4. The Airline Boarding Pass for Physical Handover
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                      Once confirmed, a Digital Return Pass with a one-time claim token (<span className="text-zinc-100 font-mono font-bold">#LN-XXXX</span>)
                      and a real QR code is issued. Scan it with any phone camera and the board opens with the token filled in —
                      no app, no login, no account.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* The 3 Core Axioms & Game Theory */}
            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 via-zinc-900/40 to-indigo-950/20 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                The Three LostNet Axioms
              </h3>
              <div className="grid gap-2 text-xs">
                <div className="flex items-start gap-2.5 text-zinc-200">
                  <span className="text-indigo-400 font-bold shrink-0">1.</span>
                  <div>
                    <p className="font-semibold text-white">“LostNet doesn&apos;t move the item — it moves the trust.”</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Physical items stay in the neighbourhood; a one-time token and a hashed ownership check coordinate the handover.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-200">
                  <span className="text-emerald-400 font-bold shrink-0">2.</span>
                  <div>
                    <p className="font-semibold text-white">“We didn&apos;t invent the lost-property desk. We gave it an API.”</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Metro &amp; police stations already hold legal lost property custody. We turn dusty paper logbooks into instant scan-based digital ledgers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-200">
                  <span className="text-amber-400 font-bold shrink-0">3.</span>
                  <div>
                    <p className="font-semibold text-white">“The barista doesn&apos;t guard anything. The bin does — and the board keeps watch.”</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Passive café bins eliminate counter staff liability. Deposit photos + time-stamped alibis protect partners from false claims.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Footer */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Powered by <strong className="text-zinc-200 font-semibold">Sanity Content Lake</strong> reactive GROQ change streams</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-950/50 hover:brightness-110 transition cursor-pointer"
              >
                Explore The Board →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
