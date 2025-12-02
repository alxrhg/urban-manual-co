import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Drawer Store - Unified state management for all drawers/panels
 *
 * Features:
 * - Drawer stack for nested navigation
 * - Per-drawer data persistence
 * - Animation state machine
 * - Display modes (overlay/inline/fullscreen)
 * - Keyboard shortcut integration
 * - Preloading support
 * - History navigation
 */

// ============================================================================
// Types
// ============================================================================

export type DrawerType =
  | 'destination'
  | 'account'
  | 'account-new'
  | 'login'
  | 'chat'
  | 'trips'
  | 'trip-list'
  | 'trip-overview'
  | 'trip-overview-quick'
  | 'trip-settings'
  | 'trip-ai'
  | 'trip-add-hotel'
  | 'place-selector'
  | 'add-flight'
  | 'saved-places'
  | 'visited-places'
  | 'settings'
  | 'poi'
  | 'map'
  | 'create-trip'
  | 'quick-trip-selector'
  | 'search'
  | 'filters'
  | 'share'
  | null;

export type DisplayMode = 'overlay' | 'inline' | 'fullscreen';

export type AnimationState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerConfig {
  /** Unique identifier for the drawer instance */
  id: string;
  /** Type of drawer to render */
  type: DrawerType;
  /** Props to pass to the drawer component */
  props: Record<string, unknown>;
  /** Display mode */
  displayMode: DisplayMode;
  /** Animation state */
  animationState: AnimationState;
  /** Size hint for the drawer */
  size: DrawerSize;
  /** Custom width (overrides size) */
  width?: string;
  /** Whether to show backdrop */
  showBackdrop: boolean;
  /** Whether drawer can be dismissed by clicking outside */
  dismissible: boolean;
  /** Parent drawer ID for back navigation */
  parentId?: string;
  /** Timestamp when opened */
  openedAt: number;
  /** Whether content should be preloaded */
  preloaded: boolean;
}

export interface DrawerHistoryEntry {
  id: string;
  type: DrawerType;
  props: Record<string, unknown>;
}

// ============================================================================
// Store State
// ============================================================================

interface DrawerState {
  /** Stack of open drawers (last = topmost) */
  stack: DrawerConfig[];

  /** History of closed drawers for forward navigation */
  history: DrawerHistoryEntry[];

  /** Per-drawer persistent data */
  drawerData: Map<string, Record<string, unknown>>;

  /** Preloaded drawer types */
  preloadedTypes: Set<DrawerType>;

  /** Global display mode preference (can be overridden per drawer) */
  globalDisplayMode: DisplayMode;

  /** Whether any drawer is animating */
  isAnimating: boolean;

  /** Keyboard shortcut bindings */
  shortcuts: Map<string, () => void>;

  // ============================================================================
  // Computed Getters
  // ============================================================================

  /** Current topmost drawer */
  current: DrawerConfig | null;

  /** Whether any drawer is open */
  isOpen: boolean;

  /** Whether back navigation is available */
  canGoBack: boolean;

  /** Whether forward navigation is available */
  canGoForward: boolean;

  /** Number of drawers in stack */
  stackDepth: number;

  // ============================================================================
  // Actions
  // ============================================================================

  /** Open a new drawer */
  open: (type: DrawerType, props?: Record<string, unknown>, options?: Partial<Pick<DrawerConfig, 'displayMode' | 'size' | 'width' | 'showBackdrop' | 'dismissible'>>) => string;

  /** Open drawer as child of current drawer */
  push: (type: DrawerType, props?: Record<string, unknown>, options?: Partial<Pick<DrawerConfig, 'displayMode' | 'size' | 'width'>>) => string;

  /** Close current drawer */
  close: () => void;

  /** Close all drawers */
  closeAll: () => void;

  /** Close a specific drawer by ID */
  closeById: (id: string) => void;

  /** Go back to parent drawer */
  goBack: () => void;

  /** Go forward in history */
  goForward: () => void;

  /** Update current drawer props */
  updateProps: (props: Record<string, unknown>) => void;

  /** Update animation state for a drawer */
  setAnimationState: (id: string, state: AnimationState) => void;

  /** Set global display mode */
  setDisplayMode: (mode: DisplayMode) => void;

  /** Get data for a specific drawer */
  getData: <T = unknown>(key: string) => T | undefined;

  /** Set data for current drawer */
  setData: (key: string, value: unknown) => void;

  /** Clear data for a drawer */
  clearData: (id?: string) => void;

  /** Preload a drawer type */
  preload: (type: DrawerType) => void;

  /** Check if drawer type is open */
  isTypeOpen: (type: DrawerType) => boolean;

  /** Get drawer by type */
  getByType: (type: DrawerType) => DrawerConfig | undefined;

  /** Register keyboard shortcut */
  registerShortcut: (key: string, handler: () => void) => () => void;

  // ============================================================================
  // Legacy API (for backward compatibility)
  // ============================================================================

  /** @deprecated Use open() instead */
  openDrawer: (drawer: string, props?: Record<string, unknown>) => void;

  /** @deprecated Use open() with displayMode: 'inline' instead */
  openInline: (drawer: string, props?: Record<string, unknown>) => void;

  /** @deprecated Use open() with auto display mode instead */
  openSide: (type: string, props?: Record<string, unknown>) => void;

  /** @deprecated Use open() with displayMode: 'fullscreen' instead */
  openFullscreen: (type: string, props?: Record<string, unknown>) => void;

  /** @deprecated Use close() instead */
  closeDrawer: () => void;

  /** Legacy props accessor */
  props: Record<string, unknown>;

  /** Legacy open state */
  open_legacy: boolean;

  /** Legacy type accessor */
  type: DrawerType;

  /** Legacy display mode */
  displayMode: DisplayMode;

  /** Legacy mode */
  mode: 'side' | 'fullscreen';
}

// ============================================================================
// Utilities
// ============================================================================

let idCounter = 0;

function generateId(): string {
  return `drawer-${++idCounter}-${Date.now()}`;
}

function getResponsiveDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'overlay';
  return window.innerWidth >= 1024 ? 'inline' : 'overlay';
}

function getSizeWidth(size: DrawerSize): string {
  switch (size) {
    case 'sm': return '320px';
    case 'md': return '420px';
    case 'lg': return '560px';
    case 'xl': return '720px';
    case 'full': return '100%';
    default: return '420px';
  }
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useDrawerStore = create<DrawerState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // State
      stack: [],
      history: [],
      drawerData: new Map(),
      preloadedTypes: new Set(),
      globalDisplayMode: 'inline',
      isAnimating: false,
      shortcuts: new Map(),

      // Computed (implemented as getters via get())
      get current() {
        const stack = get().stack;
        return stack.length > 0 ? stack[stack.length - 1] : null;
      },

      get isOpen() {
        return get().stack.length > 0;
      },

      get canGoBack() {
        return get().stack.length > 1;
      },

      get canGoForward() {
        return get().history.length > 0;
      },

      get stackDepth() {
        return get().stack.length;
      },

      // Actions
      open: (type, props = {}, options = {}) => {
        const id = generateId();
        const displayMode = options.displayMode ?? getResponsiveDisplayMode();

        const config: DrawerConfig = {
          id,
          type,
          props,
          displayMode,
          animationState: 'entering',
          size: options.size ?? 'md',
          width: options.width,
          showBackdrop: options.showBackdrop ?? (displayMode === 'overlay'),
          dismissible: options.dismissible ?? true,
          openedAt: Date.now(),
          preloaded: get().preloadedTypes.has(type),
        };

        set((state) => {
          // Close existing stack if opening fresh
          state.stack = [config];
          state.history = [];
          state.isAnimating = true;
        });

        // Transition to entered state after animation
        setTimeout(() => {
          set((state) => {
            const drawer = state.stack.find(d => d.id === id);
            if (drawer) {
              drawer.animationState = 'entered';
            }
            state.isAnimating = false;
          });
        }, 300);

        return id;
      },

      push: (type, props = {}, options = {}) => {
        const id = generateId();
        const current = get().current;
        const displayMode = options.displayMode ?? current?.displayMode ?? getResponsiveDisplayMode();

        const config: DrawerConfig = {
          id,
          type,
          props,
          displayMode,
          animationState: 'entering',
          size: options.size ?? 'md',
          width: options.width,
          showBackdrop: displayMode === 'overlay',
          dismissible: true,
          parentId: current?.id,
          openedAt: Date.now(),
          preloaded: get().preloadedTypes.has(type),
        };

        set((state) => {
          state.stack.push(config);
          state.history = []; // Clear forward history when pushing
          state.isAnimating = true;
        });

        setTimeout(() => {
          set((state) => {
            const drawer = state.stack.find(d => d.id === id);
            if (drawer) {
              drawer.animationState = 'entered';
            }
            state.isAnimating = false;
          });
        }, 300);

        return id;
      },

      close: () => {
        const current = get().current;
        if (!current) return;

        set((state) => {
          const drawer = state.stack[state.stack.length - 1];
          if (drawer) {
            drawer.animationState = 'exiting';
          }
          state.isAnimating = true;
        });

        setTimeout(() => {
          set((state) => {
            const closed = state.stack.pop();
            if (closed) {
              state.history.unshift({
                id: closed.id,
                type: closed.type,
                props: closed.props,
              });
              // Keep history limited
              if (state.history.length > 10) {
                state.history = state.history.slice(0, 10);
              }
            }
            state.isAnimating = false;
          });
        }, 200);
      },

      closeAll: () => {
        set((state) => {
          state.stack.forEach(d => {
            d.animationState = 'exiting';
          });
          state.isAnimating = true;
        });

        setTimeout(() => {
          set((state) => {
            state.stack = [];
            state.history = [];
            state.isAnimating = false;
          });
        }, 200);
      },

      closeById: (id) => {
        const index = get().stack.findIndex(d => d.id === id);
        if (index === -1) return;

        set((state) => {
          const drawer = state.stack[index];
          if (drawer) {
            drawer.animationState = 'exiting';
          }
        });

        setTimeout(() => {
          set((state) => {
            state.stack = state.stack.filter(d => d.id !== id);
          });
        }, 200);
      },

      goBack: () => {
        const stack = get().stack;
        if (stack.length <= 1) {
          get().close();
          return;
        }

        set((state) => {
          const current = state.stack[state.stack.length - 1];
          if (current) {
            current.animationState = 'exiting';
          }
          state.isAnimating = true;
        });

        setTimeout(() => {
          set((state) => {
            const closed = state.stack.pop();
            if (closed) {
              state.history.unshift({
                id: closed.id,
                type: closed.type,
                props: closed.props,
              });
            }
            state.isAnimating = false;
          });
        }, 200);
      },

      goForward: () => {
        const history = get().history;
        if (history.length === 0) return;

        const entry = history[0];
        get().push(entry.type, entry.props);

        set((state) => {
          state.history = state.history.slice(1);
        });
      },

      updateProps: (props) => {
        set((state) => {
          const current = state.stack[state.stack.length - 1];
          if (current) {
            current.props = { ...current.props, ...props };
          }
        });
      },

      setAnimationState: (id, animationState) => {
        set((state) => {
          const drawer = state.stack.find(d => d.id === id);
          if (drawer) {
            drawer.animationState = animationState;
          }
        });
      },

      setDisplayMode: (mode) => {
        set((state) => {
          state.globalDisplayMode = mode;
        });
      },

      getData: <T = unknown>(key: string): T | undefined => {
        const current = get().current;
        if (!current) return undefined;
        const data = get().drawerData.get(current.id);
        return data?.[key] as T | undefined;
      },

      setData: (key, value) => {
        const current = get().current;
        if (!current) return;

        set((state) => {
          const existing = state.drawerData.get(current.id) || {};
          state.drawerData.set(current.id, { ...existing, [key]: value });
        });
      },

      clearData: (id) => {
        const targetId = id ?? get().current?.id;
        if (!targetId) return;

        set((state) => {
          state.drawerData.delete(targetId);
        });
      },

      preload: (type) => {
        set((state) => {
          state.preloadedTypes.add(type);
        });
      },

      isTypeOpen: (type) => {
        return get().stack.some(d => d.type === type);
      },

      getByType: (type) => {
        return get().stack.find(d => d.type === type);
      },

      registerShortcut: (key, handler) => {
        set((state) => {
          state.shortcuts.set(key, handler);
        });

        return () => {
          set((state) => {
            state.shortcuts.delete(key);
          });
        };
      },

      // Legacy API
      openDrawer: (drawer, props = {}) => {
        get().open(drawer as DrawerType, props, { displayMode: 'overlay' });
      },

      openInline: (drawer, props = {}) => {
        get().open(drawer as DrawerType, props, { displayMode: 'inline' });
      },

      openSide: (type, props = {}) => {
        console.log('[DrawerStore] openSide called:', { type, props });
        get().open(type as DrawerType, props);
      },

      openFullscreen: (type, props = {}) => {
        get().open(type as DrawerType, props, { displayMode: 'fullscreen' });
      },

      closeDrawer: () => {
        get().closeAll();
      },

      // Legacy getters (computed based on current state)
      get props() {
        return get().current?.props ?? {};
      },

      get open_legacy() {
        return get().isOpen;
      },

      get type() {
        return get().current?.type ?? null;
      },

      get displayMode() {
        return get().current?.displayMode ?? get().globalDisplayMode;
      },

      get mode() {
        const dm = get().current?.displayMode ?? 'overlay';
        return dm === 'fullscreen' ? 'fullscreen' : 'side';
      },
    }))
  )
);

// Legacy alias for backward compatibility
export const drawerStore = useDrawerStore;

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrent = (state: DrawerState) => state.current;
export const selectIsOpen = (state: DrawerState) => state.isOpen;
export const selectStack = (state: DrawerState) => state.stack;
export const selectCanGoBack = (state: DrawerState) => state.canGoBack;
export const selectDisplayMode = (state: DrawerState) => state.displayMode;

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get current drawer state with automatic updates
 */
export function useCurrentDrawer() {
  return useDrawerStore((state) => ({
    current: state.current,
    isOpen: state.isOpen,
    canGoBack: state.canGoBack,
    stackDepth: state.stackDepth,
  }));
}

/**
 * Hook for drawer actions
 */
export function useDrawerActions() {
  return useDrawerStore((state) => ({
    open: state.open,
    push: state.push,
    close: state.close,
    closeAll: state.closeAll,
    goBack: state.goBack,
    goForward: state.goForward,
    updateProps: state.updateProps,
  }));
}

/**
 * Hook to check if a specific drawer type is open
 */
export function useIsDrawerTypeOpen(type: DrawerType): boolean {
  return useDrawerStore((state) => state.isTypeOpen(type));
}
