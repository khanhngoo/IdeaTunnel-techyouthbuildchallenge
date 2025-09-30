// Global state management using Zustand
// Provides reactive state for the entire Weaveboard application

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Block, Edge, ViewLayout, BlockKind, EdgeType, LayoutRecord } from '@/types/graph';
import { localdb } from './db.dexie';

// State interface
interface State {
  // Core data
  blocks: Record<string, Block>;
  edges: Record<string, Edge>;
  layout: ViewLayout;
  
  // UI state
  selectedBlocks: Set<string>;
  hoveredBlock: string | null;
  isDragging: boolean;
  searchQuery: string;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Error handling
  error: string | null;
}

// Actions interface
interface Actions {
  // Block operations
  createBlock: (block: Omit<Block, 'id' | 'created_at' | 'updated_at'>) => Promise<Block>;
  updateBlock: (id: string, updates: Partial<Block>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  getBlock: (id: string) => Block | undefined;
  getAllBlocks: () => Block[];
  getBlocksByKind: (kind: BlockKind) => Block[];
  getPinnedBlocks: () => Block[];
  getVisibleBlocks: () => Block[];
  
  // Edge operations
  createEdge: (from: string, to: string, type: EdgeType) => Promise<Edge>;
  updateEdge: (id: string, updates: Partial<Edge>) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  getEdgesFrom: (blockId: string) => Edge[];
  getEdgesTo: (blockId: string) => Edge[];
  getAllEdges: () => Edge[];
  
  // Layout operations
  setLayout: (id: string, layout: { x: number; y: number; w: number; h: number }) => Promise<void>;
  getLayout: (id: string) => ViewLayout[string] | undefined;
  updateLayout: (id: string, updates: Partial<ViewLayout[string]>) => void;
  
  // Selection operations
  selectBlock: (id: string) => void;
  deselectBlock: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  
  // UI state operations
  setHoveredBlock: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Block actions
  pinBlock: (id: string) => Promise<void>;
  unpinBlock: (id: string) => Promise<void>;
  hideBlock: (id: string) => Promise<void>;
  showBlock: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleHide: (id: string) => Promise<void>;
  
  // Search operations
  searchBlocks: (query: string) => Promise<Block[]>;
  
  // Graph traversal
  getChildren: (blockId: string) => Block[];
  getParents: (blockId: string) => Block[];
  getNeighbors: (blockId: string) => Block[];
  
  // Data persistence
  loadFromDB: () => Promise<void>;
  saveToDB: () => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Utility operations
  clearAll: () => Promise<void>;
  exportData: () => Promise<{ blocks: Block[]; edges: Edge[]; layouts: ViewLayout }>;
  importData: (data: { blocks: Block[]; edges: Edge[]; layouts: ViewLayout }) => Promise<void>;
}

// Combined store type
type BoardStore = State & Actions;

// Generate unique ID
const generateId = (prefix: string = 'block'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create the store
export const useBoard = create<BoardStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    blocks: {},
    edges: {},
    layout: {},
    selectedBlocks: new Set(),
    hoveredBlock: null,
    isDragging: false,
    searchQuery: '',
    isLoading: false,
    isSaving: false,
    error: null,

    // Block operations
    createBlock: async (blockData) => {
      try {
        set({ isLoading: true, error: null });
        
        const block: Block = {
          ...blockData,
          id: generateId('block'),
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        // Save to database
        await localdb.createBlock(block);

        // Update state
        set(state => ({
          blocks: { ...state.blocks, [block.id]: block },
          isLoading: false,
        }));

        return block;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create block',
          isLoading: false 
        });
        throw error;
      }
    },

    updateBlock: async (id, updates) => {
      try {
        set({ isSaving: true, error: null });
        
        // Update in database
        await localdb.updateBlock(id, updates);

        // Update state
        set(state => ({
          blocks: {
            ...state.blocks,
            [id]: { ...state.blocks[id], ...updates, updated_at: Date.now() }
          },
          isSaving: false,
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update block',
          isSaving: false 
        });
        throw error;
      }
    },

    deleteBlock: async (id) => {
      try {
        set({ isSaving: true, error: null });
        
        // Delete from database
        await localdb.deleteBlock(id);

        // Update state
        set(state => {
          const newBlocks = { ...state.blocks };
          delete newBlocks[id];
          
          const newEdges = { ...state.edges };
          Object.values(newEdges).forEach(edge => {
            if (edge.from === id || edge.to === id) {
              delete newEdges[edge.id];
            }
          });

          const newLayout = { ...state.layout };
          delete newLayout[id];

          const newSelectedBlocks = new Set(state.selectedBlocks);
          newSelectedBlocks.delete(id);

          return {
            blocks: newBlocks,
            edges: newEdges,
            layout: newLayout,
            selectedBlocks: newSelectedBlocks,
            isSaving: false,
          };
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete block',
          isSaving: false 
        });
        throw error;
      }
    },

    getBlock: (id) => get().blocks[id],
    getAllBlocks: () => Object.values(get().blocks),
    getBlocksByKind: (kind) => Object.values(get().blocks).filter(block => block.kind === kind),
    getPinnedBlocks: () => Object.values(get().blocks).filter(block => block.pinned),
    getVisibleBlocks: () => Object.values(get().blocks).filter(block => !block.hidden),

    // Edge operations
    createEdge: async (from, to, type) => {
      try {
        set({ isSaving: true, error: null });
        
        const edge: Edge = {
          id: generateId('edge'),
          from,
          to,
          type,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        // Save to database
        await localdb.createEdge(edge);

        // Update state
        set(state => ({
          edges: { ...state.edges, [edge.id]: edge },
          isSaving: false,
        }));

        return edge;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create edge',
          isSaving: false 
        });
        throw error;
      }
    },

    updateEdge: async (id, updates) => {
      try {
        set({ isSaving: true, error: null });
        
        // Update in database
        await localdb.updateEdge(id, updates);

        // Update state
        set(state => ({
          edges: {
            ...state.edges,
            [id]: { ...state.edges[id], ...updates, updated_at: Date.now() }
          },
          isSaving: false,
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update edge',
          isSaving: false 
        });
        throw error;
      }
    },

    deleteEdge: async (id) => {
      try {
        set({ isSaving: true, error: null });
        
        // Delete from database
        await localdb.deleteEdge(id);

        // Update state
        set(state => {
          const newEdges = { ...state.edges };
          delete newEdges[id];
          return { edges: newEdges, isSaving: false };
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete edge',
          isSaving: false 
        });
        throw error;
      }
    },

    getEdgesFrom: (blockId) => Object.values(get().edges).filter(edge => edge.from === blockId),
    getEdgesTo: (blockId) => Object.values(get().edges).filter(edge => edge.to === blockId),
    getAllEdges: () => Object.values(get().edges),

    // Layout operations
    setLayout: async (id, layout) => {
      try {
        // Save to database
        await localdb.setLayout(id, layout);

        // Update state
        set(state => ({
          layout: { ...state.layout, [id]: layout },
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to set layout' });
        throw error;
      }
    },

    getLayout: (id) => get().layout[id],
    updateLayout: (id, updates) => {
      set(state => ({
        layout: {
          ...state.layout,
          [id]: { ...state.layout[id], ...updates }
        }
      }));
    },

    // Selection operations
    selectBlock: (id) => {
      set(state => ({
        selectedBlocks: new Set([...state.selectedBlocks, id])
      }));
    },

    deselectBlock: (id) => {
      set(state => {
        const newSelected = new Set(state.selectedBlocks);
        newSelected.delete(id);
        return { selectedBlocks: newSelected };
      });
    },

    selectMultiple: (ids) => {
      set({ selectedBlocks: new Set(ids) });
    },

    clearSelection: () => {
      set({ selectedBlocks: new Set() });
    },

    toggleSelection: (id) => {
      set(state => {
        const newSelected = new Set(state.selectedBlocks);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return { selectedBlocks: newSelected };
      });
    },

    // UI state operations
    setHoveredBlock: (id) => set({ hoveredBlock: id }),
    setDragging: (isDragging) => set({ isDragging }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Block actions
    pinBlock: async (id) => {
      await get().updateBlock(id, { pinned: true });
    },

    unpinBlock: async (id) => {
      await get().updateBlock(id, { pinned: false });
    },

    hideBlock: async (id) => {
      await get().updateBlock(id, { hidden: true });
    },

    showBlock: async (id) => {
      await get().updateBlock(id, { hidden: false });
    },

    togglePin: async (id) => {
      const block = get().blocks[id];
      if (block) {
        await get().updateBlock(id, { pinned: !block.pinned });
      }
    },

    toggleHide: async (id) => {
      const block = get().blocks[id];
      if (block) {
        await get().updateBlock(id, { hidden: !block.hidden });
      }
    },

    // Search operations
    searchBlocks: async (query) => {
      try {
        set({ isLoading: true, error: null });
        const results = await localdb.searchBlocks(query);
        set({ isLoading: false });
        return results;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Search failed',
          isLoading: false 
        });
        return [];
      }
    },

    // Graph traversal
    getChildren: (blockId) => {
      const edges = get().getEdgesFrom(blockId);
      const childIds = edges.map(edge => edge.to);
      return childIds.map(id => get().blocks[id]).filter(Boolean);
    },

    getParents: (blockId) => {
      const edges = get().getEdgesTo(blockId);
      const parentIds = edges.map(edge => edge.from);
      return parentIds.map(id => get().blocks[id]).filter(Boolean);
    },

    getNeighbors: (blockId) => {
      const [children, parents] = [get().getChildren(blockId), get().getParents(blockId)];
      return [...children, ...parents];
    },

    // Data persistence
    loadFromDB: async () => {
      try {
        set({ isLoading: true, error: null });
        
        const [blocks, edges, layouts] = await Promise.all([
          localdb.getAllBlocks(),
          localdb.getAllEdges(),
          localdb.getAllLayouts(),
        ]);

        // Convert arrays to records
        const blocksRecord = blocks.reduce((acc, block) => {
          acc[block.id] = block;
          return acc;
        }, {} as Record<string, Block>);

        const edgesRecord = edges.reduce((acc, edge) => {
          acc[edge.id] = edge;
          return acc;
        }, {} as Record<string, Edge>);

        set({
          blocks: blocksRecord,
          edges: edgesRecord,
          layout: layouts,
          isLoading: false,
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load data',
          isLoading: false 
        });
      }
    },

    saveToDB: async () => {
      // Data is already saved to DB in individual operations
      // This method is for explicit save operations if needed
      set({ isSaving: false });
    },

    // Error handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Utility operations
    clearAll: async () => {
      try {
        set({ isLoading: true, error: null });
        await localdb.clearAll();
        set({
          blocks: {},
          edges: {},
          layout: {},
          selectedBlocks: new Set(),
          hoveredBlock: null,
          isLoading: false,
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to clear data',
          isLoading: false 
        });
      }
    },

    exportData: async () => {
      const { blocks, edges, layouts } = await localdb.exportData();
      // Convert LayoutRecord[] to ViewLayout
      const viewLayout: ViewLayout = {};
      layouts.forEach(layout => {
        viewLayout[layout.id] = {
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h,
        };
      });
      return { blocks, edges, layouts: viewLayout };
    },

    importData: async (data) => {
      try {
        set({ isLoading: true, error: null });
        // Convert ViewLayout to LayoutRecord[]
        const layoutRecords: LayoutRecord[] = Object.entries(data.layouts).map(([id, layout]) => ({
          id,
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h,
          updated_at: Date.now(),
        }));
        
        await localdb.importData({
          blocks: data.blocks,
          edges: data.edges,
          layouts: layoutRecords,
          files: [], // Empty files array for now
        });
        await get().loadFromDB();
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to import data',
          isLoading: false 
        });
      }
    },
  }))
);

// Auto-load data on store initialization
if (typeof window !== 'undefined') {
  useBoard.getState().loadFromDB();
}
