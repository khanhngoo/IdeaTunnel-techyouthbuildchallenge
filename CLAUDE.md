# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IdeaTunnel is a visual workflow builder for AI-powered product ideation. It uses a canvas-based interface (powered by tldraw) where users create interconnected nodes representing different stages of product development (ideas, specifications, documentation).

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build with Turbopack
npm run build

# Start production server
npm start

# Lint codebase
npm run lint
```

The app runs on http://localhost:3000 by default.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.3 with App Router and Turbopack
- **UI Library**: React 19 with TypeScript
- **Canvas Engine**: tldraw 4.0.2 (custom shapes and bindings)
- **State Management**: Zustand (client-side state), Supabase (persistence)
- **Database**: Supabase (optional, falls back to localStorage + Dexie)
- **AI Integration**: Google Generative AI (Gemini), Vercel AI SDK
- **Styling**: Tailwind CSS 4, shadcn/ui components

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Route group: login, register
│   ├── (main)/              # Route group: dashboard, workflow pages
│   ├── api/                 # API routes (all consolidated here)
│   │   ├── llm/            # LLM endpoints (rewrite, fanout)
│   │   ├── rag/            # RAG endpoints (query, ingest)
│   │   ├── sim/            # Simulation endpoints
│   │   └── compile/        # Compilation endpoints
│   ├── landing-page/
│   ├── layout.tsx
│   └── page.tsx
├── features/                # Feature-based organization
│   ├── workflow/           # Main workflow canvas feature
│   │   ├── components/     # Canvas, toolbar, overlays, constants
│   │   ├── nodes/          # Node definitions (message, rootchat)
│   │   ├── ports/          # Port system for node connections
│   │   ├── connection/     # Connection shapes and bindings
│   │   └── utils/          # Workflow utilities, auto-layout
│   └── rag/                # Future RAG features
├── components/             # Shared UI components (shadcn/ui)
│   └── ui/
├── lib/                    # Core utilities
│   ├── db/                 # Database clients (supabase, dexie)
│   ├── stores/             # Zustand stores
│   └── utils.ts
├── services/               # Business logic
│   ├── prompts.ts          # LLM prompt templates
│   ├── prd.ts              # PRD compilation logic
│   ├── graph.ts            # Graph operations
│   ├── sim.ts              # Simulation logic
│   └── rag.ts              # RAG logic
├── hooks/                  # Shared React hooks
└── types/                  # Shared TypeScript types
```

### Key Architectural Patterns

#### 1. Canvas System (tldraw-based)
The workflow canvas extends tldraw's shape system with custom nodes and connections:

- **NodeShapeUtil** (`features/workflow/nodes/NodeShapeUtil.tsx`): Defines how nodes render and behave
- **ConnectionShapeUtil** (`features/workflow/connection/ConnectionShapeUtil.tsx`): Defines connections between nodes
- **ConnectionBindingUtil**: Manages relationships between nodes via ports
- **Port System** (`features/workflow/ports/`): Input/output ports on nodes for creating connections

Each node type (message, rootchat) has a Definition class that specifies:
- Default properties
- Port configuration (inputs/outputs)
- Component rendering
- Validation schema

#### 2. Authentication & Data Persistence
Dual-mode system:
- **With Supabase**: User auth (Google OAuth, email/password), workspace/chat persistence
- **Without Supabase**: Falls back to localStorage for chat metadata, Dexie for canvas data

Check `isSupabaseConfigured()` before using Supabase features.

#### 3. AI Integration
- **Gemini Flash** used for all LLM operations
- **Streaming API** (`/api/stream`, `/api/workflow/stream-nodes`) for real-time responses
- **Fanout pattern** (`/api/llm/fanout`): Generates structured product documentation (Product Brief, Technical Spec, Codebase Guide)
- **Prompts** defined in `services/prompts.ts`

#### 4. Route Groups
Uses Next.js route groups for layout separation:
- `(auth)`: Login/register pages (minimal layout)
- `(main)`: Dashboard and workflow pages (sidebar layout)

### Important Files

#### Core Canvas
- `features/workflow/components/Canvas.tsx`: Main canvas component, integrates tldraw with custom tools
- `features/workflow/components/WorkflowToolbar.tsx`: Custom toolbar with node creation, layout actions
- `features/workflow/components/constants.tsx`: Shared constants (node dimensions, spacing)

#### Node System
- `features/workflow/nodes/nodeTypes.tsx`: Registry of all node types
- `features/workflow/nodes/nodePorts.tsx`: Port connection utilities
- `features/workflow/nodes/types/shared.tsx`: Base NodeDefinition class and interfaces

#### State Management
- `lib/stores/canvas-store.ts`: Canvas metadata (title, summary, creation date)
- `lib/stores/store.ts`: Global app state

#### Database
- `lib/db/supabase.client.ts`: Client-side Supabase with `ensureUserBootstrap()` helper
- `lib/db/supabase.server.ts`: Server-side Supabase
- `lib/db/db.dexie.ts`: Dexie (IndexedDB) for local persistence

### Environment Variables

Required in `.env.local`:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=       # For Gemini AI
NEXT_PUBLIC_SUPABASE_URL=            # Optional: Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Optional: Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=           # Optional: Server-side Supabase
```

### Import Path Aliases

Use `@/` prefix for all imports:
```typescript
@/components       → src/components
@/lib/db           → src/lib/db
@/lib/stores       → src/lib/stores
@/services         → src/services
@/features/workflow → src/features/workflow
```

### Code Style Notes

- All tldraw-related components must be client components (`"use client"`)
- Dynamic imports used for Canvas components to prevent SSR issues
- ESLint disabled during builds (`next.config.ts`)
- Turbopack enabled for faster dev/build times
