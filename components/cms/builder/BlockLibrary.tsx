'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Layout,
  Type,
  Image,
  MousePointer2,
  Grid3x3,
  ChevronRight,
  Columns,
  Box,
  Maximize2,
  AlignLeft,
  Video,
  CreditCard,
  ChevronDown,
  LayoutList,
  Space,
  Minus,
  Code,
  MapPin,
  Map,
  Building2,
  Bookmark,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePageBuilder } from '@/contexts/PageBuilderContext';
import type { BlockDefinition, BlockCategory } from '@/types/cms';

// Icon mapping for block types
const iconMap: Record<string, LucideIcon> = {
  Box: Box,
  Columns: Columns,
  'Grid3x3': Grid3x3,
  Layout: Layout,
  Type: Type,
  AlignLeft: AlignLeft,
  MousePointer2: MousePointer2,
  Image: Image,
  Video: Video,
  Maximize2: Maximize2,
  CreditCard: CreditCard,
  ChevronDown: ChevronDown,
  LayoutList: LayoutList,
  Space: Space,
  Minus: Minus,
  Code: Code,
  MapPin: MapPin,
  Map: Map,
  Building2: Building2,
  Bookmark: Bookmark,
};

const categoryLabels: Record<BlockCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  utility: 'Utility',
  domain: 'Domain',
};

const categoryIcons: Record<BlockCategory, LucideIcon> = {
  layout: Layout,
  content: Type,
  media: Image,
  interactive: MousePointer2,
  utility: Space,
  domain: MapPin,
};

export function BlockLibrary() {
  const { blockDefinitions, addBlock } = usePageBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['layout', 'content', 'media'])
  );

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const filtered = searchQuery
      ? blockDefinitions.filter(
          (b) =>
            b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : blockDefinitions;

    return filtered.reduce((acc, block) => {
      if (!acc[block.category]) {
        acc[block.category] = [];
      }
      acc[block.category].push(block);
      return acc;
    }, {} as Record<BlockCategory, BlockDefinition[]>);
  }, [blockDefinitions, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Blocks
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blocks..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Block categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(categoryLabels).map(([category, label]) => {
          const blocks = blocksByCategory[category as BlockCategory] || [];
          if (blocks.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const CategoryIcon = categoryIcons[category as BlockCategory];

          return (
            <div key={category} className="border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-gray-400" />
                  {label}
                  <span className="text-xs text-gray-400">({blocks.length})</span>
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-2 pb-2"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {blocks.map((block) => (
                      <DraggableBlock
                        key={block.type}
                        block={block}
                        onClick={() => addBlock(block.type)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}

        {Object.keys(blocksByCategory).length === 0 && searchQuery && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No blocks found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface DraggableBlockProps {
  block: BlockDefinition;
  onClick: () => void;
}

function DraggableBlock({ block, onClick }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-block-${block.type}`,
    data: {
      type: 'new-block',
      blockType: block.type,
    },
  });

  const Icon = iconMap[block.icon] || Box;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-grab active:cursor-grabbing group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-8 h-8 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 text-center truncate w-full">
        {block.label}
      </span>
    </motion.button>
  );
}
