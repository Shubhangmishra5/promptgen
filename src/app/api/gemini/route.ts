import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input) {
      return NextResponse.json(
        { error: "Input missing" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Gemini failed" },
        { status: 500 }
      );
    }

    let prompt =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 🔹 CLEANUP
    prompt = prompt.trim();

    // remove wrapping quotes if present
    if (
      (prompt.startsWith('"') && prompt.endsWith('"')) ||
      (prompt.startsWith("“") && prompt.endsWith("”"))
    ) {
      prompt = prompt.slice(1, -1).trim();
    }


    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
