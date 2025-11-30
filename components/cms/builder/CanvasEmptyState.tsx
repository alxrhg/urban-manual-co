'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Layout, Type, Image, Grid3x3 } from 'lucide-react';
import { usePageBuilder } from '@/contexts/PageBuilderContext';

const quickAddBlocks = [
  { type: 'section', label: 'Section', icon: Layout },
  { type: 'heading', label: 'Heading', icon: Type },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'grid', label: 'Grid', icon: Grid3x3 },
];

export function CanvasEmptyState() {
  const { addBlock } = usePageBuilder();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6"
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Plus className="h-8 w-8 text-white" />
      </motion.div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Start building your page
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
        Drag blocks from the sidebar or click one of the quick-add options below to begin.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        {quickAddBlocks.map((block, index) => (
          <motion.button
            key={block.type}
            onClick={() => addBlock(block.type)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <block.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {block.label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-w-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Keyboard shortcuts</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">⌘S</kbd>
            <span className="text-gray-600 dark:text-gray-400">Save</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">⌘Z</kbd>
            <span className="text-gray-600 dark:text-gray-400">Undo</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">⌘⇧Z</kbd>
            <span className="text-gray-600 dark:text-gray-400">Redo</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">⌘D</kbd>
            <span className="text-gray-600 dark:text-gray-400">Duplicate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">⌫</kbd>
            <span className="text-gray-600 dark:text-gray-400">Delete</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Esc</kbd>
            <span className="text-gray-600 dark:text-gray-400">Deselect</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
