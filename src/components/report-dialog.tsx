"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, UploadCloud, LocateFixed, Package } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { NewItemInput } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReportDialogProps {
  open: boolean;
  pin: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: (input: NewItemInput) => Promise<void>;
  busy: boolean;
  /** Hides the form so the map behind it is tappable. */
  onRequestMapPick?: () => void;
  /** Drops the pin at the device's current position. */
  onUseMyLocation?: (lat: number, lng: number) => void;
}

const COLOR_CHOICES = ["black", "white", "red", "blue", "green", "grey", "yellow", "brown", "silver", "gold", "orange", "pink"];
const MATERIAL_CHOICES = ["leather", "metal", "plastic", "cotton", "wool", "canvas", "glass", "paper"];

/** Downscale + re-encode so a phone photo doesn't become a multi-megabyte string. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a readable image."));
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process that image."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ReportDialog({
  open,
  pin,
  onClose,
  onSubmit,
  busy,
  onRequestMapPick,
  onUseMyLocation,
}: ReportDialogProps) {
  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("other");
  const [placeLabel, setPlaceLabel] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [handoverAction, setHandoverAction] = useState<"dropped" | "holding" | "left" | "">("")
  const [handoverNote, setHandoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      if (compressed.length > 500_000) {
        setError("That photo is still too large after resizing. Try a smaller one.");
        return;
      }
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setPlaceLabel("");
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setOccurredAt(now.toISOString().slice(0, 16));
    setColors([]);
    setMaterials([]);
    setImageUrl("");
    setHandoverNote("");
    setHandoverAction("");
    setError(null);
    setGeoError(null);
  };

  const useMyLocation = () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("This browser can't share a location. Tap the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUseMyLocation?.(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Tap the map instead."
            : "Couldn't get your location. Tap the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Please enter a title for the item.");
      return;
    }
    if (!description.trim()) {
      setError("Please add a description so others can identify it.");
      return;
    }
    if (!pin) {
      setError("Please pin the location on the map or tap 'Use my current location'.");
      return;
    }
    if (!occurredAt) {
      setError("Please specify approximately when this happened.");
      return;
    }
    if (kind === "found" && !handoverAction) {
      setError("Please tell us what you did with the item (kept it safe, left at police station, etc.).");
      return;
    }
    await onSubmit({
      kind,
      title,
      description,
      categoryId,
      placeLabel: placeLabel.trim() || "Pinned on the map",
      lat: pin.lat,
      lng: pin.lng,
      occurredAt: new Date(occurredAt).toISOString(),
      colors,
      materials,
      imageUrl: imageUrl.trim() || undefined,
      handoverNote: handoverNote.trim() || undefined,
    });
    reset();
  };

  return (
    <AnimatePresence>
      {open && (
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
            className="ln-glass flex h-[96dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">Report something</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 sm:h-8 sm:w-8"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* kind toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
              {(["lost", "found"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                    kind === k
                      ? k === "lost"
                        ? "bg-indigo-500 text-white shadow"
                        : "bg-amber-500 text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  I {k === "lost" ? "lost" : "found"} it
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is it? (e.g. Black Honda key with a red tag)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-400/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything distinctive — colour, scratches, what was inside…"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-400/50"
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-400/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.title}
                  </option>
                ))}
              </select>
              <input
                value={placeLabel}
                onChange={(e) => setPlaceLabel(e.target.value)}
                placeholder="Where? (e.g. 100 Feet Road, near the café)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-400/50"
              />

              {/* Location */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-medium text-zinc-400">Where exactly</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-3 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-50"
                  >
                    <LocateFixed className={cn("h-4 w-4", locating && "animate-spin")} />
                    {locating ? "Finding you…" : "Use my current location"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestMapPick?.()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
                  >
                    <MapPin className="h-4 w-4" />
                    Pick on the map
                  </button>
                </div>
                {geoError && <p className="mt-2 text-[11px] text-amber-400">{geoError}</p>}
                <div
                  className={cn(
                    "mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    pin
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-dashed border-white/20 text-zinc-500",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {pin
                    ? `Pinned at ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)} — use the map to move it`
                    : "No location yet — use your current location or pick a point on the map"}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500">When did this happen?</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-400/50 [color-scheme:dark]"
                />
              </div>

              {/* attributes */}
              <div>
                <p className="text-xs font-medium text-zinc-500">Colours (optional)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {COLOR_CHOICES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggle(colors, setColors, c)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        colors.includes(c)
                          ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                          : "border-white/10 text-zinc-400 hover:border-white/25",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500">Materials (optional)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {MATERIAL_CHOICES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggle(materials, setMaterials, m)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        materials.includes(m)
                          ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200"
                          : "border-white/10 text-zinc-400 hover:border-white/25",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">Photo (optional)</label>
                  <span className="text-[11px] text-zinc-500">Resized automatically</span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="relative mt-1.5 h-36 w-full overflow-hidden rounded-2xl border border-white/20 bg-black/50 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Item preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/30"
                      >
                        Change photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="rounded-xl bg-rose-500/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-rose-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleFileUpload(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition",
                      isDragging
                        ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                        : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:bg-white/10",
                    )}
                  >
                    <UploadCloud className="mb-1 h-6 w-6 text-indigo-400" />
                    <p className="text-xs font-semibold text-zinc-200">Upload a photo or drag one in</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">PNG, JPG or WebP</p>
                  </div>
                )}
              </div>

              {/* What did you do with it? — only for found items */}
              {kind === "found" && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                    <Package className="h-3.5 w-3.5" />
                    What did you do with it?
                  </label>
                  <div className="mt-2 space-y-2">
                    {[
                      { id: "dropped" as const, label: "🏛️ Dropped it at a known place", hint: "Police station, metro desk, a shop…" },
                      { id: "holding" as const, label: "🤲 I'm keeping it safe", hint: "You'll give it to whoever proves it's theirs" },
                      { id: "left" as const, label: "📍 Left it where I found it", hint: "It's still at the spot" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setHandoverAction(opt.id);
                          if (opt.id === "left") setHandoverNote("Left where it was found");
                          else if (opt.id === "holding") setHandoverNote("The finder is keeping it safe");
                          else setHandoverNote("");
                        }}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 text-left transition",
                          handoverAction === opt.id
                            ? "border-amber-400 bg-amber-500/15 text-amber-100"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25",
                        )}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                  {handoverAction === "dropped" && (
                    <input
                      type="text"
                      value={handoverNote}
                      onChange={(e) => setHandoverNote(e.target.value)}
                      placeholder="Where did you leave it? e.g. Indiranagar Metro lost & found desk"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-400/60 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Posting…" : "Post it on the board"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
