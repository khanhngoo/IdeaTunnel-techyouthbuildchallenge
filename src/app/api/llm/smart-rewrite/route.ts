import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildSmartRewritePrompt } from "@/services/prompts";
import { SmartRewriteRequest, SmartRewriteResponse } from "@/types/graph";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SmartRewriteRequest;

    // Validation
    if (!body?.instruction || typeof body.instruction !== "string") {
      return new Response("Missing instruction", { status: 400 });
    }
    if (typeof body.currentContent !== "string") {
      return new Response("Missing currentContent", { status: 400 });
    }
    if (!body?.currentTitle || typeof body.currentTitle !== "string") {
      return new Response("Missing currentTitle", { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response("Missing Google Generative AI API key", { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const prompt = buildSmartRewritePrompt({
      instruction: body.instruction,
      currentContent: body.currentContent,
      currentTitle: body.currentTitle,
      parentContext: body.parentContext,
    });

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
    });

    // Parse JSON response from LLM
    const jsonText = text.trim().replace(/^```(json)?/i, '').replace(/```$/i, '');
    let parsed: SmartRewriteResponse | null = null;

    try {
      parsed = JSON.parse(jsonText) as SmartRewriteResponse;
    } catch {
      // Try to find first {...} block
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as SmartRewriteResponse;
        } catch (e) {
          console.error("Failed to parse JSON:", e);
        }
      }
    }

    // Validate response structure
    if (!parsed || !parsed.action) {
      return new Response(
        JSON.stringify({ error: "LLM output invalid - missing action" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (parsed.action === 'replace' && !parsed.content) {
      return new Response(
        JSON.stringify({ error: "LLM output invalid - replace action requires content" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (parsed.action === 'expand' && (!parsed.branches || !Array.isArray(parsed.branches) || parsed.branches.length === 0)) {
      return new Response(
        JSON.stringify({ error: "LLM output invalid - expand action requires branches array" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Smart rewrite error:", err);

    // Handle rate limit / overload errors
    if (err?.name === 'AI_RetryError' || err?.message?.includes('overloaded')) {
      return new Response(
        JSON.stringify({
          error: 'AI service temporarily unavailable. Please try again in a few moments.',
          retryable: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}