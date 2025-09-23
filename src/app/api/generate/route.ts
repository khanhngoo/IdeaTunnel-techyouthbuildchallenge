import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";

export const runtime = "edge";

export async function POST(request: Request) {
  const prompt = (await request.json()) as ModelMessage[];
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return new Response("Missing Google Generative AI API key", { status: 500 });
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    messages: prompt,
  });

  return new Response(text, {
    headers: { "Content-Type": "application/json" },
  });
}
