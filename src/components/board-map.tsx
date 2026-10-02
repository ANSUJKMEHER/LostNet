"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Search, Plus, Minus, Compass, Sun, Moon, Volume2, VolumeX } from "lucide-react";
import type { Item, MatchRecord } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/audio";

export const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

export function CategoryChip({ categoryId, className }: { categoryId: string; className?: string }) {
  const cat = getCategory(categoryId.replace(/^category-/, ""));
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300", className)}>
      <span aria-hidden>{cat.emoji}</span>
      <span>{cat.title}</span>
    </span>
  );
}

export interface MatchFlow {
  phase: "pulling" | "merged";
  a: Item;
  b: Item;
  match: MatchRecord;
}

interface BoardMapProps {
  items: Item[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  flow: MatchFlow | null;
  onFlowMerged: () => void;
  pinMode: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  mapTheme?: "dark" | "light";
  onToggleTheme?: () => void;
}

type Pixel = { x: number; y: number };

interface Projector {
  project(lat: number, lng: number): Pixel;
  unproject(x: number, y: number): { lat: number; lng: number };
}

/** Fallback projector: equirectangular around the board center, scaled so the
 *  items' bounding box fills the viewport. Used when WebGL is unavailable. */
function makeFallbackProjector(
  center: { lat: number; lng: number },
  w: number,
  h: number,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): Projector {
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const latSpan = Math.max(bbox.maxLat - bbox.minLat, 0.004);
  const lngSpan = Math.max(bbox.maxLng - bbox.minLng, 0.004);
  const scaleLat = (h * 0.72) / latSpan;
  const scaleLng = (w * 0.72) / lngSpan;
  const pxPerDegLat = Math.min(scaleLat, scaleLng * cosLat);
  const pxPerDegLng = pxPerDegLat / cosLat;
  return {
    project: (lat, lng) => ({
      x: (lng - center.lng) * pxPerDegLng + w / 2,
      y: (center.lat - lat) * pxPerDegLat + h / 2,
    }),
    unproject: (x, y) => ({
      lat: center.lat - (y - h / 2) / pxPerDegLat,
      lng: center.lng + (x - w / 2) / pxPerDegLng,
    }),
  };
}

function itemsBbox(items: Item[]) {
  const bbox = { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity };
  for (const it of items) {
    bbox.minLat = Math.min(bbox.minLat, it.location.lat);
    bbox.maxLat = Math.max(bbox.maxLat, it.location.lat);
    bbox.minLng = Math.min(bbox.minLng, it.location.lng);
    bbox.maxLng = Math.max(bbox.maxLng, it.location.lng);
  }
  return bbox;
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function BoardMap({
  items,
  center,
  selectedId,
  onSelect,
  flow,
  onFlowMerged,
  pinMode,
  onMapClick,
  mapTheme = "dark",
  onToggleTheme,
}: BoardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const projectorRef = useRef<Projector | null>(null);
  const [mode, setMode] = useState<"map" | "fallback">("map");
  const [positions, setPositions] = useState<Record<string, Pixel>>({});
  const [flowPixels, setFlowPixels] = useState<{ a: Pixel; b: Pixel } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const rafRef = useRef<number>(0);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const projectAll = () => {
    const projector = projectorRef.current;
    if (!projector) return;
    const next: Record<string, Pixel> = {};
    for (const it of itemsRef.current) {
      next[it._id] = projector.project(it.location.lat, it.location.lng);
    }
    setPositions(next);
  };

  // Switch map theme dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === "fallback") return;
    const styleUrl = MAP_STYLES[mapTheme] ?? MAP_STYLES.dark;
    try {
      map.setStyle(styleUrl);
    } catch {
      // ignore style swap error if unmounted
    }
  }, [mapTheme, mode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let cleanupMap: (() => void) | null = null;

    const enterFallback = () => {
      if (disposed) return;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Ignore if unmounted before style initialized
        }
        mapRef.current = null;
      }
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      projectorRef.current = makeFallbackProjector(
        center,
        rect.width,
        rect.height,
        itemsBbox(itemsRef.current),
      );
      setMode("fallback");
      projectAll();
    };

    if (!detectWebGL()) {
      enterFallback();
      const onResize = () => {
        const wrap = wrapperRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        projectorRef.current = makeFallbackProjector(
          center,
          rect.width,
          rect.height,
          itemsBbox(itemsRef.current),
        );
        projectAll();
      };
      window.addEventListener("resize", onResize);
      return () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
      };
    }

    try {
      const initialStyle = MAP_STYLES[mapTheme] ?? MAP_STYLES.dark;
      const map = new maplibregl.Map({
        container: el,
        style: initialStyle,
        center: [center.lng, center.lat],
        zoom: 13.6,
        attributionControl: false,
      });
      mapRef.current = map;

      const projectFromMap = (lat: number, lng: number): Pixel => {
        const p = map.project([lng, lat]);
        return { x: p.x, y: p.y };
      };
      const unprojectFromMap = (x: number, y: number) => {
        const ll = map.unproject([x, y]);
        return { lat: ll.lat, lng: ll.lng };
      };

      projectorRef.current = { project: projectFromMap, unproject: unprojectFromMap };
      const bbox = itemsBbox(itemsRef.current);
      if (bbox.minLat !== Infinity) {
        map.fitBounds(
          [
            [bbox.minLng, bbox.minLat],
            [bbox.maxLng, bbox.maxLat],
          ],
          { padding: 70, duration: 0 },
        );
      }
      projectAll();

      let loaded = false;
      const failTimer = window.setTimeout(() => {
        if (!loaded && !disposed) enterFallback();
      }, 4000);

      const schedule = () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(projectAll);
      };

      map.on("load", () => {
        if (disposed) return;
        loaded = true;
        window.clearTimeout(failTimer);
        projectorRef.current = { project: projectFromMap, unproject: unprojectFromMap };
        projectAll();
      });

      map.on("style.load", () => {
        if (disposed) return;
        projectorRef.current = { project: projectFromMap, unproject: unprojectFromMap };
        projectAll();
      });

      map.on("move", schedule);
      map.on("error", () => {
        enterFallback();
      });
      map.on("click", (e) => onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng));

      cleanupMap = () => {
        window.clearTimeout(failTimer);
        try {
          map.remove();
        } catch {
          // MapLibre throws if unmounted before internal style finishes initializing
        }
        mapRef.current = null;
      };
    } catch {
      enterFallback();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      try {
        cleanupMap?.();
      } catch {
        // Guard against any unhandled cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-project whenever items change
  useEffect(() => {
    projectAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Magnetize overlay
  useEffect(() => {
    if (!flow || flow.phase !== "pulling") return;
    const a = positions[flow.a._id];
    const b = positions[flow.b._id];
    if (!a || !b) return;
    setFlowPixels({ a, b });
    sounds.playMagneticHum(900);
  }, [flow, positions]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapClickRef.current || mode !== "fallback") return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const projector = projectorRef.current;
    if (!projector) return;
    const ll = projector.unproject(x, y);
    onMapClickRef.current(ll.lat, ll.lng);
  };

  return (
    <div
      ref={wrapperRef}
      onClick={handleContainerClick}
      className={cn(
        "absolute inset-0",
        mode === "fallback" && "ln-board-grid",
        pinMode && "ln-map-cursor-pin",
      )}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Item markers with Category Emojis and Hover Micro-Cards */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        {items.map((item) => {
          const pos = positions[item._id];
          if (!pos) return null;
          const selected = item._id === selectedId;
          const isFlowItem = flow && (flow.a._id === item._id || flow.b._id === item._id);
          const isHovered = hoveredId === item._id;
          const cat = getCategory(item.categoryId.replace(/^category-/, ""));

          return (
            <motion.div
              key={item._id}
              initial={false}
              animate={{
                x: pos.x - 22,
                y: pos.y - 22,
                scale: selected ? 1.25 : isHovered ? 1.15 : 1,
                opacity: isFlowItem ? 0.25 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto absolute top-0 left-0 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item._id === selectedId ? null : item._id);
              }}
              onMouseEnter={() => setHoveredId(item._id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === item._id ? null : cur))}
              aria-label={item.title}
            >
              <div className="relative flex h-11 w-11 items-center justify-center">
                {/* Pulsing Aura */}
                <span
                  className={cn(
                    "ln-marker-pulse pointer-events-none absolute inset-0 rounded-full",
                    item.status === "matched"
                      ? "bg-rose-500/40"
                      : item.kind === "lost"
                      ? "bg-indigo-500/40"
                      : "bg-amber-500/40"
                  )}
                />

                {/* Tactile Pin Disc */}
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full border-2 transition-all duration-200 shadow-xl",
                    item.status === "matched"
                      ? "bg-zinc-950/90 border-rose-400 text-rose-300 shadow-rose-950/50"
                      : item.kind === "lost"
                      ? "bg-zinc-950/90 border-indigo-400 text-indigo-300 shadow-indigo-950/50"
                      : "bg-zinc-950/90 border-amber-400 text-amber-300 shadow-amber-950/50"
                  )}
                >
                  <span className="text-xl leading-none drop-shadow-sm select-none">
                    {item.status === "matched" ? "❤️" : cat.emoji}
                  </span>
                </span>

                {/* Status Indicator Pip */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 shadow-sm",
                    item.status === "matched"
                      ? "bg-rose-500"
                      : item.kind === "lost"
                      ? "bg-indigo-500"
                      : "bg-amber-500"
                  )}
                />
              </div>

              {/* Hover Micro-Card Tooltip */}
              <AnimatePresence>
                {isHovered && !selected && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 ln-glass rounded-2xl p-3 shadow-2xl border border-white/20 text-left z-30"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                          item.status === "matched"
                            ? "bg-rose-500/25 text-rose-300"
                            : item.kind === "lost"
                            ? "bg-indigo-500/25 text-indigo-300"
                            : "bg-amber-500/25 text-amber-300"
                        )}
                      >
                        {item.status === "matched" ? "Reunited" : item.kind}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium truncate">{cat.title}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
                    <p className="text-xs text-zinc-400 truncate mt-1">{item.placeLabel}</p>
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-indigo-300 font-semibold">
                      <span>Click to match</span>
                      <span>→</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Magnetize Overlay */}
      <AnimatePresence>
        {flow && flow.phase === "pulling" && flowPixels && (
          <motion.div
            key={`pull-${flow.match._id}`}
            className="pointer-events-none absolute inset-0 z-[3]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute top-0 left-0 h-6 w-6 rounded-full bg-indigo-400 shadow-[0_0_24px_6px_rgba(129,140,248,0.7)]"
              initial={{ x: flowPixels.a.x - 12, y: flowPixels.a.y - 12 }}
              animate={{ x: (flowPixels.a.x + flowPixels.b.x) / 2 - 12, y: (flowPixels.a.y + flowPixels.b.y) / 2 - 12 }}
              transition={{ duration: 0.9, ease: [0.34, 1.2, 0.5, 1] }}
            />
            <motion.div
              className="absolute top-0 left-0 h-6 w-6 rounded-full bg-amber-400 shadow-[0_0_24px_6px_rgba(251,191,36,0.7)]"
              initial={{ x: flowPixels.b.x - 12, y: flowPixels.b.y - 12 }}
              animate={{ x: (flowPixels.a.x + flowPixels.b.x) / 2 - 12, y: (flowPixels.a.y + flowPixels.b.y) / 2 - 12 }}
              transition={{ duration: 0.9, ease: [0.34, 1.2, 0.5, 1] }}
            />
            <motion.div
              className="absolute top-0 left-0"
              initial={{ x: (flowPixels.a.x + flowPixels.b.x) / 2 - 32, y: (flowPixels.a.y + flowPixels.b.y) / 2 - 32, scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.85, duration: 0.35, ease: "backOut" }}
              onAnimationComplete={() => {
                sounds.playSnap();
                setFlowPixels(null);
                onFlowMerged();
              }}
            >
              <span className="ln-burst block h-16 w-16 rounded-full bg-rose-400/60" />
              <span className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-rose-200 drop-shadow" />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Floating Glass Map Controls */}
      <div className="pointer-events-auto absolute bottom-5 right-4 z-[5] flex flex-col gap-1.5 ln-glass p-1.5 rounded-2xl shadow-xl border border-white/10">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="h-px w-full bg-white/10 my-0.5" />
        <button
          type="button"
          onClick={() => {
            const bbox = itemsBbox(itemsRef.current);
            if (bbox.minLat !== Infinity) {
              mapRef.current?.fitBounds(
                [
                  [bbox.minLng, bbox.minLat],
                  [bbox.maxLng, bbox.maxLat],
                ],
                { padding: 70, duration: 800 }
              );
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
          title="Recenter all reports"
          aria-label="Recenter map"
        >
          <Compass className="h-4 w-4" />
        </button>
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
            title={mapTheme === "dark" ? "Switch to light map" : "Switch to dark map"}
            aria-label="Toggle map theme"
          >
            {mapTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-300" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const next = sounds.toggleMute();
            setIsMuted(next);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition"
          title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
          aria-label="Toggle audio"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-zinc-500" />
          ) : (
            <Volume2 className="h-4 w-4 text-emerald-400" />
          )}
        </button>
      </div>
    </div>
  );
}
