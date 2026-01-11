"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";



const PERSONAS = [
  { label: "None", value: "" },
  { label: "Software Engineer", value: "You are a senior software engineer with deep technical expertise." },
  { label: "Startup Founder", value: "You are a startup founder focused on MVP, growth, and product-market fit." },
  { label: "Marketing Expert", value: "You are a performance-driven digital marketing strategist." },
  { label: "Teacher", value: "You are a clear and patient teacher who explains concepts simply." },
  { label: "Creative Writer", value: "You are a creative writer with strong storytelling skills." },
];
const TEMPLATES = {
  blog: {
    goal: "Write a detailed blog post on the given topic.",
    persona: "You are an experienced content writer and SEO expert.",
    format: "Structured blog with headings and subheadings",
    tone: "Informative and engaging",
  },
  coding: {
    goal: "Help me solve the following programming problem.",
    persona: "You are a senior software engineer and mentor.",
    format: "Step-by-step explanation with code examples",
    tone: "Clear and concise",
  },
  marketing: {
    goal: "Write persuasive marketing copy for the following product.",
    persona: "You are a conversion-focused digital marketer.",
    format: "Short paragraphs with bullet points",
    tone: "Persuasive and professional",
  },
  startup: {
    goal: "Generate and analyze a startup idea.",
    persona: "You are a startup founder and business strategist.",
    format: "Problem → Solution → Target users → Monetization",
    tone: "Strategic and practical",
  },
  resume: {
    goal: "Improve or generate a professional resume.",
    persona: "You are a professional career coach and recruiter.",
    format: "Well-structured resume sections",
    tone: "Professional",
  },
};

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [persona, setPersona] = useState("");
  const [context, setContext] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [output, setOutput] = useState("");
  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(false);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }




  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey && e.key === "Enter") {
      generatePrompt();
    }
  }


  function loadPrompt(prompt: string) {
  setOutput(prompt);
}


  function saveToHistory(prompt: string) {
  const existing =
    JSON.parse(localStorage.getItem("prompt-history") || "[]");

  const newItem = {
    id: Date.now().toString(),
    content: prompt,
    favorite: false,
  };

  const updated = [newItem, ...existing].slice(0, 30);
  localStorage.setItem("prompt-history", JSON.stringify(updated));
}


  function applyTemplate(template: keyof typeof TEMPLATES) {
  const t = TEMPLATES[template];
  setGoal(t.goal);
  setPersona(t.persona);
  setFormat(t.format);
  setTone(t.tone);
  setContext("");
}


  async function generatePrompt() {
    if (!goal.trim()) {
      setOutput("❗ Please describe what you want the AI to do.");
      return;
    }

    setLoading(true);

    const structuredPrompt = `
${persona ? persona : "You are a helpful AI assistant."}

GOAL:
${goal}

${context ? `CONTEXT:\n${context}` : ""}

${format ? `OUTPUT FORMAT:\n${format}` : ""}

${tone ? `TONE:\n${tone}` : ""}

IMPORTANT:
Follow the instructions carefully and be precise.
    `.trim();

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: structuredPrompt }),
      });

      if (!res.ok) throw new Error("Gemini failed");

      const data = await res.json();
      setOutput(data.prompt);
      saveToHistory(data.prompt);

    } catch {
      setOutput(structuredPrompt);
    }

    setLoading(false);
  }

  function copyPrompt(text: string) {
  navigator.clipboard.writeText(text);
  setToast("Prompt copied!");
  setTimeout(() => setToast(""), 2000);

}

function openChatGPT(text: string) {
  navigator.clipboard.writeText(text);
  window.open("https://chat.openai.com/", "_blank");
}

function openGemini(text: string) {
  navigator.clipboard.writeText(text);
  window.open("https://gemini.google.com/app", "_blank");
}

function openPerplexity(text: string) {
  navigator.clipboard.writeText(text);
  window.open("https://www.perplexity.ai/", "_blank");
}

function openAnyAI(text: string) {
  navigator.clipboard.writeText(text);
  showToast("Prompt copied to clipboard");

}


  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Mobile overlay (only when sidebar is open) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-50 h-full bg-zinc-900 transition-transform
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          onSelect={(prompt) => {
            loadPrompt(prompt);
            setSidebarOpen(false);
          }}
        />
      </div>



      <main className="flex-1 p-6 overflow-y-auto">
        <button
          className="md:hidden mb-4 px-3 py-2 bg-zinc-800 rounded"
          onClick={() => setSidebarOpen(true)}
        >
          ☰ Menu
        </button>

        <h1 className="text-2xl font-semibold mb-1">
          PromptGen
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Build high-quality prompts for any AI. Faster. Better.
        </p>


        {/* GOAL */}
        <label className="block mb-2 text-sm text-zinc-300">
          What do you want the AI to do? *
        </label>
        <div className="mb-6">
  <p className="text-sm text-zinc-400 mb-2">
    Start with a template
  </p>
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => applyTemplate("blog")}
      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
    >
      ✍️ Blog
    </button>

    <button
      onClick={() => applyTemplate("coding")}
      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
    >
      💻 Coding
    </button>

    <button
      onClick={() => applyTemplate("marketing")}
      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
    >
      📢 Marketing
    </button>

    <button
      onClick={() => applyTemplate("startup")}
      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
    >
      🚀 Startup
    </button>

    <button
      onClick={() => applyTemplate("resume")}
      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
    >
      📄 Resume
    </button>
  </div>
</div>

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full p-3 mb-4 bg-zinc-900 border border-zinc-700 rounded"
          placeholder="e.g. Write a blog post about AI in healthcare"
          onKeyDown={handleKeyDown}

        />

        {/* PERSONA */}
        <label className="block mb-2 text-sm text-zinc-300">
          AI Persona (optional)
        </label>
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className="w-full p-3 mb-4 bg-zinc-900 border border-zinc-700 rounded"
        >
          {PERSONAS.map((p) => (
            <option key={p.label} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* CONTEXT */}
        <label className="block mb-2 text-sm text-zinc-300">
          Context / Background (optional)
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="w-full p-3 mb-4 bg-zinc-900 border border-zinc-700 rounded"
          placeholder="Any background info the AI should know"
        />
        

        {/* FORMAT */}
        <label className="block mb-2 text-sm text-zinc-300">
          Output format (optional)
        </label>
        <input
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="w-full p-3 mb-4 bg-zinc-900 border border-zinc-700 rounded"
          placeholder="e.g. Bullet points, table, step-by-step"
        />

        

        {/* TONE */}
        <label className="block mb-2 text-sm text-zinc-300">
          Tone (optional)
        </label>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full p-3 mb-6 bg-zinc-900 border border-zinc-700 rounded"
          placeholder="e.g. Professional, friendly, concise"
        />

        <button
          onClick={generatePrompt}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-2 rounded"
        >
          {loading ? "Generating..." : "Generate Prompt"}
        </button>
        {toast && (
          <div className="fixed bottom-4 right-4 bg-zinc-800 text-white px-4 py-2 rounded shadow">
            {toast}
          </div>
        )}


        {output && (
          

          

          <div className="mt-6">
            <div className="p-4 bg-zinc-900 border border-zinc-700 rounded whitespace-pre-wrap">
              {output}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => copyPrompt(output)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
              >
                📋 Copy
              </button>

              <button
                onClick={() => openChatGPT(output)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                🤖 ChatGPT
              </button>

              <button
                onClick={() => openGemini(output)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                🧠 Gemini
              </button>

              <button
                onClick={() => openPerplexity(output)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
              >
                🔍 Perplexity
              </button>

              <button
                onClick={() => openAnyAI(output)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
              >
                🌐 Any AI
              </button>
            </div>
          </div>
        )}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 px-4 py-2 rounded shadow-lg text-sm">
            {toast}
          </div>
        )}


      </main>
    </div>
  );
}
