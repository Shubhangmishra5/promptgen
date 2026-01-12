"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Sidebar, { PromptHistoryItem } from "@/app/components/Sidebar";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Languages,
  ListChecks,
  Menu,
  Megaphone,
  Moon,
  RotateCcw,
  Rocket,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";

const PERSONAS = [
  { label: "None", value: "" },
  {
    label: "Software Engineer",
    value: "You are a senior software engineer with deep technical expertise.",
  },
  {
    label: "Startup Founder",
    value: "You are a startup founder focused on MVP, growth, and product-market fit.",
  },
  {
    label: "Marketing Expert",
    value: "You are a performance-driven digital marketing strategist.",
  },
  {
    label: "Teacher",
    value: "You are a clear and patient teacher who explains concepts simply.",
  },
  {
    label: "Creative Writer",
    value: "You are a creative writer with strong storytelling skills.",
  },
];

const LENGTH_OPTIONS = [
  { label: "Auto", value: "" },
  { label: "Short (5-8 sentences)", value: "Short (5-8 sentences)" },
  { label: "Medium (2-4 paragraphs)", value: "Medium (2-4 paragraphs)" },
  { label: "Long (multi-section)", value: "Long (multi-section)" },
  { label: "Executive summary (1 page)", value: "Executive summary (1 page)" },
];

const TEMPLATES = [
  {
    id: "blog",
    label: "Blog Draft",
    summary: "Long-form article with headings and SEO cues.",
    icon: BookOpen,
    defaults: {
      goal: "Write a detailed blog post on the given topic.",
      persona: "You are an experienced content writer and SEO expert.",
      audience: "Professionals evaluating the topic for work use.",
      context: "",
      references: "",
      format: "Structured blog with headings and subheadings.",
      tone: "Informative and engaging.",
      length: "Long (multi-section)",
      language: "English",
      constraints:
        "Avoid jargon unless explained. Keep paragraphs under 5 sentences.",
      successCriteria: "Reader walks away with clear takeaways and next steps.",
    },
  },
  {
    id: "coding",
    label: "Code Helper",
    summary: "Step-by-step solution with runnable examples.",
    icon: Code2,
    defaults: {
      goal: "Help me solve the following programming problem.",
      persona: "You are a senior software engineer and mentor.",
      audience: "Intermediate developers who need clarity.",
      context: "",
      references: "",
      format: "Step-by-step explanation with code examples.",
      tone: "Clear and concise.",
      length: "Medium (2-4 paragraphs)",
      language: "English",
      constraints: "Explain tradeoffs. Provide at least one alternative approach.",
      successCriteria: "Solution compiles and is easy to follow.",
    },
  },
  {
    id: "marketing",
    label: "Marketing Copy",
    summary: "Persuasive copy for launches and campaigns.",
    icon: Megaphone,
    defaults: {
      goal: "Write persuasive marketing copy for the following product.",
      persona: "You are a conversion-focused digital marketer.",
      audience: "Decision makers evaluating a purchase.",
      context: "",
      references: "",
      format: "Short paragraphs with bullet points and a CTA.",
      tone: "Persuasive and professional.",
      length: "Short (5-8 sentences)",
      language: "English",
      constraints: "Avoid hype. Lead with the strongest differentiator.",
      successCriteria: "Reader understands value and next action.",
    },
  },
  {
    id: "startup",
    label: "Startup Lens",
    summary: "Idea framing, users, and monetization.",
    icon: Rocket,
    defaults: {
      goal: "Generate and analyze a startup idea.",
      persona: "You are a startup founder and business strategist.",
      audience: "Operators validating a new concept.",
      context: "",
      references: "",
      format: "Problem + Solution + Target users + Monetization.",
      tone: "Strategic and practical.",
      length: "Medium (2-4 paragraphs)",
      language: "English",
      constraints: "Include risks and assumptions.",
      successCriteria: "Idea is plausible with clear next steps.",
    },
  },
  {
    id: "resume",
    label: "Resume Polish",
    summary: "Crisp resume sections with measurable impact.",
    icon: Briefcase,
    defaults: {
      goal: "Improve or generate a professional resume.",
      persona: "You are a professional career coach and recruiter.",
      audience: "Hiring managers in the target industry.",
      context: "",
      references: "",
      format: "Well-structured resume sections.",
      tone: "Professional.",
      length: "Medium (2-4 paragraphs)",
      language: "English",
      constraints: "Quantify outcomes and remove fluff.",
      successCriteria: "Resume reads scannable and impact focused.",
    },
  },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

type PromptFields = {
  goal: string;
  persona: string;
  audience: string;
  context: string;
  references: string;
  constraints: string;
  format: string;
  tone: string;
  length: string;
  language: string;
  successCriteria: string;
};

type QualityFlags = {
  askClarifying: boolean;
  stateAssumptions: boolean;
  includeChecklist: boolean;
};

const HISTORY_KEY = "prompt-history";
const MAX_HISTORY_ITEMS = 30;
const THEME_KEY = "promptgen-theme";
const HISTORY_DEPTH_OPTIONS = [1, 2, 3, 5];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHistory(raw: unknown): PromptHistoryItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return {
          id: createId(),
          content: item,
          favorite: false,
        };
      }

      if (item && typeof item === "object" && "content" in item) {
        const content = typeof item.content === "string" ? item.content : "";

        return {
          id:
            typeof item.id === "string" && item.id.trim()
              ? item.id
              : createId(),
          content,
          favorite: Boolean(item.favorite),
        };
      }

      return {
        id: createId(),
        content: "",
        favorite: false,
      };
    })
    .filter((item) => item.content.trim().length > 0);
}

function readHistory(): PromptHistoryItem[] {
  if (typeof window === "undefined") return [];

  const storedRaw = localStorage.getItem(HISTORY_KEY);
  if (!storedRaw) return [];

  try {
    return normalizeHistory(JSON.parse(storedRaw));
  } catch {
    return [];
  }
}

function truncateHistory(text: string, limit = 1200) {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}...`;
}

function buildStructuredPrompt(
  fields: PromptFields,
  quality: QualityFlags,
  historyContext: string[]
) {
  const blocks = [
    fields.persona.trim() || "You are a helpful AI assistant.",
    "",
    "TASK:",
    fields.goal.trim(),
  ];

  if (fields.audience.trim()) {
    blocks.push("", "TARGET AUDIENCE:", fields.audience.trim());
  }

  if (fields.context.trim()) {
    blocks.push("", "CONTEXT:", fields.context.trim());
  }

  if (fields.references.trim()) {
    blocks.push("", "REFERENCE MATERIAL:", fields.references.trim());
  }

  if (fields.format.trim()) {
    blocks.push("", "OUTPUT FORMAT:", fields.format.trim());
  }

  if (fields.tone.trim()) {
    blocks.push("", "TONE:", fields.tone.trim());
  }

  if (fields.length.trim()) {
    blocks.push("", "LENGTH:", fields.length.trim());
  }

  if (fields.language.trim()) {
    blocks.push("", "LANGUAGE:", fields.language.trim());
  }

  if (fields.constraints.trim()) {
    blocks.push("", "CONSTRAINTS:", fields.constraints.trim());
  }

  if (fields.successCriteria.trim()) {
    blocks.push("", "SUCCESS CRITERIA:", fields.successCriteria.trim());
  }

  if (historyContext.length) {
    blocks.push(
      "",
      "PRIOR OUTPUTS (MOST RECENT FIRST):",
      ...historyContext
    );
    blocks.push(
      "",
      "CONTINUITY:",
      "Use prior outputs as context. Avoid repeating content unless requested."
    );
  }

  const qualitySignals: string[] = [];
  if (quality.askClarifying) {
    qualitySignals.push(
      "Ask up to 3 clarifying questions if key details are missing."
    );
  }
  if (quality.stateAssumptions) {
    qualitySignals.push("State any assumptions explicitly.");
  }
  if (quality.includeChecklist) {
    qualitySignals.push("Include a short checklist before the final output.");
  }

  if (qualitySignals.length) {
    blocks.push(
      "",
      "QUALITY BAR:",
      ...qualitySignals.map((item) => `- ${item}`)
    );
  }

  blocks.push("", "DELIVERY:", "Be concise, structured, and directly useful.");

  return blocks.join("\n");
}

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [persona, setPersona] = useState("");
  const [audience, setAudience] = useState("");
  const [context, setContext] = useState("");
  const [references, setReferences] = useState("");
  const [constraints, setConstraints] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [length, setLength] = useState("");
  const [language, setLanguage] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [askClarifying, setAskClarifying] = useState(true);
  const [stateAssumptions, setStateAssumptions] = useState(true);
  const [includeChecklist, setIncludeChecklist] = useState(false);
  const [output, setOutput] = useState("");
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PromptHistoryItem[]>(() =>
    readHistory()
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [historyDepth, setHistoryDepth] = useState(3);
  const toastTimeout = useRef<number | null>(null);

  const cardClass =
    "rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85";
  const inputClass =
    "w-full rounded-xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-300 dark:focus:ring-amber-300/30";

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function persistHistory(nextHistory: PromptHistoryItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  }

  function updateHistory(
    updater: (prev: PromptHistoryItem[]) => PromptHistoryItem[]
  ) {
    setHistory((prev) => {
      const next = updater(prev);
      persistHistory(next);
      return next;
    });
  }

  function saveToHistory(prompt: string) {
    updateHistory((prev) => {
      const next = [
        {
          id: createId(),
          content: prompt,
          favorite: false,
        },
        ...prev,
      ].slice(0, MAX_HISTORY_ITEMS);
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
    }
    showToast("History cleared.");
  }

  function toggleFavorite(id: string) {
    updateHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item
      )
    );
  }

  function applyTemplate(templateId: TemplateId) {
    const selected = TEMPLATES.find(
      (template) => template.id === templateId
    );
    if (!selected) return;

    setGoal(selected.defaults.goal);
    setPersona(selected.defaults.persona);
    setAudience(selected.defaults.audience);
    setContext(selected.defaults.context);
    setReferences(selected.defaults.references);
    setFormat(selected.defaults.format);
    setTone(selected.defaults.tone);
    setLength(selected.defaults.length);
    setLanguage(selected.defaults.language);
    setConstraints(selected.defaults.constraints);
    setSuccessCriteria(selected.defaults.successCriteria);
  }

  function resetFields() {
    setGoal("");
    setPersona("");
    setAudience("");
    setContext("");
    setReferences("");
    setConstraints("");
    setFormat("");
    setTone("");
    setLength("");
    setLanguage("");
    setSuccessCriteria("");
    setAskClarifying(true);
    setStateAssumptions(true);
    setIncludeChecklist(false);
    setIncludeHistory(false);
    setHistoryDepth(3);
    setErrorMessage("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      generatePrompt();
    }
  }

  function getStructuredPrompt() {
    const depth = Math.min(
      Math.max(historyDepth, 1),
      MAX_HISTORY_ITEMS
    );
    const historyContext = includeHistory
      ? history.slice(0, depth).map((item, index) => {
          const snippet = truncateHistory(item.content);
          return `[${index + 1}] ${snippet}`;
        })
      : [];

    return buildStructuredPrompt(
      {
        goal,
        persona,
        audience,
        context,
        references,
        constraints,
        format,
        tone,
        length,
        language,
        successCriteria,
      },
      {
        askClarifying,
        stateAssumptions,
        includeChecklist,
      },
      historyContext
    );
  }

  function previewPrompt() {
    if (!goal.trim()) {
      showToast("Add a goal to preview the prompt.");
      return;
    }

    setOutput(getStructuredPrompt());
    setErrorMessage("");
    showToast("Structured prompt ready.");
  }

  async function generatePrompt() {
    if (!goal.trim()) {
      showToast("Add a goal to get started.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const structuredPrompt = getStructuredPrompt();

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: structuredPrompt }),
      });

      const data = await res.json();

      if (!res.ok || !data?.prompt) {
        throw new Error(data?.error || "Prompt generation failed.");
      }

      setOutput(data.prompt);
      saveToHistory(data.prompt);
    } catch (err) {
      setOutput(structuredPrompt);
      setErrorMessage(
        err instanceof Error ? err.message : "Prompt generation failed."
      );
      showToast("Using the structured prompt while the API is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt(text: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Prompt copied to clipboard.");
    } catch {
      showToast("Copy failed. Please copy manually.");
    }
  }

  function openExternal({
    url,
    text,
    queryParam,
  }: {
    url: string;
    text: string;
    queryParam?: string;
  }) {
    if (!text.trim()) return;
    const trimmed = text.trim();
    if (queryParam) {
      const query = `${queryParam}=${encodeURIComponent(trimmed)}`;
      const joiner = url.includes("?") ? "&" : "?";
      window.open(`${url}${joiner}${query}`, "_blank", "noopener,noreferrer");
      return;
    }
    copyPrompt(trimmed);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const hasOutput = Boolean(output.trim());
  const canContinue = includeHistory && history.length > 0;
  const historyDepthClamped = Math.min(
    Math.max(historyDepth, 1),
    MAX_HISTORY_ITEMS
  );
  const historyCount = canContinue
    ? Math.min(historyDepthClamped, history.length)
    : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setSidebarOpen((prev) => !prev);
            return;
          }
          setSidebarVisible((prev) => !prev);
        }}
        aria-label="Toggle history sidebar"
        aria-expanded={sidebarOpen || sidebarVisible}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_var(--glow-top),_transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_bottom,_var(--glow-bottom),_transparent_70%)] blur-3xl" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebarOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-[min(92vw,380px)] lg:hidden">
          <Sidebar
            history={history}
            onSelect={(prompt) => {
              setOutput(prompt);
              setErrorMessage("");
              setSidebarOpen(false);
            }}
            onToggleFavorite={toggleFavorite}
            onClear={clearHistory}
            onClose={() => setSidebarOpen(false)}
            className="h-full rounded-none border-0 bg-white dark:bg-slate-950"
          />
        </div>
      )}

      <div className="relative mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {sidebarVisible && (
          <div className="hidden w-80 shrink-0 lg:block">
            <Sidebar
              history={history}
              onSelect={(prompt) => {
                setOutput(prompt);
                setErrorMessage("");
              }}
              onToggleFavorite={toggleFavorite}
              onClear={clearHistory}
              className="sticky top-6 h-[calc(100vh-3rem)]"
            />
          </div>
        )}

        <main className="flex-1 space-y-6" onKeyDown={handleKeyDown}>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Prompt workspace
              </div>
              <h1 className="font-display text-3xl text-slate-900 dark:text-slate-100 sm:text-4xl">
                PromptGen
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                A production-ready prompt builder that turns messy ideas into
                reusable, high-performing instructions.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Template-driven
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Local history
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Structured output
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Continuity mode
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
                aria-label={
                  theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                }
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow-sm transition hover:border-amber-300 ${
                  theme === "dark"
                    ? "border-slate-200 bg-white text-slate-900 ring-2 ring-amber-300/50"
                    : "border-slate-900 bg-slate-900 text-white ring-2 ring-amber-400/40"
                }`}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                Press Ctrl or Cmd + Enter
              </div>
            </div>
          </header>

          <section className={`${cardClass} space-y-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Prompt setup
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Start from a template or build your own structured brief.
                </p>
              </div>
              <button
                onClick={resetFields}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear fields
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="group flex h-full flex-col gap-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <Icon className="h-4 w-4 text-orange-500" />
                      {template.label}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{template.summary}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 md:grid-cols-3">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 text-orange-500" />
                Start with a clear goal and audience for sharper outputs.
              </div>
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-orange-500" />
                Add source material to ground the response in facts.
              </div>
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 text-orange-500" />
                Use constraints to control tone, length, and format.
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                What should the AI accomplish?
              </label>
              <textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className={`${inputClass} min-h-[130px] resize-y`}
                placeholder="Example: Write a blog post about AI in healthcare"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="persona"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  AI persona
                </label>
                <select
                  id="persona"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className={inputClass}
                >
                  {PERSONAS.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="audience"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Target audience
                </label>
                <input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className={inputClass}
                  placeholder="Example: Product managers evaluating a new tool"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="context"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Context or background
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className={`${inputClass} min-h-[110px] resize-y`}
                placeholder="Add any details the AI should know before responding"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="format"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Output format
                </label>
                <input
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className={inputClass}
                  placeholder="Example: Bullet points or a step-by-step plan"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tone" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tone
                </label>
                <input
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className={inputClass}
                  placeholder="Example: Confident, concise, friendly"
                />
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-orange-500" />
                  Advanced prompt controls
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Optional
                </span>
              </summary>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="length"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Response length
                    </label>
                    <select
                      id="length"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className={inputClass}
                    >
                      {LENGTH_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="language"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Output language
                    </label>
                    <div className="relative">
                      <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className={`${inputClass} pl-9`}
                        placeholder="English"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="references"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Reference material or examples
                  </label>
                  <textarea
                    id="references"
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    className={`${inputClass} min-h-[110px] resize-y`}
                    placeholder="Paste source notes, requirements, or examples to ground the response"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="constraints"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Constraints
                    </label>
                    <textarea
                      id="constraints"
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className={`${inputClass} min-h-[100px] resize-y`}
                      placeholder="Example: Avoid hype. Use second-person voice. Include a CTA."
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="successCriteria"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Success criteria
                    </label>
                    <textarea
                      id="successCriteria"
                      value={successCriteria}
                      onChange={(e) => setSuccessCriteria(e.target.value)}
                      className={`${inputClass} min-h-[100px] resize-y`}
                      placeholder="Define what a great response must accomplish"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Quality guardrails
                  </p>
                  <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={askClarifying}
                        onChange={(e) => setAskClarifying(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
                      />
                      Ask clarifying questions when needed
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={stateAssumptions}
                        onChange={(e) => setStateAssumptions(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
                      />
                      State assumptions explicitly
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeChecklist}
                        onChange={(e) => setIncludeChecklist(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
                      />
                      Add a QA checklist
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Continuity
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeHistory}
                        onChange={(e) => setIncludeHistory(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
                      />
                      Use recent outputs as context
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Depth
                      </span>
                      <select
                        value={historyDepthClamped}
                        onChange={(e) => setHistoryDepth(Number(e.target.value))}
                        disabled={!includeHistory}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {HISTORY_DEPTH_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {canContinue
                        ? `Using last ${historyCount} prompt${
                            historyCount === 1 ? "" : "s"
                          }.`
                        : "No history yet."}
                    </span>
                  </div>
                </div>
              </div>
            </details>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={generatePrompt}
                disabled={loading || !goal.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating..." : "Generate prompt"}
              </button>
              <button
                onClick={previewPrompt}
                disabled={!goal.trim()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
              >
                <FileText className="h-4 w-4" />
                Preview structure
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Prompt history is stored locally in this browser.
              </div>
            </div>
          </section>

          <section className={`${cardClass} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Generated prompt
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Copy it as-is or send it to your favorite AI tool.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyPrompt(output)}
                  disabled={!hasOutput}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  onClick={() => setOutput("")}
                  disabled={!hasOutput}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            {hasOutput ? (
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4 text-sm leading-relaxed text-slate-800 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-100">
                <div className="whitespace-pre-wrap">{output}</div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                Generate a prompt to see it here. Output stays on-device unless
                you send it to an AI provider.
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <button
                onClick={() =>
                  openExternal({
                    url: "https://chatgpt.com/",
                    text: output,
                    queryParam: "q",
                  })
                }
                disabled={!hasOutput}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                ChatGPT
              </button>
              <button
                onClick={() =>
                  openExternal({
                    url: "https://gemini.google.com/app",
                    text: output,
                  })
                }
                disabled={!hasOutput}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                Gemini
              </button>
              <button
                onClick={() =>
                  openExternal({
                    url: "https://www.perplexity.ai/search",
                    text: output,
                    queryParam: "q",
                  })
                }
                disabled={!hasOutput}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                Perplexity
              </button>
            </div>
          </section>

          <section className={`${cardClass} grid gap-4 md:grid-cols-3`}>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Prompt hygiene</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Lead with the task, then add constraints and context.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Consistency</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Reuse templates to keep outputs aligned across teams.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quality checks</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add success criteria so every output meets the bar.
              </p>
            </div>
          </section>
        </main>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
