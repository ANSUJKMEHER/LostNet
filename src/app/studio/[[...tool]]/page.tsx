"use client";

import { NextStudio } from "next-sanity/studio";
import config from "@/../sanity.config";

/**
 * Embedded Sanity Studio at /studio.
 * If the Sanity env vars are missing, show a clear setup note instead of
 * crashing the app — the board itself keeps running on the local provider.
 */
export default function StudioPage() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
  if (!projectId) {
    return (
      <div style={{ padding: 48, fontFamily: "system-ui" }}>
        <h1>Studio not configured</h1>
        <p>
          Set <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>SANITY_API_TOKEN</code> in{" "}
          <code>.env</code>, then restart. Until then the board runs on the seeded local provider.
        </p>
      </div>
    );
  }
  return <NextStudio config={config} />;
}
