"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";

interface SplitPaneContextValue {
  isPanelOpen: boolean;
  panelContent: React.ReactNode | null;
  panelTitle: string;
  openPanel: (content: React.ReactNode, title?: string) => void;
  closePanel: () => void;
}

const SplitPaneContext = React.createContext<SplitPaneContextValue | null>(null);

export function useSplitPane() {
  const context = React.useContext(SplitPaneContext);
  if (!context) {
    throw new Error("useSplitPane must be used within a SplitPaneProvider");
  }
  return context;
}

interface SplitPaneProviderProps {
  children: React.ReactNode;
}

export function SplitPaneProvider({ children }: SplitPaneProviderProps) {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [panelContent, setPanelContent] = React.useState<React.ReactNode | null>(null);
  const [panelTitle, setPanelTitle] = React.useState("");

  const openPanel = React.useCallback((content: React.ReactNode, title = "") => {
    setPanelContent(content);
    setPanelTitle(title);
    setIsPanelOpen(true);
  }, []);

  const closePanel = React.useCallback(() => {
    setIsPanelOpen(false);
    // Delay clearing content for animation
    setTimeout(() => {
      setPanelContent(null);
      setPanelTitle("");
    }, 300);
  }, []);

  return (
    <SplitPaneContext.Provider
      value={{ isPanelOpen, panelContent, panelTitle, openPanel, closePanel }}
    >
      {children}
    </SplitPaneContext.Provider>
  );
}

interface SplitPaneLayoutProps {
  children: React.ReactNode;
  defaultPanelSize?: number;
  minPanelSize?: number;
  maxPanelSize?: number;
  className?: string;
}

export function SplitPaneLayout({
  children,
  defaultPanelSize = 35,
  minPanelSize = 25,
  maxPanelSize = 50,
  className,
}: SplitPaneLayoutProps) {
  const { isPanelOpen, panelContent, panelTitle, closePanel } = useSplitPane();

  // On mobile, use overlay instead of split
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mobile: render as overlay
  if (isMobile) {
    return (
      <div className={cn("relative h-full", className)}>
        {children}

        {/* Mobile Overlay Panel */}
        <div
          className={cn(
            "fixed inset-0 z-50 transition-opacity duration-300",
            isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={closePanel}
          />

          {/* Panel */}
          <div
            className={cn(
              "absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-950 shadow-2xl transition-transform duration-300 ease-out flex flex-col",
              isPanelOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <SidePanelHeader title={panelTitle} onClose={closePanel} />
            <ScrollArea className="flex-1">
              {panelContent}
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: render as split pane
  if (!isPanelOpen) {
    return <div className={cn("h-full", className)}>{children}</div>;
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={cn("h-full", className)}
    >
      {/* Main Content */}
      <ResizablePanel defaultSize={100 - defaultPanelSize} minSize={50}>
        <div className="h-full overflow-auto">{children}</div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Side Panel */}
      <ResizablePanel
        defaultSize={defaultPanelSize}
        minSize={minPanelSize}
        maxSize={maxPanelSize}
      >
        <div className="h-full flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">
          <SidePanelHeader title={panelTitle} onClose={closePanel} />
          <ScrollArea className="flex-1">
            {panelContent}
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface SidePanelHeaderProps {
  title: string;
  onClose: () => void;
}

function SidePanelHeader({ title, onClose }: SidePanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {title}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 rounded-full"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close panel</span>
      </Button>
    </div>
  );
}

// Utility component for opening panels from anywhere
interface PanelTriggerProps {
  content: React.ReactNode;
  title?: string;
  children: React.ReactElement;
}

export function PanelTrigger({ content, title, children }: PanelTriggerProps) {
  const { openPanel } = useSplitPane();

  const handleClick = (e: React.MouseEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (children.props as any).onClick?.(e);
    openPanel(content, title);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return React.cloneElement(children, { onClick: handleClick } as any);
}
