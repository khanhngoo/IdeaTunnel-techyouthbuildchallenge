import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type ModelMessage, smoothStream } from "ai";

export const runtime = "edge";

export async function POST(request: Request) {
  const prompt = (await request.json()) as ModelMessage[];
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return new Response("Missing Google Generative AI API key", { status: 500 });
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const result = streamText({
    model: google("gemini-2.5-flash"),
    messages: prompt,
    experimental_transform: smoothStream(),
  });

  return result.toTextStreamResponse();
}
