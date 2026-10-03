"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Ticket, MapPin, ShieldCheck, QrCode, ArrowRight, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";

export interface ReturnPassData {
  _id: string;
  title: string;
  claimToken?: string;
  safeHarbor?: string;
  verifiedChallengeProof?: string;
  custodyState?: "deposited" | "verified" | "released";
}

interface ReturnPassModalProps {
  open: boolean;
  onClose: () => void;
  data: ReturnPassData | null;
  onOpenCustodyDesk?: (token: string) => void;
}

export default function ReturnPassModal({ open, onClose, data, onOpenCustodyDesk }: ReturnPassModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const claimToken = data.claimToken || "#LN-8492";
  const safeHarbor = data.safeHarbor || "Indiranagar Metro Station (Gate 2 Customer Desk)";
  const verifiedProof = data.verifiedChallengeProof || "Red 'R' keychain tag";
  const isReleased = data.custodyState === "released";

  const handleCopy = () => {
    navigator.clipboard?.writeText(claimToken).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-zinc-900/98 via-zinc-950/98 to-black/98 p-6 shadow-[0_0_60px_rgba(16,185,129,0.25)] text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Brand & Close */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Ticket className="h-4 w-4" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 uppercase">
                    LostNet Return Pass
                  </span>
                  <p className="text-[10px] text-zinc-400 leading-none mt-0.5">Physical Custody Handover Boarding Pass</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Boarding Pass Hero Body */}
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    One-Time Claim Token
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-3xl font-extrabold font-mono tracking-tight text-white">
                      {claimToken}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-zinc-300 transition cursor-pointer"
                      title="Copy Claim Token"
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Custody Status
                  </p>
                  <span
                    className={`inline-block mt-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                      isReleased
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {isReleased ? "RELEASED ✓" : "IN SAFE HARBOR"}
                  </span>
                </div>
              </div>

              {/* Safe Harbor Drop-off point */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Designated Safe Harbor Point
                </p>
                <p className="text-sm font-semibold text-white mt-1">
                  {safeHarbor}
                </p>
              </div>

              {/* Zero-Knowledge Proof Banner */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Ownership Proof Challenge
                </p>
                <p className="text-xs text-zinc-200 mt-1 font-semibold italic">
                  “{verifiedProof}”
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Claimant must verbally describe this private feature to the desk officer.
                </p>
              </div>

              {/* Universal Web QR Verification */}
              <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-inner">
                  <QrCode className="h-full w-full text-zinc-950" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-zinc-100 flex items-center gap-1">
                    Universal QR Verification
                  </p>
                  <p className="text-zinc-400 leading-snug text-[11px]">
                    Counter staff or station officer scans with any smartphone camera to launch the Custody Release Terminal.
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400 pt-0.5">
                    Token: {claimToken}
                  </p>
                </div>
              </div>

              {/* Handover CTA */}
              {onOpenCustodyDesk && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCustodyDesk(claimToken);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    <span>Proceed to Custody Terminal</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="text-center pt-1">
                <p className="text-[10px] text-zinc-500">
                  Zero personal phone numbers or home addresses were shared during this exchange.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
