import { create } from "zustand";

/**
 * Display modes for drawers:
 * - "overlay": Traditional drawer that overlays content (mobile default)
 * - "split": Drawer opens as a side panel, pushing main content (desktop default)
 */
export type DrawerDisplayMode = "overlay" | "split";

/**
 * Split pane positions for the drawer panel
 */
export type DrawerPosition = "left" | "right";

/**
 * Drawer state interface with split-pane support
 */
interface DrawerState {
  // Core drawer state
  drawer: string | null;
  isOpen: boolean;
  props: Record<string, any>;

  // Display mode configuration
  displayMode: DrawerDisplayMode;
  position: DrawerPosition;
  width: string;

  // Split-pane specific state
  isSplitPaneActive: boolean;
  splitPaneWidth: string;

  // Actions
  openDrawer: (drawer: string, options?: OpenDrawerOptions) => void;
  closeDrawer: () => void;
  setDisplayMode: (mode: DrawerDisplayMode) => void;
  setSplitPaneWidth: (width: string) => void;
  setPosition: (position: DrawerPosition) => void;

  // Legacy support - keeping for backward compatibility
  open: boolean;
  type: string | null;
  mode: "side" | "fullscreen";
  openSide: (type: string, props?: Record<string, any>) => void;
  openFullscreen: (type: string, props?: Record<string, any>) => void;
}

interface OpenDrawerOptions {
  props?: Record<string, any>;
  displayMode?: DrawerDisplayMode;
  position?: DrawerPosition;
  width?: string;
  // Allow passing props directly for backwards compatibility
  [key: string]: any;
}

// Default width for split pane on desktop
const DEFAULT_SPLIT_PANE_WIDTH = "420px";
const DEFAULT_OVERLAY_WIDTH = "420px";

export const useDrawerStore = create<DrawerState>((set, get) => ({
  // Core state
  drawer: null,
  isOpen: false,
  props: {},

  // Display configuration
  displayMode: "split", // Default to split mode for modern UI
  position: "right",
  width: DEFAULT_OVERLAY_WIDTH,

  // Split-pane state
  isSplitPaneActive: false,
  splitPaneWidth: DEFAULT_SPLIT_PANE_WIDTH,

  // Main open action with options
  // Supports both new API: openDrawer('type', { props: {...} })
  // And legacy API: openDrawer('type', { propKey: value, ... })
  openDrawer: (drawer, options = {}) => {
    const {
      props: explicitProps,
      displayMode = get().displayMode,
      position = get().position,
      width = DEFAULT_OVERLAY_WIDTH,
      ...restProps
    } = options;

    // Merge explicit props with any other props passed directly (backwards compatibility)
    const mergedProps = { ...(explicitProps || {}), ...restProps };

    set({
      drawer,
      isOpen: true,
      props: mergedProps,
      displayMode,
      position,
      width,
      isSplitPaneActive: displayMode === "split",
      // Legacy support
      open: true,
      type: drawer,
    });
  },

  closeDrawer: () =>
    set({
      drawer: null,
      isOpen: false,
      props: {},
      isSplitPaneActive: false,
      // Legacy support
      open: false,
      type: null,
    }),

  setDisplayMode: (mode) =>
    set({
      displayMode: mode,
      isSplitPaneActive: mode === "split" && get().isOpen,
    }),

  setSplitPaneWidth: (width) =>
    set({ splitPaneWidth: width }),

  setPosition: (position) =>
    set({ position }),

  // Legacy support
  open: false,
  type: null,
  mode: "side",

  openSide: (type: string, props = {}) => {
    console.log('[DrawerStore] openSide called:', { type, props });
    set({
      open: true,
      type,
      props,
      mode: "side",
      drawer: type,
      isOpen: true,
      displayMode: "split",
      isSplitPaneActive: true,
    });
  },

  openFullscreen: (type: string, props = {}) =>
    set({
      open: true,
      type,
      props,
      mode: "fullscreen",
      drawer: type,
      isOpen: true,
      displayMode: "overlay",
      isSplitPaneActive: false,
    }),
}));

/**
 * Hook to get split-pane specific state and computed values
 */
export function useSplitPaneState() {
  const {
    isSplitPaneActive,
    splitPaneWidth,
    position,
    displayMode,
    isOpen,
    drawer,
  } = useDrawerStore();

  return {
    isSplitPaneActive,
    splitPaneWidth,
    position,
    displayMode,
    isOpen,
    drawer,
    // Computed: whether to show the split pane panel
    showSplitPanel: isSplitPaneActive && isOpen && displayMode === "split",
  };
}
