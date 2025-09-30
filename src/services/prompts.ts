export function buildSmartRewritePrompt({
  instruction,
  currentContent,
  currentTitle,
  parentContext
}: {
  instruction: string;
  currentContent: string;
  currentTitle: string;
  parentContext?: string;
}) {
  const contextSection = parentContext
    ? `\n\n## Context from Connected Nodes\n${parentContext}\n`
    : '';

  return `You are an AI assistant helping to manage a visual workflow canvas for product ideation.

Your task: Analyze the user's instruction and decide whether to:
1. **REPLACE**: Simply update the current node's content
2. **EXPAND**: Create multiple child nodes with divided content

${contextSection}
## Current Node
Title: "${currentTitle}"
Content: ${currentContent || '(empty)'}

## User Instruction
"${instruction}"

## Decision Rules
- Use **REPLACE** if: simple edit, clarification, rephrasing, adding details to current content
- Use **EXPAND** if: instruction contains "divide", "split", "break down", "create N [things]", "elaborate on X, Y, Z separately", mentions specific number of items

## Output Format (JSON only)
If REPLACE:
{
  "action": "replace",
  "content": "updated markdown content here"
}

If EXPAND (e.g., "divide into 3 personas"):
{
  "action": "expand",
  "branches": [
    { "title": "Persona 1: Sarah", "content": "Biography: ...\\nNeeds: ...\\nSalary: ..." },
    { "title": "Persona 2: John", "content": "..." },
    { "title": "Persona 3: Maria", "content": "..." }
  ]
}

Return ONLY valid JSON. No explanations.`;
}

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
