// Core types for Weaveboard graph system
// This file is the single source of truth for all graph-related types

export type BlockID = string;
export type EdgeID = string;

export type BlockKind = 'prompt' | 'response' | 'note' | 'section' | 'evidence' | 'dataset';
export type EdgeType = 'expands' | 'refines' | 'contradicts' | 'depends' | 'supports' | 'refutes' | 'informs';

export interface Block {
  id: BlockID;
  title: string;
  content_md: string;              // markdown content
  kind: BlockKind;
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

export interface Edge {
  id: EdgeID;
  from: BlockID;
  to: BlockID;
  type: EdgeType;
  created_at: number;
  updated_at: number;
}

export interface ViewLayout {
  [id: string]: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// Additional types for specific features
export interface EvidenceData {
  persona?: string;
  quote: string;
  snippet?: string;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  date?: string;
  source: string;
  confidence: number;
}

export interface FanoutSection {
  title: string;
  bullets: string[];
}

export interface FanoutResponse {
  sections: FanoutSection[];
}

export interface SubchatContext {
  neighbors: Array<{
    id: BlockID;
    title: string;
    content_md: string;
    kind: BlockKind;
  }>;
  evidenceIds: BlockID[];
}

export interface SubchatRequest {
  blockId: BlockID;
  context: SubchatContext;
  prompt: string;
}

export interface SubchatResponse {
  title: string;
  content_md: string;
}

export interface RewriteRequest {
  featureId: BlockID;
  evidence: Array<{
    id: BlockID;
    quote: string;
    confidence: number;
  }>;
  instructions: string;
}

export interface RewriteResponse {
  content_md: string;
  confidence: number;
  diff: string;
}

// Database schema types
export interface FileRecord {
  id: string;
  name: string;
  mime: string;
  bytes: ArrayBuffer;
  created_at: number;
  updated_at: number;
}

export interface LayoutRecord {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  updated_at: number;
}

// RAG types
export interface ChunkRecord {
  id: string;
  workspace_id: string;
  content: string;
  meta: Record<string, any>;
  embedding: number[];
  created_at: number;
}

// API Simulation types
export interface APINode {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  example: Record<string, any>;
  mockResponse?: Record<string, any>;
}

export interface APIFlow {
  id: string;
  name: string;
  nodes: APINode[];
  connections: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
}

// Export types
export interface PRDExport {
  title: string;
  content: string;
  footnotes: Record<string, string>;
  appendix: string;
  changeLog: Array<{
    date: string;
    change: string;
    evidence: string[];
  }>;
}

export interface GitHubExport {
  branch: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  prTitle: string;
  prDescription: string;
}
