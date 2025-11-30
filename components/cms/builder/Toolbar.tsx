'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  Grid3x3,
  Box,
  ZoomIn,
  ZoomOut,
  Upload,
  MoreHorizontal,
  Check,
  Loader2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { usePageBuilder } from '@/contexts/PageBuilderContext';
import type { Breakpoint } from '@/types/cms';

const breakpoints: { key: Breakpoint; icon: typeof Monitor; label: string; width: number }[] = [
  { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 375 },
  { key: 'tablet', icon: Tablet, label: 'Tablet', width: 768 },
  { key: 'desktop', icon: Monitor, label: 'Desktop', width: 1024 },
];

const zoomLevels = [50, 75, 100, 125, 150];

export function Toolbar() {
  const {
    state,
    savePage,
    publishPage,
    undo,
    redo,
    canUndo,
    canRedo,
    setBreakpoint,
    setZoom,
    toggleGrid,
    toggleOutlines,
    togglePreview,
  } = usePageBuilder();

  const [showZoomMenu, setShowZoomMenu] = React.useState(false);

  return (
    <div className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4">
      {/* Left section - Page info & History */}
      <div className="flex items-center gap-4">
        {/* Page name */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            {state.page?.name || 'Untitled Page'}
          </span>
          {state.hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={Undo2}
            label="Undo"
            shortcut="⌘Z"
            onClick={undo}
            disabled={!canUndo}
          />
          <ToolbarButton
            icon={Redo2}
            label="Redo"
            shortcut="⌘⇧Z"
            onClick={redo}
            disabled={!canRedo}
          />
        </div>
      </div>

      {/* Center section - Breakpoints */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
        {breakpoints.map((bp) => (
          <motion.button
            key={bp.key}
            onClick={() => setBreakpoint(bp.key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${state.breakpoint === bp.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
            whileTap={{ scale: 0.97 }}
            title={`${bp.label} (${bp.width}px)`}
          >
            <bp.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{bp.width}</span>
          </motion.button>
        ))}
      </div>

      {/* Right section - View controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Zoom */}
        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="w-10 text-center">{state.zoom}%</span>
          </button>
          {showZoomMenu && (
            <motion.div
              className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {zoomLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setZoom(level);
                    setShowZoomMenu(false);
                  }}
                  className={`w-full px-4 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    state.zoom === level ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {level}%
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

        {/* View toggles */}
        <ToolbarButton
          icon={Grid3x3}
          label="Toggle grid"
          onClick={toggleGrid}
          active={state.showGrid}
        />
        <ToolbarButton
          icon={Box}
          label="Toggle outlines"
          onClick={toggleOutlines}
          active={state.showOutlines}
        />
        <ToolbarButton
          icon={state.isPreviewing ? EyeOff : Eye}
          label={state.isPreviewing ? 'Exit preview' : 'Preview'}
          onClick={togglePreview}
          active={state.isPreviewing}
        />

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

        {/* Save */}
        <motion.button
          onClick={savePage}
          disabled={state.isSaving || !state.hasUnsavedChanges}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          {state.isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state.hasUnsavedChanges ? (
            <Save className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <span className="hidden sm:inline">
            {state.isSaving ? 'Saving...' : state.hasUnsavedChanges ? 'Save' : 'Saved'}
          </span>
        </motion.button>

        {/* Publish */}
        <motion.button
          onClick={publishPage}
          disabled={state.isSaving}
          className={`
            flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${state.page?.status === 'published'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
            }
          `}
          whileTap={{ scale: 0.97 }}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">
            {state.page?.status === 'published' ? 'Published' : 'Publish'}
          </span>
        </motion.button>

        {/* View live */}
        {state.page?.status === 'published' && state.page?.slug && (
          <a
            href={`/p/${state.page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="View live page"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: typeof Undo2;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolbarButton({ icon: Icon, label, shortcut, onClick, disabled, active }: ToolbarButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-1.5 rounded-md transition-colors
        ${active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      whileTap={{ scale: 0.95 }}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <Icon className="h-4 w-4" />
    </motion.button>
  );
}
