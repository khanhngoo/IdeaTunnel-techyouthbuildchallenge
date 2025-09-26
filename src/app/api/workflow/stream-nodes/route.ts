import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamObject } from "ai"
import { z } from "zod"

export const runtime = "edge"

// Fixed document templates and sections
const TEMPLATES = [
  {
    file: 'product_brief.md',
    title: 'Product Brief',
    sections: [
      'Product Summary',
      'Problem Statement',
      'Target Audience / User Personas',
      'Key Features & Benefits',
      'Unique Value Proposition (UVP)',
      'Primary Use Cases & Scenarios',
    ] as const,
    description:
      'Explains the "what" and "why" from a user and business perspective.',
  },
  {
    file: 'technical_spec.md',
    title: 'Technical Specification',
    sections: [
      'System Architecture Overview',
      'Core Components & Modules',
      'Data Models & Schema',
      'API Endpoints & Contracts',
      'Key Algorithms & Business Logic',
      'Technology Stack',
      'Dependencies & Integrations',
    ] as const,
    description: 'The architectural blueprint of the system.',
  },
  {
    file: 'codebase_guide.md',
    title: 'Codebase Guide',
    sections: [
      'Project Structure Overview',
      'Local Setup & Installation',
      'Coding Standards & Style Guide',
      'Testing Strategy',
      'Deployment Process',
      'Key Abstractions & Design Patterns',
    ] as const,
    description: 'A developer-focused guide for working with the source code.',
  },
]

const FILE_ENUM = z.enum([
  'product_brief.md',
  'technical_spec.md',
  'codebase_guide.md',
])

const SECTION_ENUM = z.enum([
  'Product Summary',
  'Problem Statement',
  'Target Audience / User Personas',
  'Key Features & Benefits',
  'Unique Value Proposition (UVP)',
  'Primary Use Cases & Scenarios',
  'System Architecture Overview',
  'Core Components & Modules',
  'Data Models & Schema',
  'API Endpoints & Contracts',
  'Key Algorithms & Business Logic',
  'Technology Stack',
  'Dependencies & Integrations',
  'Project Structure Overview',
  'Local Setup & Installation',
  'Coding Standards & Style Guide',
  'Testing Strategy',
  'Deployment Process',
  'Key Abstractions & Design Patterns',
])

// Discriminated union for streaming events
const NodeCreateEvent = z.object({
  type: z.literal('node-create'),
  node: z.object({
    id: z.string().optional(),
    title: z.string(),
    kind: z.string().optional(),
    parentId: z.string().optional(),
    file: FILE_ENUM.optional(),
    section: SECTION_ENUM.optional(),
  })
})

const NodeTextDeltaEvent = z.object({
  type: z.literal('node-text-delta'),
  nodeId: z.string(),
  delta: z.string()
})

const NodeDoneEvent = z.object({
  type: z.literal('node-done'),
  nodeId: z.string()
})

const StreamEvent = z.discriminatedUnion('type', [
  NodeCreateEvent,
  NodeTextDeltaEvent,
  NodeDoneEvent,
])

// Root schema: list of events streamed progressively
const StreamPayloadSchema = z.object({
  events: z.array(StreamEvent)
})

export type StreamPayload = z.infer<typeof StreamPayloadSchema>

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    seedNode?: { title: string; kind?: string; parentId?: string }
    strategy?: 'breadth' | 'depth'
    context?: string
    // Optional: limit to a subset of files
    files?: Array<z.infer<typeof FILE_ENUM>>
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return new Response('Missing Google Generative AI API key', { status: 500 })
  }

  const google = createGoogleGenerativeAI({ apiKey })

  const seedTitle = body?.seedNode?.title ?? 'Root'
  const seedKind = body?.seedNode?.kind ?? 'message'
  const traversal = body?.strategy ?? 'breadth'
  const branchContext = body?.context ?? ''
  const selectedTemplates = TEMPLATES.filter(t => !body.files || body.files.includes(t.file as any))

  const templatesDescription = selectedTemplates.map(t => {
    const sections = t.sections.map(s => `- ${s}`).join('\n')
    return `${t.title} (${t.file}) — ${t.description}\nSections:\n${sections}`
  }).join('\n\n')

  const system = `You are an assistant that emits structured JSON events to drive a canvas in real-time.
IMPORTANT: The document structure is FIXED. Only create nodes for the files and sections listed below.
For each section, you will:
1) Emit a node-create event for the section (with { file, section, title }).
2) Immediately stream content for that section using multiple node-text-delta events (short deltas, a few words each).
3) Then emit node-done for that section.
Do NOT invent extra files or sections. Follow the given order. Output ONLY valid JSON per schema.`

  const user = `Seed node title: ${seedTitle}
Seed node kind: ${seedKind}
Traversal strategy: ${traversal}
Branch context (optional):\n${branchContext}

Fixed document outline (STRICT):
${templatesDescription}`

  const result = streamObject({
    model: google('gemini-2.5-flash'),
    schema: StreamPayloadSchema,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })

  // Return as SSE data stream so client can parse incremental object parts.
  // Using 'any' to support SDK versions where the type may not include this helper.
  return (result as any).toDataStreamResponse?.() ?? result.toTextStreamResponse()
}


