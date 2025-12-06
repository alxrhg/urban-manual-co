'use client';

import { Sparkles } from "lucide-react";
import { useDrawer } from "@/contexts/DrawerContext";

export function AIAssistant() {
  const { toggleDrawer, isDrawerOpen } = useDrawer();

  // Don't show button when chat drawer is open
  if (isDrawerOpen('chat')) {
    return null;
  }

  return (
    <button
      onClick={() => toggleDrawer('chat')}
      aria-label="Open AI chat"
      className="fixed bottom-6 right-20 z-40 flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white/10 backdrop-blur-xl text-white border border-gray-800 dark:border-white/20 hover:bg-gray-900 dark:hover:bg-white/20 transition-all duration-200 rounded-full shadow-lg hover:scale-105 active:scale-95"
    >
      <Sparkles className="h-4 w-4" />
      <span className="text-sm font-medium">AI</span>
    </button>
  );
}
