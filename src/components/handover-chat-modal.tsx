"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Sparkles,
  MapPin,
  Clock,
  User,
  Heart,
  Check,
} from "lucide-react";
import type { Reunion, ChatMessage } from "@/lib/types";
import { sounds } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface HandoverChatModalProps {
  open: boolean;
  onClose: () => void;
  reunion: Reunion | null;
  onReunionUpdated?: () => void;
}

export default function HandoverChatModal({
  open,
  onClose,
  reunion,
  onReunionUpdated,
}: HandoverChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [senderRole, setSenderRole] = useState<"finder" | "owner">("owner");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Proof verification state
  const [answerInput, setAnswerInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Handover completion
  const [completing, setCompleting] = useState(false);
  const [isReleased, setIsReleased] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reunions/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && reunion) {
      void loadMessages(reunion._id);
      setIsVerified(Boolean(reunion.verifiedAt || reunion.custodyState === "verified"));
      setIsReleased(reunion.custodyState === "released");
      setVerifyError(null);
      setAnswerInput("");
    }
  }, [open, reunion, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!reunion) return null;

  const token = reunion.claimToken;
  const question = reunion.challengeQuestion;

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard?.writeText(token).catch(() => {});
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;
    setSending(true);
    sounds.playSnap();

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      sender: senderRole,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText("");

    try {
      const res = await fetch(`/api/reunions/${reunion._id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, sender: senderRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // revert on network failure
    } finally {
      setSending(false);
    }
  };

  const handleVerifyAnswer = async () => {
    if (!answerInput.trim() || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: answerInput }),
      });
      const data = await res.json();
      if (data.verified) {
        setIsVerified(true);
        sounds.playSnap();
        onReunionUpdated?.();
      } else {
        setVerifyError("Answer didn't match. You can retry or confirm directly with the finder in chat.");
      }
    } catch {
      setVerifyError("Verification request failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDirectFinderConfirm = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/confirm-proof`, {
        method: "POST",
      });
      if (res.ok) {
        setIsVerified(true);
        sounds.playSnap();
        onReunionUpdated?.();
      }
    } catch {
      // ignore
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteHandover = async () => {
    if (completing || isReleased) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/reunions/${reunion._id}/custody`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ custodyState: "released" }),
      });
      if (res.ok) {
        setIsReleased(true);
        sounds.playReunionChime();
        onReunionUpdated?.();
      }
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  };

  const suggestions = [
    "Where can we meet?",
    "I have the item safely with me",
    "Can we meet near 100 Feet Road?",
    "I'm free today around 5 PM",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative flex h-[94vh] sm:h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/98 via-zinc-950/98 to-black/98 shadow-2xl text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                      {reunion.title}
                    </h3>
                    {token && (
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 hover:bg-white/20 transition cursor-pointer"
                        title="Copy claim token"
                      >
                        {token}
                        {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Private Handover Chat · Coordinate meeting & return
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border",
                    isReleased
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
                  )}
                >
                  {isReleased ? "Reunited ✓" : "Active Chat"}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Ownership Challenge Banner */}
            {question && (
              <div className="border-b border-white/5 bg-amber-500/[0.06] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          Ownership Question
                        </span>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 mt-0.5 font-medium">“{question}”</p>
                    </div>
                  </div>

                  {!isVerified && (
                    <button
                      type="button"
                      onClick={handleDirectFinderConfirm}
                      disabled={verifying}
                      className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer shrink-0"
                    >
                      {verifying ? "Checking..." : "Confirm Proof ✓"}
                    </button>
                  )}
                </div>

                {!isVerified && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Answer the question..."
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-400/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleVerifyAnswer();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyAnswer}
                      disabled={verifying || !answerInput.trim()}
                      className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition cursor-pointer disabled:opacity-50"
                    >
                      Check Answer
                    </button>
                  </div>
                )}
                {verifyError && <p className="text-[11px] text-rose-400 mt-1.5">{verifyError}</p>}
              </div>
            )}

            {/* Speaking As Role Switcher */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.015] px-4 py-2 text-xs">
              <span className="text-[11px] text-zinc-400 font-medium">Speaking in chat as:</span>
              <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setSenderRole("owner")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                    senderRole === "owner"
                      ? "bg-emerald-500 text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Owner (Lost Item)
                </button>
                <button
                  type="button"
                  onClick={() => setSenderRole("finder")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                    senderRole === "finder"
                      ? "bg-indigo-500 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  Finder (Has Item)
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-400">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 border border-white/10 mb-3">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200">Private Handover Chat Ready</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mt-1">
                    Say hello to each other! Agree on a nearby cafe, landmark, or convenient time to return the item.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwner = msg.sender === "owner";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex flex-col", isOwner ? "items-end" : "items-start")}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isOwner ? "text-emerald-400" : "text-indigo-400",
                          )}
                        >
                          {isOwner ? "Owner" : "Finder"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md",
                          isOwner
                            ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm"
                            : "bg-gradient-to-br from-indigo-600/90 to-blue-700/90 text-zinc-100 rounded-tl-sm border border-white/10",
                        )}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="border-t border-white/5 bg-white/[0.015] px-4 py-2 overflow-x-auto flex gap-1.5 no-scrollbar">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 text-[11px] text-zinc-300 whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Message Input & Action Bar */}
            <div className="border-t border-white/10 bg-black/60 p-3 sm:p-4 space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Type a message as ${senderRole === "owner" ? "Owner" : "Finder"}...`}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-400/50"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white hover:brightness-110 active:scale-95 transition disabled:opacity-40 cursor-pointer shadow-lg shadow-indigo-950/50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {/* Handover Agreement & Complete Button */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <span>Handover agreed? Finalize reunion:</span>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteHandover}
                  disabled={completing || isReleased}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                    isReleased
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 hover:brightness-110 active:scale-95 shadow-md shadow-emerald-950/40",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isReleased ? "Reunion Complete ✓" : completing ? "Finalizing..." : "Mark Handed Over 🎉"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
