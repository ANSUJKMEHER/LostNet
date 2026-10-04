"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Ticket, MapPin, ShieldCheck, ArrowRight, CheckCircle2, Copy, Clock, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import type { Reunion } from "@/lib/types";
import { HANDOVER_MODE_LABELS } from "@/lib/handover";

interface ReturnPassModalProps {
  open: boolean;
  onClose: () => void;
  data: Reunion | null;
  onOpenCustodyDesk?: (token: string) => void;
  onOpenChat?: (reunion: Reunion) => void;
}

export default function ReturnPassModal({ open, onClose, data, onOpenCustodyDesk, onOpenChat }: ReturnPassModalProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!data) return null;

  const token = data.claimToken;
  const handover = data.handover;
  const isReleased = data.custodyState === "released";
  const hasQuestion = Boolean(data.challengeQuestion);

  // Staff scan this and land on the board with the token already filled in.
  const qrValue = token && origin ? `${origin}/?custody=${encodeURIComponent(token)}` : "";

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard?.writeText(token).catch(() => {});
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
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Ticket className="h-4 w-4" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 uppercase">
                    LostNet Return Pass
                  </span>
                  <p className="text-[10px] text-zinc-400 leading-none mt-0.5">Show this at the handover</p>
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

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">One-time claim token</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-3xl font-extrabold font-mono tracking-tight text-white">{token ?? "—"}</p>
                    {token && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-zinc-300 transition cursor-pointer"
                        title="Copy claim token"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custody</p>
                  <span
                    className={`inline-block mt-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                      isReleased
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {isReleased ? "RELEASED ✓" : data.custodyState === "deposited" ? "AT THE DESK" : "WITH THE FINDER"}
                  </span>
                </div>
              </div>

              {/* Handover place — real data or an honest explanation */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Handover
                </p>
                {handover ? (
                  <>
                    <p className="text-sm font-semibold text-white mt-1">
                      {handover.label ?? HANDOVER_MODE_LABELS[handover.mode]}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {HANDOVER_MODE_LABELS[handover.mode]}
                      {handover.time ? ` · ${handover.time}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-300 mt-1">
                    No place chosen yet — whoever has the item keeps it until the claimant gets in touch with the token.
                  </p>
                )}
              </div>

              {/* Ownership challenge — question only */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Ownership challenge
                </p>
                {hasQuestion ? (
                  <>
                    <p className="text-xs text-zinc-100 mt-1 font-semibold">“{data.challengeQuestion}”</p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      The claimant answers this aloud at the desk. The stored answer is a hash and is never displayed.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-zinc-300 mt-1">
                    No private question was set. The token is the only proof of ownership on this handover.
                  </p>
                )}
              </div>

              {/* Real QR */}
              <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                  {qrValue ? (
                    <QRCode value={qrValue} size={68} bgColor="#ffffff" fgColor="#09090b" />
                  ) : (
                    <span className="text-[9px] text-zinc-500 text-center px-1">
                      QR appears once a token is issued
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-zinc-100">Scan to open the custody desk</p>
                  <p className="text-zinc-400 leading-snug text-[11px]">
                    Any phone camera opens this board with the token already filled in — no app, no login.
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400 pt-0.5">{qrValue || "—"}</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(data);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-950/50 hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Open Handover Chat</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {onOpenCustodyDesk && token && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCustodyDesk(token);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <span>Open custody desk (alternative)</span>
                  </button>
                )}
              </div>

              <div className="text-center pt-1 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
                <Clock className="h-3 w-3" />
                No phone numbers or home addresses were shared in this exchange.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
