# Weaveboard — Product Requirements (PRD)

> Purpose: High-level product definition + detailed requirements so Cursor/AI editors have **context of what to build and why**, complementing the technical instruction doc.

## 1) One‑liner
A visual, infinite‑canvas workspace where every AI response is a node in a graph. Branch, compare, and refine ideas; ingest real‑world evidence; then compile and push a clean PRD/prompt pack to your repo or editor.

## 2) Problem & Motivation
- Brainstorming in chat is **linear**; ideation is **graph‑shaped**. Valuable branches are buried in scrollback and hard to compare.
- Instruction markdowns for AI coding tools are time‑consuming to assemble from scattered chats and often redundant.
- Early builders need a **validation loop**: ingest user feedback/interviews and **revise** specs with citations.

## 3) Target Users & JTBD
**Primary:** Solo entrepreneurs and small teams (PM/Design/Eng) shaping MVPs.

**Jobs-to-be-Done**
- When shaping a product, I want to branch and compare directions side‑by‑side so I can keep what works and drop what doesn’t.
- When ready to build, I want a clean, deduped PRD/prompt pack generated from the best blocks and pushed to my repo/editor.
- As I learn from users, I want to attach real evidence and update features with traceable citations.

## 4) Product Principles
- **Graph‑first:** Non‑linear structure, typed links, explicit contradictions/dependencies.
- **Evidence‑driven:** Features should trace back to interviews, feedback, or metrics.
- **Export‑ready:** Always one click from canvas → PRD/prompt files → GitHub/editor.
- **Local‑first:** Snappy offline UX (autosave), cloud sync optional.

## 5) Scope — MVP (must‑have)
1. **Infinite Canvas** (tldraw): nodes (Blocks) with title + markdown; typed edges.
2. **Context‑aware Subchat:** prompt within a node using nearby graph context.
3. **Auto‑Fanout:** given an idea, generate 6 child sections (Features, Personas, Value Prop, UX, Architecture, Risks).
4. **Pin/Hide & Refactor:** curate best blocks; cluster; retitle; draw contradictions/dependencies.
5. **Validation Ingest:** import CSV/Markdown to create **Evidence** nodes; link to Features as supports/refutes/informs; propose rewrites.
6. **PRD Compiler:** dedupe and order pinned content; add footnoted citations + appendix; change log of accepted rewrites.
7. **Export Integrations:** Download Markdown; **Push to GitHub** (branch + PR) and/or write to local project via File System Access.

### Stretch (nice‑to‑have)
- **RAG Workspace:** Ingest web/PDF/notes → pgvector search → cite sources in blocks.
- **Artifacts Preview:** Sandpack React previews; Markdown→HTML; wireframes.
- **API Simulation Nodes:** define endpoints + mock responses; run chained flows; export OpenAPI.
- Realtime collaboration (Yjs/Automerge), version history.

## 6) Key Concepts & Data
**Block types:** `prompt | response | note | section | evidence | dataset`

**Edge types:** `expands | refines | contradicts | depends | supports | refutes | informs`

**Evidence metadata:** source_url, file_id, citation id, confidence (0..1).

> Technical schemas and table definitions live in the companion doc **“Weaveboard — AI Editor Instruction.md.”**

## 7) User Flows
**A. Ideate → Fanout**
1) Create root idea block → click **Auto‑Fanout**.
2) Six child blocks appear; open **Subchat** in any to deepen.

**B. Curate & Structure**
1) Pin best blocks; hide weak branches.
2) Link contradictions and dependencies; drag into clusters.

**C. Validate → Rewrite**
1) Import `interviews.csv` or `feedback.md` in **Validation Drawer**.
2) System extracts Evidence nodes (quote, persona, tag, sentiment).
3) Auto‑link evidence to Features (supports/refutes/informs) and propose rewrites.
4) Review diffs; accept changes → Feature updates + change log entry.

**D. Compile & Export**
1) Click **Compile PRD** → Markdown with evidence footnotes + appendix + change log.
2) **Push to GitHub** (`docs/PRD.md`, `prompts/*.md`) and/or write files to local project.

## 8) Functional Requirements
### 8.1 Canvas & Graph
- Create/edit/delete Blocks with title + markdown content.
- Create typed Edges; show distinct visuals per edge type (color/label).
- Pan/zoom, marquee select, multi‑move, mini‑map, quick search by title/tag.
- Block actions: **Pin**, **Hide**, **Convert to Section**, **Fanout**, **Mark as Evidence**.

### 8.2 Subchat (context‑aware)
- Packs nearby pinned ancestors/descendants + siblings and any linked Evidence.
- Shows **Context Header** listing included blocks.
- Returns response as a new child Block (type `response`) or appends to existing.

### 8.3 Auto‑Fanout
- Single LLM call produces six structured sections; create child Blocks of type `section` or `note` with bullets.
- Optional “Enrich” per section (follow‑up calls) — outside MVP if time is short.

### 8.4 Validation Ingest
- Accept CSV and Markdown uploads; show table preview; allow column mapping.
- Extract Evidence nodes (fields: persona, quote/snippet, tags, sentiment, date, source).
- Suggest links to Feature blocks via lightweight similarity (keywords/embeddings).
- **Propose Rewrite** button on Feature: show diff, rationale with citations `[#e123]`, and confidence. Accept → update + log.

### 8.5 PRD Compiler
- Input: pinned blocks + required ancestors.
- Process: dedupe bullets (similarity); enforce glossary terms; order by standard outline.
- Output: Markdown sections + **Evidence footnotes** and **Appendix**; **Change Log** from accepted rewrites.

### 8.6 Export Integrations
- Download `.md` files.
- GitHub push: create branch `auto/brainstorm-compile`, commit `docs/PRD.md` and `prompts/*.md`, open PR.
- Local project write (Chromium): File System Access API to write same files.

### 8.7 Stretch: RAG / Artifacts / API Sim
- **RAG:** Ingest PDF/MD/CSV → chunk + embed → pgvector store → query with citations.
- **Artifacts:** Render React snippets in Sandpack; Markdown→HTML; export to `/artifacts/*`.
- **API Sim:** Define nodes `{method, path, inputSchema, outputSchema, example}`; mock responses; run chained flows; export OpenAPI (minimal).

## 9) Non‑Functional Requirements
- **Performance:** create/edit/render operations feel instantaneous (<16ms frame budget during drag; <200ms for common actions).
- **Offline‑first:** all actions work without network; autosave to IndexedDB; sync when online.
- **Security:** secrets only on server routes; RLS in Supabase for multi‑tenant data.
- **Accessibility:** keyboard nav for node selection; contrast‑safe palettes; ARIA on drawers/dialogs.

## 10) Success Metrics (MVP)
- Time to first PRD export < **10 minutes** from new board.
- ≥ **60%** of created blocks are curated (pinned/hidden) before export.
- ≥ **1** accepted rewrite proposal after importing evidence.
- ≥ **1** successful GitHub push/PR per session.

## 11) Release Milestones
- **M1 Canvas & Graph** — pan/zoom, nodes, edges, pin/hide, local autosave.
- **M2 LLM Core** — auto‑fanout, subchat, basic context packing.
- **M3 Validation** — CSV/MD import → evidence → link → rewrite proposals.
- **M4 PRD & Export** — compiler, footnotes/appendix/change log, GitHub push.
- **M5 Stretch** — RAG workspace, artifacts preview, API simulation flow.

## 12) Risks & Mitigations
- Token bloat → summarize blocks; radius‑limited context; pin weighting.
- Parsing fragility → JSON schema outputs + retry on parse fail.
- Visual clutter → auto‑layout presets (by category); mini‑map; search.
- Sync conflicts → last‑write‑wins for MVP; consider CRDT later.

## 13) Open Questions
- Should contradictions automatically generate a “decision” block with tracked outcome?
- Minimum viable artifacts: Markdown→HTML only or Sandpack React too?
- RAG file limits per workspace (size/quantity) for MVP?

## 14) Glossary
- **Block**: a node on the canvas (idea, response, feature, evidence, etc.).
- **Evidence**: imported or researched data (interviews, feedback, metrics) linked to features.
- **Fanout**: auto‑generated category children from a root idea.
- **PRD**: Product Requirements Document compiled from curated blocks.

---

## Appendix A — Acceptance Criteria (checklist)

### Canvas & Graph
- [ ] Create/edit/delete blocks with title+markdown.
- [ ] Create typed edges (expands/refines/contradicts/depends/supports/refutes/informs).
- [ ] Pan/zoom, multi‑select, mini‑map, search.
- [ ] Pin/Hide/Convert to Section/Fanout/Mark as Evidence.

### LLM Core
- [ ] Auto‑fanout creates 6 sections under root.
- [ ] Subchat includes pinned neighbors + evidence in context header.

### Validation
- [ ] CSV + Markdown importer with column mapping.
- [ ] Evidence nodes created with metadata and linked to features.
- [ ] Rewrite proposals show diff + citations + confidence; Accept applies update and logs change.

### PRD & Export
- [ ] Compiler outputs Markdown with footnotes, appendix, and change log.
- [ ] “Push to GitHub” creates branch + PR with `/docs/PRD.md` and `/prompts/*.md`.
- [ ] Optional: Local write via File System Access API.

### Stretch (if time)
- [ ] RAG query returns top‑k chunks with citations.
- [ ] Sandpack renders at least one React artifact from a block.
- [ ] API sim can run a 2‑node flow and export minimal OpenAPI.

---

## Appendix B — Standard PRD Outline (compiler target)
1. Title & One‑liner
2. Problem & Goals
3. Personas & JTBD
4. Value Proposition
5. Features
6. UX Flows
7. Architecture
8. Risks & Mitigations
9. Metrics & Milestones
10. Evidence Appendix
11. Change Log

