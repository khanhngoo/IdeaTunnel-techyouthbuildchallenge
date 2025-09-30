import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildFanout3Prompt } from "@/services/prompts";
import { Fanout3BranchResponse, FanoutRequest } from "@/types/graph";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FanoutRequest;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response("Missing Google Generative AI API key", { status: 500 });
    }
    if (!body?.idea || typeof body.idea !== "string") {
      return new Response("Invalid request: missing idea", { status: 400 });
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const prompt = buildFanout3Prompt(body.idea);

    const { text } = await generateText({ model: google("gemini-2.5-flash"), prompt });

    // Try parse JSON; if the model returns code fences, strip them
    const jsonText = text.trim().replace(/^```(json)?/i, '').replace(/```$/i, '');
    let parsed: Fanout3BranchResponse | null = null;
    try {
      parsed = JSON.parse(jsonText) as Fanout3BranchResponse;
    } catch {
      // best-effort: try to find first {...} block
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]) as Fanout3BranchResponse;
      }
    }

    if (!parsed || !Array.isArray(parsed.branches)) {
      return new Response(JSON.stringify({ error: "LLM output invalid" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500 });
  }
}


