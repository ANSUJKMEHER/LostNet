import { haversineKm } from "./utils";
import type { GeoPoint, HandoverMode } from "./types";

/**
 * Handover places.
 *
 * These are *suggestions computed from where the item was found*, not a fixed
 * menu: the board sorts them by distance so the finder is offered the closest
 * real desks first. A finder can always ignore them and drop a pin anywhere,
 * or simply keep the item and coordinate with the owner through the claim
 * token — which is the most common real-world outcome and is supported as a
 * first-class mode rather than being forced into a fake "safe harbor".
 *
 * Coordinates are real locations in Indiranagar, Bengaluru (the demo
 * neighbourhood) so distance sorting produces sensible answers.
 */
export interface PublicHandoverPlace {
  id: string;
  label: string;
  detail: string;
  kind: "civic" | "police" | "partner";
  location: GeoPoint;
}

export const PUBLIC_HANDOVER_PLACES: PublicHandoverPlace[] = [
  {
    id: "metro-gate2",
    label: "Indiranagar Metro Station — Gate 2",
    detail: "Customer care desk inside the concourse. Open with metro hours.",
    kind: "civic",
    location: { lat: 12.9784, lng: 77.6389 },
  },
  {
    id: "police-kiosk",
    label: "Indiranagar Police Station",
    detail: "Front desk. Accepts high-value items and gives a counter receipt.",
    kind: "police",
    location: { lat: 12.9716, lng: 77.6387 },
  },
  {
    id: "cmh-junction",
    label: "CMH Road / 100 Feet Road junction",
    detail: "Busy public corner with shops on all sides. Good for a quick handover.",
    kind: "partner",
    location: { lat: 12.9745, lng: 77.6368 },
  },
  {
    id: "defence-colony",
    label: "Defence Colony park gate",
    detail: "Open, well-lit entrance. Street-facing and easy to find.",
    kind: "partner",
    location: { lat: 12.9677, lng: 77.6351 },
  },
  {
    id: "sony-signal",
    label: "Sony World Signal, 100 Feet Road",
    detail: "High-footfall junction. Visible from the main road.",
    kind: "partner",
    location: { lat: 12.9731, lng: 77.6415 },
  },
];

/** Closest places first — the board suggests, the people decide. */
export function nearestHandoverPlaces(origin: GeoPoint | null, limit = 3): PublicHandoverPlace[] {
  const sorted = [...PUBLIC_HANDOVER_PLACES];
  if (origin) {
    sorted.sort((a, b) => haversineKm(origin, a.location) - haversineKm(origin, b.location));
  }
  return sorted.slice(0, limit);
}

export const HANDOVER_MODE_LABELS: Record<HandoverMode, string> = {
  public: "A suggested public place",
  map: "A place we pick on the map",
  finder: "The finder keeps it until claimed",
};

export const HANDOVER_TIME_OPTIONS = [
  "As soon as we can",
  "Later today",
  "Tomorrow",
  "We'll agree in chat",
] as const;
