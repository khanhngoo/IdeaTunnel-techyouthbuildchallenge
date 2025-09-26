Weaveboard – Roadmap (Next Steps)

1) Prompts – formatted content (DONE)
- Updated `src/lib/prompts.ts` to emit `content` (Markdown) instead of `bullets`.
- Kept backward-compat: `types/graph.ts` now allows `{ content?: string; bullets?: string[] }`.
- `RootChatDefinition` consumes `content` first, fallback to `bullets`.

2) Multi-chat canvases (DONE)
- Added `app/workflow/[chatId]/page.tsx` to route per chat.
- `Canvas` accepts `persistenceKey` prop and uses it for `Tldraw`.
- `AppSidebar` now client-side: create chat → save to `localStorage` → navigate.

3) Supabase MCP – schema & setup (NEXT)
- Tables (proposal):
  - `profiles` (id uuid pk, email text, display_name text, created_at timestamptz)
  - `workspaces` (id uuid pk, owner uuid fk→profiles.id, title text, created_at)
  - `chats` (id uuid pk, workspace_id uuid fk, title text, created_at)
  - `blocks` (id uuid pk, chat_id uuid fk, title text, content_md text, kind text, pinned bool, hidden bool, tags text[], created_at, updated_at)
  - `edges` (id uuid pk, chat_id uuid fk, from uuid fk→blocks.id, to uuid fk→blocks.id, type text, created_at, updated_at)
  - (stretch) `evidence` (id uuid pk, chat_id fk, persona text, quote text, tags text[], sentiment text, date text, source text, confidence float)
- RLS: enable per user (tenant) by `auth.uid()` ↔ owner.
- Actions:
  - Create dev branch, apply migrations via MCP.
  - Generate TS types via MCP and wire into app.

4) Auth – Supabase (NEXT)
- Add `app/login/page.tsx` with Supabase OAuth/email.
- Add server helpers in `src/lib/supabase.server.ts` to get session/user.
- Gate `/workflow/*` by session; redirect to `/login` if unauth.

Implementation Plan (NEXT sprint)
- Supabase MCP:
  - Create branch `develop`.
  - Apply migration `0001_init.sql` with tables above and RLS policies.
  - Generate types and add to repo.
- Auth:
  - Add Login page and route handlers.
  - Wrap layout with session provider; protect routes.


