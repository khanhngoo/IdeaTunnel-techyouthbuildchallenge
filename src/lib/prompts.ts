export function buildFanout3Prompt(idea: string) {
  return `You are an assistant that creates a structured product pack as JSON.
Follow this exact schema and do not include explanations.

{
  "branches": [
    {
      "title": "Product Brief",
      "file": "product_brief.md",
      "sections": [
        { "title": "Product Summary", "bullets": ["..."] },
        { "title": "Problem Statement", "bullets": ["..."] },
        { "title": "Target Audience / User Personas", "bullets": ["..."] },
        { "title": "Key Features & Benefits", "bullets": ["..."] },
        { "title": "Unique Value Proposition (UVP)", "bullets": ["..."] },
        { "title": "Primary Use Cases & Scenarios", "bullets": ["..."] }
      ]
    },
    {
      "title": "Technical Specification",
      "file": "technical_spec.md",
      "sections": [
        { "title": "System Architecture Overview", "bullets": ["..."] },
        { "title": "Core Components & Modules", "bullets": ["..."] },
        { "title": "Data Models & Schema", "bullets": ["..."] },
        { "title": "API Endpoints & Contracts", "bullets": ["..."] },
        { "title": "Key Algorithms & Business Logic", "bullets": ["..."] },
        { "title": "Technology Stack", "bullets": ["..."] },
        { "title": "Dependencies & Integrations", "bullets": ["..."] }
      ]
    },
    {
      "title": "Codebase Guide",
      "file": "codebase_guide.md",
      "sections": [
        { "title": "Project Structure Overview", "bullets": ["..."] },
        { "title": "Local Setup & Installation", "bullets": ["..."] },
        { "title": "Coding Standards & Style Guide", "bullets": ["..."] },
        { "title": "Testing Strategy", "bullets": ["..."] },
        { "title": "Deployment Process", "bullets": ["..."] },
        { "title": "Key Abstractions & Design Patterns", "bullets": ["..."] }
      ]
    }
  ]
}

Constraints:
- Keep each bullets array concise (3-6 items when possible).
- Tailor content to this idea: ${idea}
- Output strictly valid JSON.`
}
