# Weaveboard — AI Editor Instruction (Full Rewrite)

> Purpose: A complete, executable plan for Cursor/AI editors to build the **Weaveboard MVP**. It specifies **what to build, which open‑source projects to use, and the exact contracts** between parts. If any library API is unclear, **do not invent syntax** — leave `// TODO`, cite the library, and move on.

---

## 0) Product Intent (for context)

- **Outcome:** A visual, infinite‑canvas workspace where nodes are AI‑generated or user notes, connected by typed edges; users can import evidence (CSV/MD/PDF), generate rewrite proposals, compile a PRD, and export to GitHub/editor. Stretch: RAG workspace, artifact previews, API simulation.
- **Users:** Solo builders & small teams. **Priorities:** speed, clarity, offline‑first, clean exports.

---

## 1) Tech Stack & Rules of Engagement

- **Framework:** Next.js (App Router, TypeScript) on Vercel.
- **Canvas:** `tldraw` (Apache‑2.0). Use only documented APIs. If extending shapes is unclear → `// TODO` stub.
- **State:** Zustand.
- **Styling/UI:** Tailwind + shadcn/ui.
- **Local DB:** Dexie (IndexedDB).
- **Cloud:** Supabase (Auth, Postgres, Realtime, Storage, **pgvector**). RLS enabled later.
- **LLM:** OpenAI/Anthropic via Route Handlers. Optional: **n8n** webhooks as an orchestration layer.
- **Exports:** Octokit (GitHub REST) or File System Access API (Chromium) for local writes.
- **Preview:** Sandpack for UI/UX artifacts.
- **Simulation:** Local mock engine; optional Mockoon/Mocki. If docs unclear, keep local mocks.

**Golden rule:** If unsure about any OSS API, **don’t guess**. Add a TODO with a link/note (no hard dependency on the unknown path).

---

## 2) Project Layout (all inside `src/`)

```
src/
  app/
    page.tsx
  api/
    llm/
      fanout/route.ts
      subchat/route.ts
      rewrite/route.ts
    rag/
      ingest/route.ts
      query/route.ts
    sim/
      run/route.ts
      openapi/route.ts
    github/
      push/route.ts
  components/
    Canvas.tsx
    BlockCard.tsx
    ValidationDrawer.tsx
    SandpackPreview.tsx
  lib/
    store.ts
    db.dexie.ts
    supabase.server.ts
    prompts.ts
    prd.ts
    rag.ts
    sim.ts
    github.ts
  types/
    graph.ts
```

---

## 3) Environment & Setup

-

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_TOKEN=
```

-

**Note:** If n8n is used, also add `N8N_BASE_URL` and `N8N_SIGNING_SECRET` and proxy via server routes.

---

## 4) Core Types (authoritative contracts)

```ts
// types/graph.ts
export type BlockID = string;
export type EdgeID = string;
export type EdgeType = 'expands' | 'refines' | 'contradicts' | 'depends' | 'supports' | 'refutes' | 'informs';

export interface Block {
  id: BlockID;
  title: string;
  content_md: string;              // markdown content
  kind: 'prompt' | 'response' | 'note' | 'section' | 'evidence' | 'dataset';
  pinned: boolean;
  hidden: boolean;
  tags: string[];
  created_at: number;              // ms epoch
  updated_at: number;              // ms epoch
  parent_ids: BlockID[];           // DAG, not strictly a tree
  meta?: {
    model?: string;
    temperature?: number;
    source_url?: string;           // evidence source
    file_id?: string;              // attachment key (Supabase Storage or local)
    citation?: string;             // footnote id
    confidence?: number;           // 0..1 evidence confidence
  };
}

export interface Edge { id: EdgeID; from: BlockID; to: BlockID; type: EdgeType; }
export interface ViewLayout { [id: string]: { x: number; y: number; w: number; h: number } }
```

**This file is the ****single source of truth**** used by UI, storage, LLM packing, and exports.**

---

## 5) Local Persistence (Dexie)

```ts
// lib/db.dexie.ts (minimal, extend as needed)
import Dexie, { Table } from 'dexie';
import { Block, Edge, ViewLayout } from '@/types/graph';

export class LocalDB extends Dexie {
  blocks!: Table<Block, string>;
  edges!: Table<Edge, string>;
  layout!: Table<{ id: string } & ViewLayout[string], string>;
  files!: Table<{ id: string; name: string; mime: string; bytes: ArrayBuffer }, string>;
  constructor() {
    super('weaveboard');
    this.version(1).stores({
      blocks: 'id, updated_at, kind, pinned',
      edges: 'id, from, to, type',
      layout: 'id',
      files: 'id, name, mime'
    });
  }
}
export const localdb = new LocalDB();
```

-

---

## 6) Global Store (Zustand)

```ts
// lib/store.ts (shape)
import { create } from 'zustand';
import { Block, Edge, ViewLayout } from '@/types/graph';

type State = { blocks: Record<string, Block>; edges: Record<string, Edge>; layout: ViewLayout };
type Actions = {
  upsertBlock: (b: Block) => void;
  deleteBlock: (id: string) => void;
  link: (from: string, to: string, type: Edge['type']) => void;
  unlink: (id: string) => void;
  setLayout: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
};

export const useBoard = create<State & Actions>(() => ({ /* TODO: impl */ }));
```

-

---

## 7) Canvas UI (`tldraw`)

-

> **Do not guess tldraw APIs.** Use stable examples. If a method isn’t documented, skip and leave a TODO.

---

## 8) Cloud Sync (Supabase)

-

> If Realtime or RLS docs are unclear, keep sync **off** for MVP and rely on Dexie only.

---

## 9) LLM Endpoints (Route Handlers)

**Common input:** JSON with minimal fields; **Common output:** typed JSON for UI.

### 9.1 `/api/llm/fanout` (POST)

**Input**

```json
{ "idea": "Build an AI brainstorming canvas..." }
```

**Output**

```json
{
  "sections": [
    { "title": "Features", "bullets": ["...", "..."] },
    { "title": "Personas", "bullets": ["...", "..."] },
    { "title": "Value Proposition", "bullets": ["...", "..."] },
    { "title": "UX", "bullets": ["...", "..."] },
    { "title": "Architecture", "bullets": ["...", "..."] },
    { "title": "Risks", "bullets": ["...", "..."] }
  ]
}
```

### 9.2 `/api/llm/subchat` (POST)

**Input**

```json
{ "blockId": "b1", "context": { "neighbors": [ {"id": "b0", "title": "..."} ], "evidenceIds": ["e12"] }, "prompt": "Deepen the Architecture with tradeoffs" }
```

**Output**

```json
{ "title": "Architecture tradeoffs", "content_md": "- ...\n- ..." }
```

### 9.3 `/api/llm/rewrite` (POST)

**Input**

```json
{ "featureId": "f42", "evidence": [{"id":"e1","quote":"...","confidence":0.86}], "instructions": "Revise feature spec with citations" }
```

**Output**

```json
{ "content_md": "- Updated bullet 1 [#e1]\n- Updated bullet 2 [#e3]", "confidence": 0.78, "diff": "..." }
```

> **Implementation:** If LangChain/LlamaIndex usage is uncertain, call the provider APIs directly with `fetch`. Keep prompts in `lib/prompts.ts`.

**Optional (n8n):** Replace handler bodies with proxy calls to webhooks. Add `X‑Signature` header.

---

## 10) Validation & Evidence

-

**CSV:** Use PapaParse. **Markdown:** split by headings or bullets. **Embeddings:** OpenAI endpoint; if unclear, fallback to keyword matching.

---

## 11) RAG (Supabase + pgvector)

**Table**

```sql
create table chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  content text not null,
  meta jsonb,
  embedding vector(1536)
);
create index on chunks using ivfflat (embedding vector_ops);
```

**Endpoints**

-

If LangChain/LlamaIndex pgvector adapters are unclear, write plain SQL queries.

---

## 12) PRD Compiler (pure functions)

-

```ts
// lib/prd.ts
export function compilePRD(/* state */): string { /* TODO */ }
```

---

## 13) Exports (GitHub & Local)

- Leave it for now

---

## 14) Artifacts Preview

- Leave it for now

---

## 15) API Simulation (visual flow)

-

Optional: Integrate Mockoon/Mocki if documentation is clear; otherwise keep local mocks.

---

## 16) Telemetry (demo‑safe)

- leave it for now

---

## 17) Acceptance Checklist (definition of done)

[ ] M1 – Canvas & Graph
[ ] M2 – Store & Persistence
[ ] M3 – LLM Core
[ ] M4 – Validation & Evidence
[ ] M5 – RAG
[ ] M6 – PRD & Export
[ ] M7 – Artifacts & API Sim
[ ] M8 – Telemetry & QA


---

## 18) Notes to Cursor / AI Editor

- Use **official docs** for: tldraw, Zustand, Dexie, Supabase (pgvector & Realtime), OpenAI/Anthropic, Sandpack, Octokit, Mockoon/Mocki.
- **Never** invent library APIs. If unsure, mark `// TODO: consult docs` and implement the minimal fallback.
- Keep prompts small and explicit in `lib/prompts.ts` and version any changes.
- Secrets stay in server routes only; never in client bundles or environment.
- Commit early and often with clear messages (e.g., `feat(canvas): add edge creation`, `feat(llm): fanout route`).

