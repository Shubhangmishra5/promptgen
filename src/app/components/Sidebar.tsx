"use client";

import { Star, Trash2, X } from "lucide-react";

export type PromptHistoryItem = {
  id: string;
  content: string;
  favorite: boolean;
};

type SidebarProps = {
  history: PromptHistoryItem[];
  onSelect: (prompt: string) => void;
  onToggleFavorite: (id: string) => void;
  onClear: () => void;
  onClose?: () => void;
  className?: string;
};

function snippet(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 140)}...`;
}

export default function Sidebar({
  history,
  onSelect,
  onToggleFavorite,
  onClear,
  onClose,
  className,
}: SidebarProps) {
  const hasHistory = history.length > 0;

  return (
    <aside
      className={`flex h-full flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            History
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {hasHistory
              ? `${history.length} saved prompt${history.length === 1 ? "" : "s"}`
              : "Nothing saved yet"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        onClick={onClear}
        disabled={!hasHistory}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear history
      </button>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {!hasHistory && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            Start generating prompts to build a local history you can reuse later.
          </div>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80"
          >
            <button
              onClick={() => onSelect(item.content)}
              className="text-left text-sm text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              {snippet(item.content) || "(Empty prompt)"}
            </button>
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-amber-600 dark:text-slate-400"
              aria-pressed={item.favorite}
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  item.favorite
                    ? "fill-amber-400 text-amber-500"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
              {item.favorite ? "Favorited" : "Favorite"}
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
