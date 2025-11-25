'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface SplitPaneContextValue {
  registerPaneHost: (node: HTMLDivElement | null) => void;
  panelNode: HTMLDivElement | null;
  isPaneOpen: boolean;
  paneWidth: number;
  openPane: (paneId: string, width: number) => void;
  closePane: (paneId: string) => void;
  activePaneId: string | null;
}

const SplitPaneContext = createContext<SplitPaneContextValue | undefined>(undefined);

export function SplitPaneProvider({ children }: { children: ReactNode }) {
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null);
  const [paneWidth, setPaneWidth] = useState(420);
  const [activePaneId, setActivePaneId] = useState<string | null>(null);

  const registerPaneHost = useCallback((node: HTMLDivElement | null) => {
    setPanelNode(node);
  }, []);

  const openPane = useCallback((paneId: string, width: number) => {
    setActivePaneId(paneId);
    setPaneWidth(width);
  }, []);

  const closePane = useCallback((paneId: string) => {
    setActivePaneId((current) => (current === paneId ? null : current));
  }, []);

  const value = useMemo<SplitPaneContextValue>(
    () => ({
      registerPaneHost,
      panelNode,
      isPaneOpen: activePaneId !== null,
      paneWidth,
      openPane,
      closePane,
      activePaneId,
    }),
    [activePaneId, closePane, openPane, paneWidth, panelNode, registerPaneHost]
  );

  return <SplitPaneContext.Provider value={value}>{children}</SplitPaneContext.Provider>;
}

export function useSplitPane() {
  const context = useContext(SplitPaneContext);
  if (!context) {
    throw new Error('useSplitPane must be used within a SplitPaneProvider');
  }
  return context;
}

