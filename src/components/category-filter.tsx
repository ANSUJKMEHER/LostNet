"use client";

import { useMemo } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  activeCategories: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

export default function CategoryFilter({
  activeCategories,
  onToggle,
  onReset,
  categoryCounts = {},
  totalCount = 0,
}: CategoryFilterProps) {
  const hasActive = activeCategories.size > 0;

  return (
    <div className="pointer-events-auto ln-glass flex max-w-full items-center gap-2 rounded-2xl p-2 shadow-2xl shadow-black/50 border border-white/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* "All" button */}
      <button
        type="button"
        onClick={onReset}
        className={cn(
          "shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 select-none",
          !hasActive
            ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30 border border-indigo-400/40"
            : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 hover:text-white border border-white/10"
        )}
      >
        <span>All</span>
        {totalCount > 0 && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              !hasActive ? "bg-white/20 text-white" : "bg-white/10 text-zinc-300"
            )}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="h-5 w-px bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />

      {/* Categories list */}
      {CATEGORIES.map((cat) => {
        const isActive = activeCategories.has(cat.id);
        const count = categoryCounts[cat.id] ?? 0;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            className={cn(
              "shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 select-none",
              isActive
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30 border border-indigo-400/40"
                : count > 0
                ? "bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 hover:text-white border border-white/15"
                : "bg-zinc-800/50 hover:bg-zinc-700/70 text-zinc-300 hover:text-white border border-white/5 opacity-80 hover:opacity-100"
            )}
          >
            <span aria-hidden className="text-base leading-none drop-shadow-sm">
              {cat.emoji}
            </span>
            <span className="whitespace-nowrap">{cat.title}</span>
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-white/10 text-zinc-200"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* Reset button when filters are active */}
      {hasActive && (
        <>
          <div className="h-5 w-px bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-all select-none"
            title="Clear category filters"
          >
            <span>Clear</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
