# Weaveboard — PRD (High‑level)

## Description
An infinite canvas workspace where every AI response becomes a node in a graph. Branch, compare, and refine ideas visually, then compile a clean PRD/prompt pack with one click to your repo or editor.

## Use Cases
- **Product/MVP kickoff**: Outline ideas, branch approaches, and choose the best path.
- **PM–Design–Eng collaboration**: Consolidate scattered ideas into a non‑linear, scannable, comparable structure.
- **Fast PRD standardization**: Generate a clean PRD/prompt pack from pinned blocks.
- **Learn from user feedback**: Attach evidence (quotes, docs) and keep traceable citations.
- **Integrate into dev workflow**: Download Markdown or push a branch/PR to GitHub.

## Core features
- **Infinite Canvas + Graph**: Create/edit/delete blocks (title + markdown), with typed edges (expands/refines/contradicts/depends/... ).
- **Context‑aware Subchat**: Chat with the context of nearby pinned blocks and related Evidence.
- **Auto‑Fanout**: Generate six standard child sections (Features, Personas, Value Prop, UX, Architecture, Risks).
- **Pin/Hide & Refactor**: Curate content, cluster, retitle, add dependency/contradiction relationships.
- **PRD Compiler**: Deduplicate, order by standard outline, add citation footnotes and appendix.
- **Export**: Download `.md`, or open a PR containing `docs/PRD.md` and `prompts/*.md`.

## User Flow
1. **Ideate → Fanout**: Create a root idea block, click Auto‑Fanout to generate six structured children.
2. **In‑context subchat**: Open subchat in each block to deepen content with graph context.
3. **Curate & Structure**: Pin strong blocks, hide weak branches, add relationships (contradicts/depends), arrange clusters.
4. **Compile & Export**: Click Compile PRD to produce Markdown (with footnotes/appendix), then download or open a PR to GitHub.