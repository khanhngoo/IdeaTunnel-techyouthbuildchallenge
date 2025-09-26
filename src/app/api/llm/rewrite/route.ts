import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export const runtime = "edge";

interface RewriteRequestBody {
  title: string;
  content_md: string;
  instruction: string;
  max_words?: number;
}

interface RewriteResponseBody {
  content_md: string;
}

function buildRewritePrompt({ title, content_md, instruction, max_words = 200 }: RewriteRequestBody) {
  return `You are revising ONLY the section titled "${title}".
Return ONLY the updated content for that section in Markdown.
Do not add unrelated sections. Keep it concise (<= ${max_words} words).

Current content:\n---\n${content_md}\n---\n
Instruction:\n${instruction}\n`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RewriteRequestBody;
    if (!body?.title || typeof body.title !== "string") {
      return new Response("Missing title", { status: 400 });
    }
    if (typeof body.content_md !== "string") {
      return new Response("Missing content_md", { status: 400 });
    }
    if (!body?.instruction || typeof body.instruction !== "string") {
      return new Response("Missing instruction", { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return new Response("Missing Google Generative AI API key", { status: 500 });

    const google = createGoogleGenerativeAI({ apiKey });
    const prompt = buildRewritePrompt(body);

    const { text } = await generateText({ model: google("gemini-2.5-flash"), prompt });
    const content_md = (text ?? "").trim();

    const resp: RewriteResponseBody = { content_md };
    return new Response(JSON.stringify(resp), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500 });
  }
}


