'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CMSPage,
  CMSBlock,
  EditorState,
  EditorAction,
  Breakpoint,
  HistoryEntry,
  BlockDefinition,
} from '@/types/cms';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';

// =====================================================
// INITIAL STATE
// =====================================================

const initialState: EditorState = {
  page: null,
  blocks: [],
  selectedBlockId: null,
  hoveredBlockId: null,
  draggedBlockId: null,
  breakpoint: 'desktop',
  zoom: 100,
  showGrid: false,
  showOutlines: true,
  isPreviewing: false,
  isLoading: true,
  isSaving: false,
  hasUnsavedChanges: false,
  undoStack: [],
  redoStack: [],
  clipboard: null,
};

// =====================================================
// REDUCER
// =====================================================

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_PAGE':
      return {
        ...state,
        page: action.payload,
        isLoading: false,
      };

    case 'SET_BLOCKS': {
      return {
        ...state,
        blocks: action.payload,
        isLoading: false,
      };
    }

    case 'SELECT_BLOCK':
      return {
        ...state,
        selectedBlockId: action.payload,
      };

    case 'HOVER_BLOCK':
      return {
        ...state,
        hoveredBlockId: action.payload,
      };

    case 'ADD_BLOCK': {
      const { block, parentId, index } = action.payload;
      const newBlocks = [...state.blocks];

      // Update positions for existing blocks
      const siblingBlocks = newBlocks.filter((b) => b.parent_id === parentId);
      const insertIndex = index ?? siblingBlocks.length;

      siblingBlocks.forEach((b) => {
        if (b.position >= insertIndex) {
          b.position += 1;
        }
      });

      // Set position for new block
      block.position = insertIndex;

      return {
        ...state,
        blocks: [...newBlocks, block],
        selectedBlockId: block.id,
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'ADD_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'UPDATE_BLOCK': {
      const { id, updates } = action.payload;
      return {
        ...state,
        blocks: state.blocks.map((block) =>
          block.id === id ? { ...block, ...updates, updated_at: new Date().toISOString() } : block
        ),
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'UPDATE_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'DELETE_BLOCK': {
      const blockId = action.payload;

      // Get all descendant block IDs
      const getDescendantIds = (id: string): string[] => {
        const children = state.blocks.filter((b) => b.parent_id === id);
        return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
      };

      const idsToDelete = new Set(getDescendantIds(blockId));

      return {
        ...state,
        blocks: state.blocks.filter((b) => !idsToDelete.has(b.id)),
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'DELETE_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'MOVE_BLOCK': {
      const { id, parentId, index } = action.payload;
      const block = state.blocks.find((b) => b.id === id);
      if (!block) return state;

      const newBlocks = state.blocks.map((b) => {
        if (b.id === id) {
          return { ...b, parent_id: parentId, position: index };
        }
        // Update positions of siblings
        if (b.parent_id === parentId && b.position >= index && b.id !== id) {
          return { ...b, position: b.position + 1 };
        }
        return b;
      });

      return {
        ...state,
        blocks: newBlocks,
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'MOVE_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'DUPLICATE_BLOCK': {
      const blockId = action.payload;
      const block = state.blocks.find((b) => b.id === blockId);
      if (!block) return state;

      // Deep clone the block and its children
      const cloneBlock = (b: CMSBlock, newParentId?: string): CMSBlock[] => {
        const newId = uuidv4();
        const cloned: CMSBlock = {
          ...b,
          id: newId,
          parent_id: newParentId ?? b.parent_id,
          name: b.name ? `${b.name} (copy)` : undefined,
          position: newParentId ? b.position : b.position + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const children = state.blocks.filter((child) => child.parent_id === b.id);
        const clonedChildren = children.flatMap((child) => cloneBlock(child, newId));

        return [cloned, ...clonedChildren];
      };

      const newBlocks = cloneBlock(block);

      return {
        ...state,
        blocks: [...state.blocks, ...newBlocks],
        selectedBlockId: newBlocks[0].id,
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'DUPLICATE_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'COPY_BLOCK': {
      const block = state.blocks.find((b) => b.id === action.payload);
      return {
        ...state,
        clipboard: block || null,
      };
    }

    case 'PASTE_BLOCK': {
      if (!state.clipboard) return state;

      const { parentId, index } = action.payload;
      const newId = uuidv4();
      const pastedBlock: CMSBlock = {
        ...state.clipboard,
        id: newId,
        parent_id: parentId,
        position: index ?? state.blocks.filter((b) => b.parent_id === parentId).length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        ...state,
        blocks: [...state.blocks, pastedBlock],
        selectedBlockId: newId,
        hasUnsavedChanges: true,
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'PASTE_BLOCK' },
        ],
        redoStack: [],
      };
    }

    case 'SET_BREAKPOINT':
      return {
        ...state,
        breakpoint: action.payload,
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: action.payload,
      };

    case 'TOGGLE_GRID':
      return {
        ...state,
        showGrid: !state.showGrid,
      };

    case 'TOGGLE_OUTLINES':
      return {
        ...state,
        showOutlines: !state.showOutlines,
      };

    case 'TOGGLE_PREVIEW':
      return {
        ...state,
        isPreviewing: !state.isPreviewing,
        selectedBlockId: state.isPreviewing ? state.selectedBlockId : null,
      };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const previousEntry = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        blocks: previousEntry.blocks,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'UNDO' },
        ],
        hasUnsavedChanges: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const nextEntry = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        blocks: nextEntry.blocks,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          { blocks: state.blocks, timestamp: Date.now(), action: 'REDO' },
        ],
        hasUnsavedChanges: true,
      };
    }

    case 'SAVE_START':
      return {
        ...state,
        isSaving: true,
      };

    case 'SAVE_END':
      return {
        ...state,
        isSaving: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        hasUnsavedChanges: false,
        isSaving: false,
      };

    default:
      return state;
  }
}

// =====================================================
// CONTEXT
// =====================================================

interface PageBuilderContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;

  // Page operations
  loadPage: (pageId: string) => Promise<void>;
  createPage: (page: Partial<CMSPage>) => Promise<CMSPage | null>;
  savePage: () => Promise<boolean>;
  publishPage: () => Promise<boolean>;

  // Block operations
  addBlock: (type: string, parentId?: string, index?: number) => void;
  updateBlock: (id: string, updates: Partial<CMSBlock>) => void;
  updateBlockProps: (id: string, props: Record<string, unknown>) => void;
  updateBlockStyles: (id: string, breakpoint: Breakpoint, styles: Record<string, unknown>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, parentId: string | undefined, index: number) => void;
  duplicateBlock: (id: string) => void;
  copyBlock: (id: string) => void;
  pasteBlock: (parentId?: string, index?: number) => void;

  // Selection
  selectBlock: (id: string | null) => void;
  hoverBlock: (id: string | null) => void;
  getSelectedBlock: () => CMSBlock | null;
  getBlockById: (id: string) => CMSBlock | undefined;
  getChildBlocks: (parentId?: string) => CMSBlock[];

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // View
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleOutlines: () => void;
  togglePreview: () => void;

  // Block definitions
  blockDefinitions: BlockDefinition[];
  getBlockDefinition: (type: string) => BlockDefinition | undefined;
}

const PageBuilderContext = createContext<PageBuilderContextValue | null>(null);

// =====================================================
// PROVIDER
// =====================================================

interface PageBuilderProviderProps {
  children: ReactNode;
  pageId?: string;
}

export function PageBuilderProvider({ children, pageId }: PageBuilderProviderProps) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const toast = useToast();
  const supabase = createClient();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [blockDefinitions, setBlockDefinitions] = React.useState<BlockDefinition[]>([]);

  // Load block definitions
  useEffect(() => {
    async function loadBlockDefinitions() {
      const { data, error } = await supabase
        .from('cms_block_definitions')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('Failed to load block definitions:', error);
        return;
      }

      setBlockDefinitions(data || []);
    }

    loadBlockDefinitions();
  }, [supabase]);

  // Load page
  const loadPage = useCallback(
    async (id: string) => {
      try {
        // Load page
        const { data: page, error: pageError } = await supabase
          .from('cms_pages')
          .select('*')
          .eq('id', id)
          .single();

        if (pageError) throw pageError;

        // Load blocks
        const { data: blocks, error: blocksError } = await supabase
          .from('cms_blocks')
          .select('*')
          .eq('page_id', id)
          .order('position', { ascending: true });

        if (blocksError) throw blocksError;

        dispatch({ type: 'SET_PAGE', payload: page });
        dispatch({ type: 'SET_BLOCKS', payload: blocks || [] });
      } catch (error) {
        console.error('Failed to load page:', error);
        toast.error('Failed to load page');
      }
    },
    [supabase, toast]
  );

  // Create page
  const createPage = useCallback(
    async (pageData: Partial<CMSPage>): Promise<CMSPage | null> => {
      try {
        const { data, error } = await supabase
          .from('cms_pages')
          .insert({
            slug: pageData.slug || `page-${Date.now()}`,
            name: pageData.name || 'Untitled Page',
            title: pageData.title,
            description: pageData.description,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;

        dispatch({ type: 'SET_PAGE', payload: data });
        dispatch({ type: 'SET_BLOCKS', payload: [] });
        toast.success('Page created');
        return data;
      } catch (error) {
        console.error('Failed to create page:', error);
        toast.error('Failed to create page');
        return null;
      }
    },
    [supabase, toast]
  );

  // Save page
  const savePage = useCallback(async (): Promise<boolean> => {
    if (!state.page) return false;

    dispatch({ type: 'SAVE_START' });

    try {
      // Update page
      const { error: pageError } = await supabase
        .from('cms_pages')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.page.id);

      if (pageError) throw pageError;

      // Delete existing blocks and re-insert (simplest approach for ordering)
      const { error: deleteError } = await supabase
        .from('cms_blocks')
        .delete()
        .eq('page_id', state.page.id);

      if (deleteError) throw deleteError;

      if (state.blocks.length > 0) {
        const blocksToInsert = state.blocks.map((block) => ({
          id: block.id,
          page_id: state.page!.id,
          parent_id: block.parent_id || null,
          type: block.type,
          name: block.name,
          props: block.props,
          styles: block.styles,
          position: block.position,
          is_locked: block.is_locked,
          is_hidden: block.is_hidden,
        }));

        const { error: insertError } = await supabase.from('cms_blocks').insert(blocksToInsert);

        if (insertError) throw insertError;
      }

      dispatch({ type: 'MARK_SAVED' });
      return true;
    } catch (error) {
      console.error('Failed to save page:', error);
      toast.error('Failed to save page');
      dispatch({ type: 'SAVE_END' });
      return false;
    }
  }, [state.page, state.blocks, supabase, toast]);

  // Publish page
  const publishPage = useCallback(async (): Promise<boolean> => {
    if (!state.page) return false;

    const saved = await savePage();
    if (!saved) return false;

    try {
      const { error } = await supabase
        .from('cms_pages')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', state.page.id);

      if (error) throw error;

      dispatch({
        type: 'SET_PAGE',
        payload: { ...state.page, status: 'published', published_at: new Date().toISOString() },
      });

      toast.success('Page published');
      return true;
    } catch (error) {
      console.error('Failed to publish page:', error);
      toast.error('Failed to publish page');
      return false;
    }
  }, [state.page, savePage, supabase, toast]);

  // Auto-save
  useEffect(() => {
    if (state.hasUnsavedChanges && state.page) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        savePage();
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.page, savePage]);

  // Load page on mount
  useEffect(() => {
    if (pageId) {
      loadPage(pageId);
    }
  }, [pageId, loadPage]);

  // Block operations
  const addBlock = useCallback(
    (type: string, parentId?: string, index?: number) => {
      const definition = blockDefinitions.find((d) => d.type === type);
      if (!state.page) return;

      const newBlock: CMSBlock = {
        id: uuidv4(),
        page_id: state.page.id,
        parent_id: parentId,
        type,
        name: definition?.label,
        props: definition?.default_props || {},
        styles: {
          desktop: {},
          tablet: {},
          mobile: {},
        },
        position: index ?? 0,
        is_locked: false,
        is_hidden: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock, parentId, index } });
    },
    [state.page, blockDefinitions]
  );

  const updateBlock = useCallback((id: string, updates: Partial<CMSBlock>) => {
    dispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
  }, []);

  const updateBlockProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      const block = state.blocks.find((b) => b.id === id);
      if (!block) return;

      dispatch({
        type: 'UPDATE_BLOCK',
        payload: {
          id,
          updates: {
            props: { ...block.props, ...props },
          },
        },
      });
    },
    [state.blocks]
  );

  const updateBlockStyles = useCallback(
    (id: string, breakpoint: Breakpoint, styles: Record<string, unknown>) => {
      const block = state.blocks.find((b) => b.id === id);
      if (!block) return;

      dispatch({
        type: 'UPDATE_BLOCK',
        payload: {
          id,
          updates: {
            styles: {
              ...block.styles,
              [breakpoint]: { ...block.styles[breakpoint], ...styles },
            },
          },
        },
      });
    },
    [state.blocks]
  );

  const deleteBlock = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BLOCK', payload: id });
  }, []);

  const moveBlock = useCallback((id: string, parentId: string | undefined, index: number) => {
    dispatch({ type: 'MOVE_BLOCK', payload: { id, parentId, index } });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    dispatch({ type: 'DUPLICATE_BLOCK', payload: id });
  }, []);

  const copyBlock = useCallback((id: string) => {
    dispatch({ type: 'COPY_BLOCK', payload: id });
    toast.success('Block copied');
  }, [toast]);

  const pasteBlock = useCallback(
    (parentId?: string, index?: number) => {
      if (!state.clipboard) {
        toast.error('Nothing to paste');
        return;
      }
      dispatch({ type: 'PASTE_BLOCK', payload: { parentId, index } });
    },
    [state.clipboard, toast]
  );

  // Selection
  const selectBlock = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_BLOCK', payload: id });
  }, []);

  const hoverBlock = useCallback((id: string | null) => {
    dispatch({ type: 'HOVER_BLOCK', payload: id });
  }, []);

  const getSelectedBlock = useCallback(() => {
    if (!state.selectedBlockId) return null;
    return state.blocks.find((b) => b.id === state.selectedBlockId) || null;
  }, [state.selectedBlockId, state.blocks]);

  const getBlockById = useCallback(
    (id: string) => {
      return state.blocks.find((b) => b.id === id);
    },
    [state.blocks]
  );

  const getChildBlocks = useCallback(
    (parentId?: string) => {
      return state.blocks
        .filter((b) => b.parent_id === parentId)
        .sort((a, b) => a.position - b.position);
    },
    [state.blocks]
  );

  // History
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  // View
  const setBreakpoint = useCallback((breakpoint: Breakpoint) => {
    dispatch({ type: 'SET_BREAKPOINT', payload: breakpoint });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const toggleGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_GRID' });
  }, []);

  const toggleOutlines = useCallback(() => {
    dispatch({ type: 'TOGGLE_OUTLINES' });
  }, []);

  const togglePreview = useCallback(() => {
    dispatch({ type: 'TOGGLE_PREVIEW' });
  }, []);

  // Block definitions helper
  const getBlockDefinition = useCallback(
    (type: string) => {
      return blockDefinitions.find((d) => d.type === type);
    },
    [blockDefinitions]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((modKey && e.key === 'z' && e.shiftKey) || (modKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      // Save: Cmd/Ctrl + S
      if (modKey && e.key === 's') {
        e.preventDefault();
        savePage();
      }

      // Delete: Backspace or Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedBlockId) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteBlock(state.selectedBlockId);
        }
      }

      // Copy: Cmd/Ctrl + C
      if (modKey && e.key === 'c' && state.selectedBlockId) {
        e.preventDefault();
        copyBlock(state.selectedBlockId);
      }

      // Paste: Cmd/Ctrl + V
      if (modKey && e.key === 'v') {
        e.preventDefault();
        pasteBlock();
      }

      // Duplicate: Cmd/Ctrl + D
      if (modKey && e.key === 'd' && state.selectedBlockId) {
        e.preventDefault();
        duplicateBlock(state.selectedBlockId);
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        selectBlock(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.selectedBlockId,
    undo,
    redo,
    savePage,
    deleteBlock,
    copyBlock,
    pasteBlock,
    duplicateBlock,
    selectBlock,
  ]);

  const value: PageBuilderContextValue = {
    state,
    dispatch,
    loadPage,
    createPage,
    savePage,
    publishPage,
    addBlock,
    updateBlock,
    updateBlockProps,
    updateBlockStyles,
    deleteBlock,
    moveBlock,
    duplicateBlock,
    copyBlock,
    pasteBlock,
    selectBlock,
    hoverBlock,
    getSelectedBlock,
    getBlockById,
    getChildBlocks,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    setBreakpoint,
    setZoom,
    toggleGrid,
    toggleOutlines,
    togglePreview,
    blockDefinitions,
    getBlockDefinition,
  };

  return <PageBuilderContext.Provider value={value}>{children}</PageBuilderContext.Provider>;
}

// =====================================================
// HOOK
// =====================================================

export function usePageBuilder() {
  const context = useContext(PageBuilderContext);
  if (!context) {
    throw new Error('usePageBuilder must be used within a PageBuilderProvider');
  }
  return context;
}
