"use client";


import { useState, useEffect  } from "react";

type PromptItem = {
  id: string;
  content: string;
  favorite: boolean;
};

function loadHistory(): PromptItem[] {
  if (typeof window === "undefined") return [];

  const storedRaw = localStorage.getItem("prompt-history");
  if (!storedRaw) return [];

  try {
    const stored = JSON.parse(storedRaw);

    if (!Array.isArray(stored)) return [];

    return stored.map((item) => {
      if (typeof item === "string") {
        return {
          id: crypto.randomUUID(),
          content: item,
          favorite: false,
        };
      }

      if (
        typeof item === "object" &&
        item !== null &&
        "content" in item
      ) {
        return {
          id: item.id || crypto.randomUUID(),
          content: item.content || "",
          favorite: Boolean(item.favorite),
        };
      }

      return {
        id: crypto.randomUUID(),
        content: "",
        favorite: false,
      };
    });
  } catch {
    return [];
  }
}

export default function Sidebar({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);




  const [history, setHistory] = useState<PromptItem[]>(loadHistory);

  function toggleFavorite(id: string) {
    const updated = history.map((item) =>
      item.id === id
        ? { ...item, favorite: !item.favorite }
        : item
    );

    setHistory(updated);
    localStorage.setItem("prompt-history", JSON.stringify(updated));
  }
  if (!mounted) {
    return null;
  }


  return (
    <aside className="w-64 md:w-72 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto h-full">

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
              {item.content.slice(0, 70)}…
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
