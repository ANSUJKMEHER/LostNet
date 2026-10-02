import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { workflow } from "sanity-plugin-workflow";
import { schemaTypes } from "./src/sanity/schema";

/**
 * Embedded Studio config. Loads when the Sanity env vars are present;
 * the /studio route renders a friendly "not configured" state otherwise.
 *
 * WORKFLOW NOTE — the Kanban board below is a *visualisation*, nothing more.
 * The plugin stores workflow state in its own metadata documents and enforces
 * nothing. The single authority that may transition a match is
 * /api/matches/[id] (see src/app/api/matches/[id]/route.ts), which rejects any
 * re-decision of an already decided match with HTTP 409. Do not add a second
 * write path: dragging a card in Studio must never be the thing that reunites
 * two items.
 */
export default defineConfig({
  name: "lostnet",
  title: "LostNet",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID ?? "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",
  plugins: [
    structureTool(),
    visionTool(),
    workflow({
      schemaTypes: ["match"],
      states: [
        { id: "proposed", title: "Proposed", color: "warning", transitions: ["pendingReview", "confirmed", "rejected"] },
        { id: "pendingReview", title: "Pending review", color: "primary", transitions: ["confirmed", "rejected"] },
        { id: "confirmed", title: "Confirmed", color: "success", transitions: [] },
        { id: "rejected", title: "Rejected", color: "danger", transitions: [] },
      ],
    }),
  ],
  schema: { types: schemaTypes },
});
