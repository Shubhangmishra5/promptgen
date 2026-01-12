import { z } from "zod";
import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_WINDOW_MS ?? 60_000
);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 30);
const REQUEST_TIMEOUT_MS = Number(
  process.env.GEMINI_REQUEST_TIMEOUT_MS ?? 20_000
);

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size < 500) return;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

const payloadSchema = z.object({
  input: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request) {
  try {
    const clientId =
      req.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    if (Number.isFinite(RATE_LIMIT_WINDOW_MS) && Number.isFinite(RATE_LIMIT_MAX)) {
      const now = Date.now();
      pruneRateLimitStore(now);
      const existing = rateLimitStore.get(clientId);

      if (!existing || existing.resetAt <= now) {
        rateLimitStore.set(clientId, {
          count: 1,
          resetAt: now + RATE_LIMIT_WINDOW_MS,
        });
      } else if (existing.count >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: "Too many requests. Please try again shortly." },
          {
            status: 429,
            headers: { "Cache-Control": "no-store" },
          }
        );
      } else {
        existing.count += 1;
      }
    }

    const parsed = payloadSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { input } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
          apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert prompt engineer.
Generate a high-quality professional AI prompt.

User idea:
${input}

Return ONLY the final prompt.`,
                  },
                ],
              },
            ],
          }),
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gemini failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    let prompt =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    prompt = prompt.trim();

    if (
      (prompt.startsWith("\"") && prompt.endsWith("\"")) ||
      (prompt.startsWith("'") && prompt.endsWith("'"))
    ) {
      prompt = prompt.slice(1, -1).trim();
    }

    return NextResponse.json(
      { prompt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Gemini request timed out" },
        { status: 504, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
