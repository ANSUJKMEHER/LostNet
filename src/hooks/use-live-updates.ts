"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@sanity/client";

export function useLiveUpdates(onUpdate: () => void) {
  const [isLive, setIsLive] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

    if (!projectId || !dataset) {
      return;
    }

    const client = createClient({
      projectId,
      dataset,
      apiVersion: "2024-01-01",
      useCdn: false,
    });

    setIsLive(true);

    const subscription = client.listen('*[_type in ["lostFoundItem", "match", "reunion"]]').subscribe(() => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        onUpdate();
      }, 500);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [onUpdate]);

  return { isLive };
}
