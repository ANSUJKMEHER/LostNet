"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, UploadCloud, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { NewItemInput } from "@/lib/types";
import { COLOR_TOKENS, cn } from "@/lib/utils";

interface ReportDialogProps {
  open: boolean;
  pin: { lat: number; lng: number } | null;
  onClose: () => void;
  onSubmit: (input: NewItemInput) => Promise<void>;
  busy: boolean;
}

const COLOR_CHOICES = ["black", "white", "red", "blue", "green", "grey", "yellow", "brown", "silver", "gold", "orange", "pink"];
const MATERIAL_CHOICES = ["leather", "metal", "plastic", "cotton", "wool", "canvas", "glass", "paper"];

export default function ReportDialog({ open, pin, onClose, onSubmit, busy }: ReportDialogProps) {
  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("other");
  const [placeLabel, setPlaceLabel] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [secretChallenge, setSecretChallenge] = useState("");
  const [handoverNote, setHandoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImageUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setPlaceLabel("");
    setOccurredAt("");
    setColors([]);
    setMaterials([]);
    setImageUrl("");
    setSecretChallenge("");
    setHandoverNote("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !pin || !occurredAt) {
      setError("Title, description, a pinned location and a time are required.");
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
      secretChallenge: secretChallenge.trim() || undefined,
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
            className="ln-glass flex h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-none p-5 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">Report something</h2>
              <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 sm:h-8 sm:w-8" aria-label="Close">
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
                placeholder="Anything distinctive — color, scratches, what was inside…"
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
                <p className="text-xs font-medium text-zinc-500">Colors (optional)</p>
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

              {/* Photo Evidence with Direct Upload / Drag-and-Drop / Samples */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">Photo Evidence (optional)</label>
                  <span className="text-[11px] text-zinc-500">Drag & drop or Click to upload</span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="mt-1.5 relative h-36 w-full rounded-2xl overflow-hidden border border-white/20 bg-black/50 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Item preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="rounded-xl bg-rose-500/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition"
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
                      if (file) handleFileUpload(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition",
                      isDragging
                        ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                        : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:bg-white/10",
                    )}
                  >
                    <UploadCloud className="h-6 w-6 text-indigo-400 mb-1" />
                    <p className="text-xs font-semibold text-zinc-200">
                      Upload from phone / computer or drag & drop
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">PNG, JPG, WebP up to 10MB</p>
                  </div>
                )}

                {/* Sample Preset Chips for 1-Click Demo */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Presets:
                  </span>
                  {[
                    { label: "🔑 Honda Key", url: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&auto=format&fit=crop&q=80" },
                    { label: "🎧 Earbud", url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80" },
                    { label: "🎒 Grey Bag", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="rounded-full bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-400/40 px-2.5 py-0.5 text-[11px] text-zinc-300 hover:text-indigo-200 transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ownership Proof Question */}
              <div>
                <label className="text-xs font-medium text-zinc-400">🛡️ Proof of Ownership Challenge (optional)</label>
                <input
                  type="text"
                  value={secretChallenge}
                  onChange={(e) => setSecretChallenge(e.target.value)}
                  placeholder="e.g. What color is the keychain tag or sticker on back?"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-400 focus:outline-none"
                />
                <p className="mt-0.5 text-[11px] text-zinc-500">A secret question only the true owner can answer to verify ownership.</p>
              </div>

              {/* Safe Handover Note */}
              <div>
                <label className="text-xs font-medium text-zinc-400">📍 Safe Handover Coordination (optional)</label>
                <input
                  type="text"
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="e.g. Left with manager at cafe; or Metro station pickup"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-400 focus:outline-none"
                />
                <p className="mt-0.5 text-[11px] text-zinc-500">Pickup or locker instructions revealed upon verified match.</p>
              </div>

              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
                  pin ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-dashed border-white/20 text-zinc-500",
                )}
              >
                <MapPin className="h-4 w-4" />
                {pin ? "Location pinned — click the map to move it" : "Click the map to pin the exact spot"}
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Posting…" : kind === "lost" ? "Post it on the board" : "Post it on the board"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
