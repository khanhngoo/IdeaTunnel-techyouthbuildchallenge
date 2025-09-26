export function buildFanout3Prompt(idea: string) {
  return `You are an assistant that creates a structured product pack as JSON.
Follow this exact schema and do not include explanations.

{
  "branches": [
    {
      "title": "Product Brief",
      "file": "product_brief.md",
      "sections": [
        { "title": "Product Summary", "content": "..." },
        { "title": "Problem Statement", "content": "..." },
        { "title": "Target Audience / User Personas", "content": "..." },
        { "title": "Key Features & Benefits", "content": "..." },
        { "title": "Unique Value Proposition (UVP)", "content": "..." },
        { "title": "Primary Use Cases & Scenarios", "content": "..." }
      ]
    },
    {
      "title": "Technical Specification",
      "file": "technical_spec.md",
      "sections": [
        { "title": "System Architecture Overview", "content": "..." },
        { "title": "Core Components & Modules", "content": "..." },
        { "title": "Data Models & Schema", "content": "..." },
        { "title": "API Endpoints & Contracts", "content": "..." },
        { "title": "Key Algorithms & Business Logic", "content": "..." },
        { "title": "Technology Stack", "content": "..." },
        { "title": "Dependencies & Integrations", "content": "..." }
      ]
    },
    {
      "title": "Codebase Guide",
      "file": "codebase_guide.md",
      "sections": [
        { "title": "Project Structure Overview", "content": "..." },
        { "title": "Local Setup & Installation", "content": "..." },
        { "title": "Coding Standards & Style Guide", "content": "..." },
        { "title": "Testing Strategy", "content": "..." },
        { "title": "Deployment Process", "content": "..." },
        { "title": "Key Abstractions & Design Patterns", "content": "..." }
      ]
    }
  ]
}

Constraints:
- Use concise, well‑formatted Markdown for each section's content.
- Favor paragraphs, short lists, and inline headers where helpful.
- Tailor content to this idea: ${idea}
- Titles and headings must be terse; NEVER include meta phrases like "Here are", "Options", "Below are", "In this section".
- If a project name is needed, use a single-word codename (e.g., "Flux") with no extra words.
- Start content directly; avoid prefaces like "Here are the options..." or similar.
- Output strictly valid JSON.`
}
