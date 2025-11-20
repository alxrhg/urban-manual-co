"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PlannerLayoutProps {
  header: ReactNode;
  dock: ReactNode;
  canvas: ReactNode;
}

export function PlannerLayout({ header, dock, canvas }: PlannerLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 p-4 dark:bg-zinc-950">
      <div className="mx-auto flex h-[calc(100vh-32px)] max-w-7xl flex-col gap-4">
        {header}
        <motion.div
          layout
          className="flex h-full gap-4 overflow-hidden"
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <motion.div
            layout
            className="w-[420px] flex-shrink-0"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              {dock}
            </div>
          </motion.div>
          <motion.div
            layout
            className="flex-1 min-w-0"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              {canvas}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

