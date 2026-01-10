"use client";

import { useEffect, useState } from "react";

type PromptItem = {
  id: string;
  content: string;
  favorite: boolean;
};

export default function Sidebar({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  const [history, setHistory] = useState<PromptItem[]>([]);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("prompt-history") || "[]"
    );

    // 🔄 MIGRATE old string-based history to object format
    const normalized = stored.map((item: any) => {
      if (typeof item === "string") {
        return {
          id: Date.now().toString() + Math.random(),
          content: item,
          favorite: false,
        };
      }
      return item;
    });

    setHistory(normalized);
    localStorage.setItem("prompt-history", JSON.stringify(normalized));
  }, []);


  function toggleFavorite(id: string) {
    const updated = history.map((item) =>
      item.id === id
        ? { ...item, favorite: !item.favorite }
        : item
    );
    setHistory(updated);
    localStorage.setItem("prompt-history", JSON.stringify(updated));
  }

  return (
    <aside className="w-72 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-3">
        Prompt History
      </h2>

      {history.length === 0 && (
        <p className="text-sm text-zinc-400">
          No prompts yet
        </p>
      )}

      <ul className="space-y-2">
        {history.map((item) => (
          <li
            key={item.id}
            className="bg-zinc-800 rounded p-2 text-sm"
          >
            <div
              className="cursor-pointer text-zinc-200 hover:underline"
              onClick={() => onSelect(item.content)}
            >
              {item.content?.slice(0, 70) || "Invalid prompt"}...

            </div>

            <button
              onClick={() => toggleFavorite(item.id)}
              className="mt-1 text-xs text-yellow-400"
            >
              {item.favorite ? "★ Favorited" : "☆ Favorite"}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
