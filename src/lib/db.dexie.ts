// Local database using Dexie (IndexedDB wrapper)
// Provides offline-first persistence for Weaveboard

import Dexie, { Table } from 'dexie';
import { Block, Edge, ViewLayout, FileRecord, LayoutRecord } from '@/types/graph';

export class LocalDB extends Dexie {
  // Tables
  blocks!: Table<Block, string>;
  edges!: Table<Edge, string>;
  layout!: Table<LayoutRecord, string>;
  files!: Table<FileRecord, string>;

  constructor() {
    super('weaveboard');
    
    this.version(1).stores({
      // Primary key, indexes
      blocks: 'id, updated_at, kind, pinned, hidden, parent_ids',
      edges: 'id, from, to, type, updated_at',
      layout: 'id, updated_at',
      files: 'id, name, mime, created_at'
    });

    // Hooks for auto-updating timestamps
    this.blocks.hook('creating', (primKey, obj, trans) => {
      const now = Date.now();
      obj.created_at = now;
      obj.updated_at = now;
    });

    this.blocks.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updated_at = Date.now();
    });

    this.edges.hook('creating', (primKey, obj, trans) => {
      const now = Date.now();
      obj.created_at = now;
      obj.updated_at = now;
    });

    this.edges.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updated_at = Date.now();
    });

    this.layout.hook('creating', (primKey, obj, trans) => {
      obj.updated_at = Date.now();
    });

    this.layout.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updated_at = Date.now();
    });
  }

  // Block operations
  async createBlock(block: Omit<Block, 'created_at' | 'updated_at'>): Promise<Block> {
    const now = Date.now();
    const newBlock: Block = {
      ...block,
      created_at: now,
      updated_at: now,
    };
    await this.blocks.add(newBlock);
    return newBlock;
  }

  async updateBlock(id: string, updates: Partial<Block>): Promise<void> {
    await this.blocks.update(id, {
      ...updates,
      updated_at: Date.now(),
    });
  }

  async deleteBlock(id: string): Promise<void> {
    // Delete the block
    await this.blocks.delete(id);
    
    // Delete all edges connected to this block
    await this.edges.where('from').equals(id).delete();
    await this.edges.where('to').equals(id).delete();
    
    // Delete layout record
    await this.layout.delete(id);
  }

  async getBlock(id: string): Promise<Block | undefined> {
    return await this.blocks.get(id);
  }

  async getAllBlocks(): Promise<Block[]> {
    return await this.blocks.orderBy('updated_at').reverse().toArray();
  }

  async getBlocksByKind(kind: Block['kind']): Promise<Block[]> {
    return await this.blocks.where('kind').equals(kind).toArray();
  }

  async getPinnedBlocks(): Promise<Block[]> {
    return await this.blocks.where('pinned').equals(1).toArray();
  }

  async getVisibleBlocks(): Promise<Block[]> {
    return await this.blocks.where('hidden').equals(0).toArray();
  }

  // Edge operations
  async createEdge(edge: Omit<Edge, 'id' | 'created_at' | 'updated_at'>): Promise<Edge> {
    const now = Date.now();
    const newEdge: Edge = {
      ...edge,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now,
    };
    await this.edges.add(newEdge);
    return newEdge;
  }

  async updateEdge(id: string, updates: Partial<Edge>): Promise<void> {
    await this.edges.update(id, {
      ...updates,
      updated_at: Date.now(),
    });
  }

  async deleteEdge(id: string): Promise<void> {
    await this.edges.delete(id);
  }

  async getEdgesFrom(blockId: string): Promise<Edge[]> {
    return await this.edges.where('from').equals(blockId).toArray();
  }

  async getEdgesTo(blockId: string): Promise<Edge[]> {
    return await this.edges.where('to').equals(blockId).toArray();
  }

  async getAllEdges(): Promise<Edge[]> {
    return await this.edges.orderBy('updated_at').reverse().toArray();
  }

  async getEdgesByType(type: Edge['type']): Promise<Edge[]> {
    return await this.edges.where('type').equals(type).toArray();
  }

  // Layout operations
  async setLayout(id: string, layout: { x: number; y: number; w: number; h: number }): Promise<void> {
    const now = Date.now();
    await this.layout.put({
      id,
      ...layout,
      updated_at: now,
    });
  }

  async getLayout(id: string): Promise<LayoutRecord | undefined> {
    return await this.layout.get(id);
  }

  async getAllLayouts(): Promise<ViewLayout> {
    const layouts = await this.layout.toArray();
    const result: ViewLayout = {};
    layouts.forEach(layout => {
      result[layout.id] = {
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
      };
    });
    return result;
  }

  // File operations
  async storeFile(file: Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const now = Date.now();
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFile: FileRecord = {
      ...file,
      id,
      created_at: now,
      updated_at: now,
    };
    await this.files.add(newFile);
    return id;
  }

  async getFile(id: string): Promise<FileRecord | undefined> {
    return await this.files.get(id);
  }

  async deleteFile(id: string): Promise<void> {
    await this.files.delete(id);
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return await this.files.orderBy('created_at').reverse().toArray();
  }

  // Search operations
  async searchBlocks(query: string): Promise<Block[]> {
    const lowerQuery = query.toLowerCase();
    return await this.blocks
      .filter(block => 
        block.title.toLowerCase().includes(lowerQuery) ||
        block.content_md.toLowerCase().includes(lowerQuery) ||
        block.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  // Graph traversal operations
  async getChildren(blockId: string): Promise<Block[]> {
    const childEdges = await this.edges.where('from').equals(blockId).toArray();
    const childIds = childEdges.map(edge => edge.to);
    return await this.blocks.where('id').anyOf(childIds).toArray();
  }

  async getParents(blockId: string): Promise<Block[]> {
    const parentEdges = await this.edges.where('to').equals(blockId).toArray();
    const parentIds = parentEdges.map(edge => edge.from);
    return await this.blocks.where('id').anyOf(parentIds).toArray();
  }

  async getNeighbors(blockId: string): Promise<Block[]> {
    const [children, parents] = await Promise.all([
      this.getChildren(blockId),
      this.getParents(blockId)
    ]);
    return [...children, ...parents];
  }

  // Utility operations
  async clearAll(): Promise<void> {
    await Promise.all([
      this.blocks.clear(),
      this.edges.clear(),
      this.layout.clear(),
      this.files.clear(),
    ]);
  }

  async exportData(): Promise<{
    blocks: Block[];
    edges: Edge[];
    layouts: LayoutRecord[];
    files: FileRecord[];
  }> {
    const [blocks, edges, layouts, files] = await Promise.all([
      this.blocks.toArray(),
      this.edges.toArray(),
      this.layout.toArray(),
      this.files.toArray(),
    ]);

    return { blocks, edges, layouts, files };
  }

  async importData(data: {
    blocks: Block[];
    edges: Edge[];
    layouts: LayoutRecord[];
    files: FileRecord[];
  }): Promise<void> {
    await this.clearAll();
    
    await Promise.all([
      this.blocks.bulkAdd(data.blocks),
      this.edges.bulkAdd(data.edges),
      this.layout.bulkAdd(data.layouts),
      this.files.bulkAdd(data.files),
    ]);
  }
}

// Export singleton instance
export const localdb = new LocalDB();
