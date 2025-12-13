'use client';

import React from 'react';

interface PassportPageProps {
  pageNumber: number;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A single passport page with security patterns and page number
 */
export function PassportPage({ pageNumber, title, children, className = '' }: PassportPageProps) {
  return (
    <div className={`passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Page header with number */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        {title && (
          <p className="passport-data text-[10px] text-gray-400 tracking-wider">{title}</p>
        )}
        <p className="passport-data text-[10px] text-gray-300 dark:text-gray-600 ml-auto">
          PAGE {pageNumber}
        </p>
      </div>

      {/* Page content */}
      <div className="p-6">
        {children}
      </div>

      {/* Security watermark */}
      <div className="absolute bottom-4 right-4 opacity-5 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-20 h-20" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
    </div>
  );
}
