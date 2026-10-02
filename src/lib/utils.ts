/** Small pure helpers shared by the matcher and the UI. No dependencies. */

export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "near", "with", "my",
  "is", "was", "it", "its", "for", "to", "from", "left", "right", "one", "two",
  "three", "four", "five", "very", "around", "about", "please", "help",
]);

export const COLOR_TOKENS = new Set([
  "black", "white", "red", "blue", "green", "grey", "gray", "yellow", "pink",
  "orange", "purple", "brown", "gold", "silver", "beige", "navy", "cream",
  "teal", "maroon",
]);

export const MATERIAL_TOKENS = new Set([
  "leather", "metal", "plastic", "wood", "cotton", "wool", "canvas", "glass",
  "steel", "silicon", "rubber", "denim", "nylon", "paper", "cardboard",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Jaccard similarity over token sets. */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/** Shared structured attributes (color/material overlap) across two items. */
export function sharedAttributes(a: { colors: string[]; materials: string[] }, b: { colors: string[]; materials: string[] }) {
  const colors = a.colors.filter((c) => b.colors.includes(c));
  const materials = a.materials.filter((m) => b.materials.includes(m));
  return { colors, materials };
}

/** Haversine distance in kilometers. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function hoursBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(a - b) / 3_600_000;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
