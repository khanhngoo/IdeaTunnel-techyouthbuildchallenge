import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
    console.error("Generate API error:", error);

    // Handle rate limit / overload errors
    if (error?.name === 'AI_RetryError' || error?.message?.includes('overloaded')) {
      return new Response(
        JSON.stringify({
          error: 'AI service temporarily unavailable. Please try again in a few moments.',
          retryable: true
        }),
        {
          status: 503, // Service Unavailable
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
