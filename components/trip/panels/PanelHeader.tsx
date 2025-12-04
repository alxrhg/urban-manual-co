'use client';

import type { ReactNode } from 'react';
import { X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PanelHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onEdit: () => void;
  onClose: () => void;
}

/**
 * PanelHeader - Shared header component for item detail panels
 *
 * Display:
 * ┌─────────────────────────────────────────────────┐
 * │ [icon] Title                         [edit] [x] │
 * │        Subtitle                                 │
 * └─────────────────────────────────────────────────┘
 */
export default function PanelHeader({
  icon,
  title,
  subtitle,
  onEdit,
  onClose,
}: PanelHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400">
        {icon}
      </div>

      {/* Title & Subtitle */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {subtitle}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  );
}
