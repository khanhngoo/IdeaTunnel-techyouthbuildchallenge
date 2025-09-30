import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type ModelMessage, smoothStream } from "ai";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
    console.error("Stream API error:", error);

    // Handle rate limit / overload errors
    if (error?.name === 'AI_RetryError' || error?.message?.includes('overloaded')) {
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
      JSON.stringify({ error: 'Failed to stream response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
