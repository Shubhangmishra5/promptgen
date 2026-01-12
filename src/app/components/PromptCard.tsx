// src/components/PromptCard.tsx
"use client";
import React from "react";

export default function PromptCard({ text }: { text: string }) {
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied prompt to clipboard");
    } catch {
      alert("Copy failed, try manually.");
    }
  }
  function openChatGPT() {
    const url = `https://chatgpt.com/?q=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <pre className="whitespace-pre-wrap text-sm">{text}</pre>
      <div className="mt-3 flex gap-2">
        <button onClick={copyPrompt} className="px-3 py-1 bg-indigo-600 text-white rounded">Copy</button>
        <button onClick={openChatGPT} className="px-3 py-1 bg-emerald-600 text-white rounded">Open in ChatGPT</button>
      </div>
    </div>
  );
}
