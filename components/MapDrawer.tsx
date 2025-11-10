'use client';

import { ReactNode } from 'react';

interface MapDrawerProps {
  children: ReactNode;
}

export default function MapDrawer({ children }: MapDrawerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-50 dark:bg-dark-blue-900 border-t border-neutral-200 dark:border-dark-blue-600 rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)] p-4 max-h-[40vh] overflow-y-auto z-10">
      {children}
    </div>
  );
}

