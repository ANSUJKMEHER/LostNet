"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  MapPin,
  Megaphone,
  Heart,
  Info,
  X,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Building2,
  Ticket,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import BoardMap, { type MatchFlow } from "@/components/board-map";
import ItemPanel from "@/components/item-panel";
import ReportDialog from "@/components/report-dialog";
import MatchDialog from "@/components/match-dialog";
import CategoryFilter from "@/components/category-filter";
import ManifestoModal from "@/components/manifesto-modal";
import CustodyDeskModal from "@/components/custody-desk-modal";
import ReturnPassModal, { type ReturnPassData } from "@/components/return-pass-modal";
import type { Item, MatchRecord, NewItemInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { sounds } from "@/lib/audio";

interface BoardClientProps {
  items: Item[];
  center: { lat: number; lng: number };
  reunionCount: number;
}

type Notice = { id: number; kind: "none" | "error" | "reunion"; text: string; link?: string } | null;

export default function BoardClient({ items: initialItems, center, reunionCount: initialCount }: BoardClientProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [flow, setFlow] = useState<MatchFlow | null>(null);
  const [matchDialog, setMatchDialog] = useState<{ a: Item; b: Item; match: MatchRecord } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [reunionCount, setReunionCount] = useState(initialCount);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "lost" | "found" | "matched">("all");
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");
  const [manifestoOpen, setManifestoOpen] = useState(false);
  const [custodyDeskOpen, setCustodyDeskOpen] = useState(false);
  const [custodyInitialToken, setCustodyInitialToken] = useState<string | undefined>(undefined);
  const [custodyAutoVerify, setCustodyAutoVerify] = useState(false);
  const [returnPassOpen, setReturnPassOpen] = useState(false);
  const [returnPassData, setReturnPassData] = useState<ReturnPassData | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const timerRef = useRef<number | null>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Simulated Google Auth / Citizen Profile State
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: "citizen" | "volunteer";
    karma: number;
    reunionsAssisted: number;
  } | null>({
    name: "Alex Chen",
    email: "alex.c@lostnet.org",
    role: "citizen",
    karma: 850,
    reunionsAssisted: 4,
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleGoogleSignIn = () => {
    setUser({
      name: "Alex Chen",
      email: "alex.c@lostnet.org",
      role: "citizen",
      karma: 850,
      reunionsAssisted: 4,
    });
    flashNotice({ kind: "none", text: "Signed in as Alex Chen (Google OAuth 2.0 Verified)" });
  };

  const handleSignOut = () => {
    setUser(null);
    setUserMenuOpen(false);
    flashNotice({ kind: "none", text: "Signed out of LostNet." });
  };

  const selected = items.find((i) => i._id === selectedId) ?? null;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const catId = item.categoryId.replace(/^category-/, "");
      counts[catId] = (counts[catId] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const kindCounts = useMemo(() => {
    let lost = 0;
    let found = 0;
    let matched = 0;
    for (const it of items) {
      if (it.status === "matched") matched++;
      else if (it.kind === "lost") lost++;
      else if (it.kind === "found") found++;
    }
    return { lost, found, matched, total: items.length };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Kind filter
      if (kindFilter === "matched") {
        if (item.status !== "matched") return false;
      } else if (kindFilter === "lost") {
        if (item.kind !== "lost" || item.status === "matched") return false;
      } else if (kindFilter === "found") {
        if (item.kind !== "found" || item.status === "matched") return false;
      }

      // Category filter
      if (activeCategories.size > 0) {
        const catId = item.categoryId.replace(/^category-/, "");
        if (!activeCategories.has(catId)) return false;
      }

      // Keyword search
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inPlace = item.placeLabel.toLowerCase().includes(q);
        const inColor = item.colors?.some((c) => c.toLowerCase().includes(q));
        const inMaterial = item.materials?.some((m) => m.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inPlace && !inColor && !inMaterial) return false;
      }

      return true;
    });
  }, [items, kindFilter, activeCategories, searchQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (demoTimerRef.current !== null) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, []);

  const flashNotice = useCallback((n: Omit<NonNullable<Notice>, "id">) => {
    const id = Date.now();
    setNotice({ id, ...n });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setNotice((cur) => (cur?.id === id ? null : cur)), 6000);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/items");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setReunionCount(data.publishedReunions);
    }
  }, []);

  const { isLive } = useLiveUpdates(refresh);

  const beginFlow = useCallback((a: Item, b: Item, match: MatchRecord) => {
    setSelectedId(null);
    setMatchDialog({ a, b, match });
    setFlow({ phase: "pulling", a, b, match });
  }, []);

  const proposeFor = useCallback(
    async (item: Item) => {
      setBusy(true);
      try {
        const res = await fetch("/api/matches/propose", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: item._id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Propose failed");
        if (data.decision.top && data.matches?.[0]) {
          beginFlow(item, data.decision.top.item, data.matches[0]);
        } else {
          flashNotice({ kind: "none", text: "Nothing similar on the board yet — it's listening." });
        }
      } catch (err) {
        flashNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
      } finally {
        setBusy(false);
      }
    },
    [beginFlow, flashNotice],
  );

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setDemoRunning(false);
    setReturnPassOpen(false);
    setCustodyDeskOpen(false);
    setCustodyAutoVerify(false);
  }, []);

  const confirmMatch = useCallback(
    async (details: { safeHarbor: string; timeWindow: string }) => {
      if (!matchDialog) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/matches/${matchDialog.match._id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: "confirmed",
            safeHarbor: details.safeHarbor,
            timeWindow: details.timeWindow,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Confirm failed");
        setItems((cur) =>
          cur.map((i) => (i._id === matchDialog.a._id || i._id === matchDialog.b._id ? { ...i, status: "matched" as const } : i)),
        );
        setReunionCount((c) => c + 1);
        sounds.playReunionChime();
        setMatchDialog(null);
        setFlow(null);

        const rData: ReturnPassData = data.reunion || {
          _id: data.match?._id || "reunion-01",
          title: `${matchDialog.a.title} × ${matchDialog.b.title}`,
          claimToken: "#LN-8492",
          safeHarbor: details.safeHarbor,
          verifiedChallengeProof: matchDialog.a.secretChallenge || matchDialog.b.secretChallenge || "Red 'R' tag",
          custodyState: "deposited",
        };
        setReturnPassData(rData);
        setReturnPassOpen(true);

        flashNotice({
          kind: "reunion",
          text: `Reunited: "${matchDialog.a.title}" & "${matchDialog.b.title}" · Handover at ${details.safeHarbor}`,
          link: "/reunions",
        });
      } catch (err) {
        flashNotice({ kind: "error", text: err instanceof Error ? err.message : "Could not confirm" });
      } finally {
        setBusy(false);
      }
    },
    [matchDialog, flashNotice],
  );

  const advanceDemoStep = useCallback(() => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    if (demoStep === 1) {
      setDemoStep(2);
      const target = items.find((i) => i._id === "lost-01") || items[0];
      if (target) proposeFor(target);
    } else if (demoStep === 2) {
      confirmMatch({
        safeHarbor: "Indiranagar Metro (Gate 2 Customer Desk)",
        timeWindow: "⚡ Express (Within 2 hrs)",
      });
      setDemoStep(3);
    } else if (demoStep === 3) {
      setReturnPassOpen(false);
      setCustodyInitialToken(returnPassData?.claimToken || "#LN-8492");
      setCustodyAutoVerify(true);
      setCustodyDeskOpen(true);
      setDemoStep(4);
    } else if (demoStep === 4) {
      setCustodyDeskOpen(false);
      setDemoStep(5);
    } else {
      stopDemo();
    }
  }, [demoStep, items, proposeFor, confirmMatch, returnPassData, stopDemo]);

  const runTour = useCallback(async () => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setActiveCategories(new Set());
    setKindFilter("all");
    setSearchQuery("");
    setReturnPassOpen(false);
    setCustodyDeskOpen(false);
    setCustodyAutoVerify(false);
    setDemoRunning(true);
    setDemoStep(1);
    sounds.playSnap();

    // Check if lost-01 x found-01 is available
    let target = items.find((i) => i._id === "lost-01" && i.status === "open");
    let candidate = items.find((i) => i._id === "found-01" && i.status === "open");

    // If not, automatically reset the demo dataset to guarantee the 79% clean match
    if (!target || !candidate) {
      flashNotice({ kind: "none", text: "Restoring demo board to guarantee the 79% clean match..." });
      try {
        const res = await fetch("/api/demo/reset", { method: "POST" });
        if (res.ok) {
          const freshRes = await fetch("/api/items");
          const freshData = await freshRes.json();
          setItems(freshData.items);
          setReunionCount(freshData.publishedReunions);
          target = freshData.items.find((i: Item) => i._id === "lost-01");
          candidate = freshData.items.find((i: Item) => i._id === "found-01");
        }
      } catch {
        // ignore
      }
    }

    if (!target) {
      flashNotice({ kind: "error", text: "Could not find a demo item. Please click Reset!" });
      setDemoRunning(false);
      return;
    }

    // Step 1: Select target and trigger spatial resonance
    setSelectedId(target._id);
    flashNotice({ kind: "none", text: `Scanning: "${target.title}" · Detecting neighborhood resonance...` });

    demoTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/matches/propose", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: target!._id }),
        });
        const data = await res.json();
        if (data.decision?.top && data.matches?.[0]) {
          beginFlow(target!, data.decision.top.item, data.matches[0]);

          // Step 2: Show match dialog and explain Safe Harbor selection
          demoTimerRef.current = setTimeout(async () => {
            setDemoStep(2);

            // Auto-confirm match at Indiranagar Metro after 2.8s
            demoTimerRef.current = setTimeout(async () => {
              const matchRecord = data.matches[0];
              const confRes = await fetch(`/api/matches/${matchRecord._id}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  decision: "confirmed",
                  safeHarbor: "Indiranagar Metro (Gate 2 Customer Desk)",
                  timeWindow: "⚡ Express (Within 2 hrs)",
                }),
              });
              const confData = await confRes.json();
              if (confData.match) {
                setItems((cur) =>
                  cur.map((i) =>
                    i._id === target!._id || i._id === data.decision.top.item._id
                      ? { ...i, status: "matched" as const }
                      : i
                  )
                );
                setReunionCount((c) => c + 1);
                sounds.playReunionChime();
                setMatchDialog(null);
                setFlow(null);

                // Step 3: Show Return Pass
                const reunionData: ReturnPassData = confData.reunion || {
                  _id: confData.match._id,
                  title: `${target!.title} × ${data.decision.top.item.title}`,
                  claimToken: "#LN-8492",
                  safeHarbor: "Indiranagar Metro (Gate 2 Customer Desk)",
                  verifiedChallengeProof: target!.secretChallenge || "Red 'R' tag",
                  custodyState: "deposited",
                };
                setReturnPassData(reunionData);
                setReturnPassOpen(true);
                setDemoStep(3);

                // Step 4: After 3.5s, launch Custody Desk Terminal
                demoTimerRef.current = setTimeout(() => {
                  setReturnPassOpen(false);
                  setCustodyInitialToken(reunionData.claimToken);
                  setCustodyAutoVerify(true);
                  setCustodyDeskOpen(true);
                  setDemoStep(4);

                  // Step 5: After 4.5s in Custody Desk, complete tour
                  demoTimerRef.current = setTimeout(() => {
                    setDemoStep(5);
                  }, 4500);
                }, 3500);
              }
            }, 2800);
          }, 2400);
        }
      } catch {
        setDemoRunning(false);
      }
    }, 800);
  }, [items, beginFlow, flashNotice]);

  const rejectMatch = useCallback(async () => {
    if (!matchDialog) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/matches/${matchDialog.match._id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "rejected" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Reject failed");
      }
      setMatchDialog(null);
      setFlow(null);
      flashNotice({ kind: "none", text: "Match dismissed — reports remain open on the board." });
    } catch (err) {
      flashNotice({ kind: "error", text: err instanceof Error ? err.message : "Could not reject" });
    } finally {
      setBusy(false);
    }
  }, [matchDialog, flashNotice]);

  const submitReport = useCallback(
    async (input: NewItemInput) => {
      setBusy(true);
      try {
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Report failed");
        setReportOpen(false);
        setPinMode(false);
        setPin(null);
        setItems((cur) => [data.item, ...cur]);
        if (data.decision.top && data.matches?.[0]) {
          beginFlow(data.item, data.decision.top.item, data.matches[0]);
        } else {
          flashNotice({ kind: "none", text: "Posted. Nothing similar on the board yet — it's listening." });
        }
        await refresh();
      } catch (err) {
        flashNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
      } finally {
        setBusy(false);
      }
    },
    [beginFlow, flashNotice, refresh],
  );

  const openReport = () => {
    setReportOpen(true);
    setPinMode(true);
    setSelectedId(null);
  };

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (pinMode) setPin({ lat, lng });
      else setSelectedId(null);
    },
    [pinMode],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      <BoardMap
        items={filteredItems}
        center={center}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        flow={flow}
        onFlowMerged={() => setFlow((f) => (f ? { ...f, phase: "merged" } : f))}
        pinMode={pinMode}
        onMapClick={onMapClick}
        mapTheme={mapTheme}
        onToggleTheme={() => setMapTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      {/* Bright Auto Demo Spotlight HUD */}
      <AnimatePresence>
        {demoRunning && (
          <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[70] w-[94vw] max-w-xl overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-zinc-950/98 via-zinc-900/98 to-black/98 p-4 sm:p-5 shadow-[0_0_60px_rgba(251,191,36,0.4)] backdrop-blur-2xl text-zinc-100"
          >
            {/* Glowing top beacon */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Autonomous Demo Tour · Stage {demoStep} of 4
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {demoStep < 5 && (
                  <button
                    type="button"
                    onClick={advanceDemoStep}
                    className="flex items-center gap-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-200 transition cursor-pointer"
                  >
                    <span>Next</span>
                    <SkipForward className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopDemo}
                  className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  title="Close Demo Tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 4-Step Visual Progress Tracker */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => {
                const isPassed = demoStep > step;
                const isCurrent = demoStep === step;
                return (
                  <div
                    key={step}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      isPassed
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                        : isCurrent
                        ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse"
                        : "bg-white/10"
                    )}
                  />
                );
              })}
            </div>

            {/* Narrative Content by Stage */}
            <div className="mt-3">
              {demoStep === 1 && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <span>🌟 Autonomous Gravitational Resonance (79%)</span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    “Black Honda key with red tag” automatically senses “Found car key” 153m away on 100 Feet Road.
                    Notice the physics pulling the reports together into midpoint collision on the map.
                  </p>
                </div>
              )}

              {demoStep === 2 && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <span>🏛️ Safe Harbor Selection (Civic Protocol)</span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    Connecting to <strong>Indiranagar Metro (Gate 2 Customer Desk)</strong>. Station officers have existing statutory lost-property duties — LostNet provides the scan-based digital ledger API.
                  </p>
                </div>
              )}

              {demoStep === 3 && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <span>🎟️ Digital Return Pass Issued</span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    Airline-style boarding pass generated with scannable QR and encrypted token <strong className="text-emerald-300 font-mono">#LN-8492</strong>. Zero phone numbers or home addresses are ever exposed.
                  </p>
                </div>
              )}

              {demoStep === 4 && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <span>🏢 Custody Terminal &amp; Split-Knowledge Release</span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    Attendant quizzes the verbal challenge (<em className="text-amber-200">“Red &apos;R&apos; tag”</em>). The terminal cryptographically verifies and completes the sign-off certificate directly into Sanity.
                  </p>
                </div>
              )}

              {demoStep === 5 && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Civic Handover Completed Successfully!
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                    From lost on 100 Feet Road to verified return at Metro Gate 2 in under 60 seconds with zero liability and zero privacy leaks.
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={runTour}
                      className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                    >
                      Replay Demo
                    </button>
                    <button
                      type="button"
                      onClick={stopDemo}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 transition cursor-pointer"
                    >
                      Explore The Board →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex flex-col items-center gap-2.5 p-2.5 sm:p-4 max-w-7xl mx-auto w-full">
        {/* Header row */}
        <header className="flex w-full items-center justify-between gap-2 sm:gap-3 flex-nowrap">
          {/* Logo brand pill + Manifesto button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="pointer-events-auto ln-glass flex items-center gap-2.5 sm:gap-3 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl border border-white/10 select-none">
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span className="absolute h-3 w-3 rounded-full bg-indigo-400" />
                <span className="absolute h-3 w-3 translate-x-3.5 translate-y-2 rounded-full bg-amber-400" />
                <Heart className="absolute h-3.5 w-3.5 translate-x-1.5 translate-y-1 text-rose-400" />
              </span>
              <div>
                <p className="text-base sm:text-lg font-bold leading-none text-zinc-50 tracking-tight">LostNet</p>
                <p className="mt-1 hidden text-xs leading-none text-zinc-400 sm:block">things find their way back</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManifestoOpen(true)}
              className="pointer-events-auto ln-glass hidden lg:flex min-h-[42px] items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 border border-amber-500/25 hover:border-amber-400/50 shadow-lg shadow-amber-950/20 transition cursor-pointer select-none"
              title="The LostNet Paradox & Manifesto"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>✦ Manifesto</span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="pointer-events-auto flex items-center relative min-w-[130px] sm:min-w-[170px] md:min-w-[210px] lg:min-w-[240px] max-w-xs shrink-0 mx-1 sm:mx-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full ln-glass rounded-2xl pl-8 sm:pl-9 pr-7 sm:pr-8 py-2 text-xs sm:text-sm text-white placeholder-zinc-400 border border-white/10 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 shadow-xl transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="hidden md:inline absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono pointer-events-none bg-white/5 border border-white/10 rounded px-1 py-0.2">
                /
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isLive && (
              <div className="ln-glass flex min-h-[42px] items-center gap-1.5 rounded-2xl px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-400 border border-emerald-500/20 shadow-lg select-none">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">Live</span>
              </div>
            )}
            <button
              type="button"
              onClick={runTour}
              className="ln-glass flex min-h-[42px] items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-orange-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400/70 shadow-lg shadow-amber-950/40 hover:shadow-amber-500/20 transition select-none font-bold cursor-pointer"
              title="Run 1-click guided demo tour"
            >
              <Sparkles className="h-4 w-4 text-amber-300 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">Auto Demo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCustodyInitialToken(undefined);
                setCustodyAutoVerify(false);
                setCustodyDeskOpen(true);
              }}
              className="ln-glass flex min-h-[42px] items-center gap-1.5 sm:gap-2 rounded-2xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-400/50 shadow-lg shadow-emerald-950/30 transition select-none font-semibold cursor-pointer"
              title="Open Safe Harbor Custody Desk (Metro / Partner Terminal)"
            >
              <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Custody Desk</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Are you sure you want to reset the demo data?")) return;
                setBusy(true);
                try {
                  const res = await fetch("/api/demo/reset", { method: "POST" });
                  if (res.status === 403) {
                    flashNotice({ kind: "error", text: "Reset only works in demo mode" });
                    return;
                  }
                  if (!res.ok) throw new Error("Reset failed");
                  await refresh();
                  flashNotice({ kind: "none", text: "Demo reset successfully." });
                } catch (err) {
                  flashNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
                } finally {
                  setBusy(false);
                }
              }}
              className="ln-glass flex min-h-[42px] items-center gap-1.5 rounded-2xl px-3 py-2 text-xs sm:text-sm text-zinc-300 transition hover:text-white border border-white/10 shadow-lg font-medium"
              title="Reset seeded demo data"
            >
              <span className="text-sm">🔄</span>
              <span className="hidden lg:inline">Reset</span>
            </button>
            <Link
              href="/reunions"
              className="ln-glass flex min-h-[42px] items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm text-zinc-200 transition hover:text-white border border-white/10 shadow-lg font-medium"
            >
              <Heart className="h-4 w-4 text-rose-300 shrink-0" />
              <span className="hidden md:inline">Reunions</span>
              <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-300">{reunionCount}</span>
            </Link>

            {/* Google / Citizen Auth Pill */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="ln-glass flex min-h-[42px] items-center gap-2 rounded-2xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-zinc-200 transition hover:text-white border border-white/10 hover:border-white/20 shadow-lg cursor-pointer"
                  title="Citizen Profile & Karma"
                >
                  <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-amber-400 p-[1.5px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-900 bg-emerald-400" />
                  </div>
                  <div className="hidden text-left xl:block">
                    <p className="text-xs font-semibold leading-tight text-zinc-100">{user.name}</p>
                    <p className="text-[10px] text-amber-300 font-medium">Lvl 2 Samaritan</p>
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", userMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-2 z-50 w-72 origin-top-right rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl"
                    >
                      {/* Profile Header */}
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-amber-400 p-[2px]">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                            {user.name.charAt(0)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-zinc-100">{user.name}</p>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          </div>
                          <p className="truncate text-xs text-zinc-400">{user.email}</p>
                          <div className="mt-1 flex items-center gap-1">
                            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                            <span className="text-[10px] font-medium text-emerald-400">Google OAuth Verified</span>
                          </div>
                        </div>
                      </div>

                      {/* Karma & Community Stats */}
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Samaritan Karma</span>
                          <span className="mt-0.5 text-xs font-bold text-amber-300">🌟 {user.karma} pts</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Reunions Aided</span>
                          <span className="mt-0.5 text-xs font-bold text-rose-300">♥ {user.reunionsAssisted} returned</span>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Operating Role</p>
                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 border border-white/5">
                          <button
                            type="button"
                            onClick={() => setUser((u) => (u ? { ...u, role: "citizen" } : null))}
                            className={cn(
                              "rounded-lg px-2 py-1.5 text-xs font-medium transition cursor-pointer",
                              user.role === "citizen" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                            )}
                          >
                            Citizen Finder
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUser((u) => (u ? { ...u, role: "volunteer" } : null));
                              setUserMenuOpen(false);
                              setCustodyDeskOpen(true);
                            }}
                            className={cn(
                              "rounded-lg px-2 py-1.5 text-xs font-medium transition cursor-pointer",
                              user.role === "volunteer" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                            )}
                          >
                            Safe Desk
                          </button>
                        </div>
                      </div>

                      {/* Sign out */}
                      <div className="mt-3 border-t border-white/10 pt-2.5">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-rose-300 transition cursor-pointer"
                        >
                          <span>Sign out / Switch account</span>
                          <LogOut className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="ln-glass flex min-h-[42px] items-center gap-2 rounded-2xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 hover:text-white border border-white/10 hover:border-white/25 shadow-lg transition cursor-pointer"
                title="Sign in with Google"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign in</span>
              </button>
            )}

            <button
              type="button"
              onClick={openReport}
              className="flex min-h-[42px] items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:brightness-110 active:scale-95"
            >
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Report Item</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </header>

        {/* Category Filter Dock */}
        <div className="flex w-full flex-col items-center gap-2">
          <CategoryFilter
            activeCategories={activeCategories}
            onToggle={(id) => {
              setActiveCategories((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onReset={() => setActiveCategories(new Set())}
            categoryCounts={categoryCounts}
            totalCount={items.length}
          />

          {/* Active Filter Summary Pill */}
          {(activeCategories.size > 0 || kindFilter !== "all" || searchQuery.trim().length > 0) && (
            <div className="ln-glass pointer-events-auto flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm text-zinc-200 border border-white/10 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>
                Showing <strong className="font-semibold text-white">{filteredItems.length}</strong> of {items.length} reports
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveCategories(new Set());
                  setKindFilter("all");
                  setSearchQuery("");
                }}
                className="ml-1 text-zinc-400 hover:text-rose-300 font-medium underline underline-offset-2 transition"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Legend with Live Filtering */}
      <div className="ln-glass pointer-events-auto absolute bottom-5 left-4 z-[5] flex items-center gap-1.5 rounded-2xl p-1.5 text-xs sm:text-sm text-zinc-200 shadow-xl border border-white/10 select-none">
        <button
          type="button"
          onClick={() => setKindFilter((k) => (k === "lost" ? "all" : "lost"))}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 transition-all font-medium",
            kindFilter === "lost"
              ? "bg-indigo-500/30 text-white font-semibold border border-indigo-400/50 shadow-sm"
              : "hover:bg-white/10 text-zinc-300"
          )}
          title="Filter by lost items"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
          <span>Lost</span>
          <span className="text-xs font-bold text-zinc-400 tabular-nums">({kindCounts.lost})</span>
        </button>
        <button
          type="button"
          onClick={() => setKindFilter((k) => (k === "found" ? "all" : "found"))}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 transition-all font-medium",
            kindFilter === "found"
              ? "bg-amber-500/30 text-white font-semibold border border-amber-400/50 shadow-sm"
              : "hover:bg-white/10 text-zinc-300"
          )}
          title="Filter by found items"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span>Found</span>
          <span className="text-xs font-bold text-zinc-400 tabular-nums">({kindCounts.found})</span>
        </button>
        <button
          type="button"
          onClick={() => setKindFilter((k) => (k === "matched" ? "all" : "matched"))}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 transition-all font-medium",
            kindFilter === "matched"
              ? "bg-rose-500/30 text-white font-semibold border border-rose-400/50 shadow-sm"
              : "hover:bg-white/10 text-zinc-300"
          )}
          title="Filter by reunited items"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span>Reunited</span>
          <span className="text-xs font-bold text-zinc-400 tabular-nums">({kindCounts.matched})</span>
        </button>
        {kindFilter !== "all" && (
          <button
            type="button"
            onClick={() => setKindFilter("all")}
            className="ml-0.5 text-zinc-400 hover:text-white p-1.5 transition"
            title="Clear kind filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Empty Board Notice */}
      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center p-4">
          <div className="ln-glass pointer-events-auto max-w-sm rounded-2xl p-6 text-center shadow-2xl border border-white/10">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15">
              <Search className="h-5 w-5 text-indigo-300" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-100">Nothing reported yet</p>
            <p className="mt-1 text-xs text-zinc-400">
              The board is quiet. Drop a report to pin the first lost or found item.
            </p>
            <button
              type="button"
              onClick={openReport}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Report something
            </button>
          </div>
        </div>
      )}

      {/* Slide-out item details panel */}
      <AnimatePresence>
        {selected && (
          <ItemPanel
            item={selected}
            onClose={() => setSelectedId(null)}
            onPropose={() => proposeFor(selected)}
            busy={busy}
          />
        )}
      </AnimatePresence>

      {/* Report dialog */}
      <ReportDialog
        open={reportOpen}
        pin={pin}
        busy={busy}
        onClose={() => {
          setReportOpen(false);
          setPinMode(false);
          setPin(null);
        }}
        onSubmit={submitReport}
      />

      {/* Match proposal & confirm dialog */}
      <MatchDialog
        open={Boolean(matchDialog)}
        a={matchDialog?.a ?? null}
        b={matchDialog?.b ?? null}
        match={matchDialog?.match ?? null}
        busy={busy}
        onConfirm={confirmMatch}
        onReject={rejectMatch}
        onClose={() => {
          setMatchDialog(null);
          setFlow(null);
        }}
      />

      {/* Floating toast notification */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="pointer-events-none absolute bottom-6 inset-x-0 z-[10] flex justify-center px-4"
          >
            <div className="ln-glass pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm shadow-2xl border border-white/10 font-medium">
              {notice.kind === "reunion" ? (
                <Heart className="h-4.5 w-4.5 text-rose-400 shrink-0" />
              ) : notice.kind === "error" ? (
                <Info className="h-4.5 w-4.5 text-amber-400 shrink-0" />
              ) : (
                <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
              )}
              <span className="text-zinc-200">{notice.text}</span>
              {notice.link && (
                <Link href={notice.link} className="font-semibold text-rose-300 underline underline-offset-2 hover:text-rose-200 ml-1">
                  View →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Pass Modal (Airline Boarding Pass UX) */}
      <ReturnPassModal
        open={returnPassOpen}
        onClose={() => setReturnPassOpen(false)}
        data={returnPassData}
        onOpenCustodyDesk={(token) => {
          setCustodyInitialToken(token);
          setCustodyAutoVerify(demoRunning);
          setCustodyDeskOpen(true);
        }}
      />

      {/* Manifesto / Philosophy Modal */}
      <ManifestoModal open={manifestoOpen} onClose={() => setManifestoOpen(false)} />

      {/* Safe Harbor Custody Desk Modal */}
      <CustodyDeskModal
        open={custodyDeskOpen}
        onClose={() => {
          setCustodyDeskOpen(false);
          setCustodyAutoVerify(false);
        }}
        initialToken={custodyInitialToken}
        autoVerifyDemo={custodyAutoVerify}
        onReunionUpdated={refresh}
      />
    </div>
  );
}
