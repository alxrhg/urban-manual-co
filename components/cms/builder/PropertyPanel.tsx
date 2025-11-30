'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Link,
  Type,
  Hash,
  ToggleLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Maximize2,
  Minus,
  Plus,
} from 'lucide-react';
import { usePageBuilder } from '@/contexts/PageBuilderContext';
import type { CMSBlock, Breakpoint, BlockDefinition, JSONSchemaProperty } from '@/types/cms';

export function PropertyPanel() {
  const {
    state,
    getSelectedBlock,
    getBlockDefinition,
    updateBlockProps,
    updateBlockStyles,
    selectBlock,
  } = usePageBuilder();

  const selectedBlock = getSelectedBlock();
  const definition = selectedBlock ? getBlockDefinition(selectedBlock.type) : null;

  if (!selectedBlock || !definition) {
    return (
      <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Select a block to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {selectedBlock.name || definition.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{definition.type}</p>
        </div>
        <button
          onClick={() => selectBlock(null)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        <PropertySection title="Content" defaultOpen>
          <PropsEditor
            block={selectedBlock}
            definition={definition}
            onUpdate={updateBlockProps}
          />
        </PropertySection>

        <PropertySection title="Style">
          <StyleEditor
            block={selectedBlock}
            breakpoint={state.breakpoint}
            onUpdate={updateBlockStyles}
          />
        </PropertySection>

        <PropertySection title="Layout">
          <LayoutEditor
            block={selectedBlock}
            breakpoint={state.breakpoint}
            onUpdate={updateBlockStyles}
          />
        </PropertySection>

        <PropertySection title="Spacing">
          <SpacingEditor
            block={selectedBlock}
            breakpoint={state.breakpoint}
            onUpdate={updateBlockStyles}
          />
        </PropertySection>
      </div>
    </div>
  );
}

// =====================================================
// PROPERTY SECTION
// =====================================================

interface PropertySectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PropertySection({ title, defaultOpen = false, children }: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        {title}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// PROPS EDITOR
// =====================================================

interface PropsEditorProps {
  block: CMSBlock;
  definition: BlockDefinition;
  onUpdate: (id: string, props: Record<string, unknown>) => void;
}

function PropsEditor({ block, definition, onUpdate }: PropsEditorProps) {
  const schema = definition.props_schema;
  const props = block.props as Record<string, unknown>;

  if (!schema.properties) {
    return <p className="text-xs text-gray-400">No editable properties</p>;
  }

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(block.id, { [key]: value });
    },
    [block.id, onUpdate]
  );

  return (
    <div className="space-y-3">
      {Object.entries(schema.properties).map(([key, propSchema]) => (
        <PropField
          key={key}
          name={key}
          schema={propSchema}
          value={props[key]}
          onChange={(value) => handleChange(key, value)}
        />
      ))}
    </div>
  );
}

// =====================================================
// PROP FIELD
// =====================================================

interface PropFieldProps {
  name: string;
  schema: JSONSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}

function PropField({ name, schema, value, onChange }: PropFieldProps) {
  const label = schema.title || formatLabel(name);

  // String input
  if (schema.type === 'string' && !schema.enum) {
    // Multi-line text
    if (name === 'content' || name === 'description' || name === 'code') {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </label>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={schema.description}
          />
        </div>
      );
    }

    // URL input
    if (name === 'url' || name === 'src' || name === 'href') {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </label>
          <div className="relative">
            <Link className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="url"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
        </div>
      );
    }

    // Color input
    if (name.toLowerCase().includes('color') || name.toLowerCase().includes('background')) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={(value as string) || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
            />
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>
      );
    }

    // Regular text input
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={schema.description}
        />
      </div>
    );
  }

  // Select (enum)
  if (schema.enum) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {formatLabel(String(option))}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Number input
  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(value as number) || 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={schema.minimum}
            max={schema.maximum}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(schema.minimum !== undefined || schema.maximum !== undefined) && (
            <input
              type="range"
              value={(value as number) || 0}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              min={schema.minimum || 0}
              max={schema.maximum || 100}
              className="flex-1"
            />
          )}
        </div>
      </div>
    );
  }

  // Boolean toggle
  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            value ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              value ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    );
  }

  // Object (nested)
  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
        <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
          {Object.entries(schema.properties).map(([key, propSchema]) => (
            <PropField
              key={key}
              name={key}
              schema={propSchema}
              value={(value as Record<string, unknown>)?.[key]}
              onChange={(newValue) =>
                onChange({ ...(value as Record<string, unknown>), [key]: newValue })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // Array
  if (schema.type === 'array') {
    const items = (value as unknown[]) || [];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {label}
          </label>
          <button
            onClick={() => onChange([...items, schema.items?.default || {}])}
            className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Item {index + 1}</span>
                <button
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-600"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </div>
              {schema.items && (
                <PropField
                  name={`item-${index}`}
                  schema={schema.items}
                  value={item}
                  onChange={(newValue) =>
                    onChange(items.map((v, i) => (i === index ? newValue : v)))
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// =====================================================
// STYLE EDITOR
// =====================================================

interface StyleEditorProps {
  block: CMSBlock;
  breakpoint: Breakpoint;
  onUpdate: (id: string, breakpoint: Breakpoint, styles: Record<string, unknown>) => void;
}

function StyleEditor({ block, breakpoint, onUpdate }: StyleEditorProps) {
  const styles = block.styles[breakpoint] || {};

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(block.id, breakpoint, { [key]: value });
    },
    [block.id, breakpoint, onUpdate]
  );

  return (
    <div className="space-y-3">
      {/* Background */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Background
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={(styles.backgroundColor as string) || '#ffffff'}
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
            className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
          />
          <input
            type="text"
            value={(styles.backgroundColor as string) || ''}
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="transparent"
          />
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Text Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={(styles.color as string) || '#000000'}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
          />
          <input
            type="text"
            value={(styles.color as string) || ''}
            onChange={(e) => handleChange('color', e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="inherit"
          />
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Border Radius
        </label>
        <select
          value={(styles.borderRadius as string) || ''}
          onChange={(e) => handleChange('borderRadius', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">None</option>
          <option value="0.125rem">Small</option>
          <option value="0.375rem">Medium</option>
          <option value="0.5rem">Large</option>
          <option value="0.75rem">XL</option>
          <option value="1rem">2XL</option>
          <option value="9999px">Full</option>
        </select>
      </div>

      {/* Shadow */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Shadow
        </label>
        <select
          value={(styles.boxShadow as string) || ''}
          onChange={(e) => handleChange('boxShadow', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">None</option>
          <option value="0 1px 2px 0 rgb(0 0 0 / 0.05)">Small</option>
          <option value="0 4px 6px -1px rgb(0 0 0 / 0.1)">Medium</option>
          <option value="0 10px 15px -3px rgb(0 0 0 / 0.1)">Large</option>
          <option value="0 20px 25px -5px rgb(0 0 0 / 0.1)">XL</option>
        </select>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Opacity
        </label>
        <input
          type="range"
          value={((styles.opacity as number) ?? 1) * 100}
          onChange={(e) => handleChange('opacity', parseInt(e.target.value) / 100)}
          min={0}
          max={100}
          className="w-full"
        />
      </div>
    </div>
  );
}

// =====================================================
// LAYOUT EDITOR
// =====================================================

function LayoutEditor({ block, breakpoint, onUpdate }: StyleEditorProps) {
  const styles = block.styles[breakpoint] || {};

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(block.id, breakpoint, { [key]: value });
    },
    [block.id, breakpoint, onUpdate]
  );

  return (
    <div className="space-y-3">
      {/* Width */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Width
        </label>
        <input
          type="text"
          value={(styles.width as string) || ''}
          onChange={(e) => handleChange('width', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="auto"
        />
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Height
        </label>
        <input
          type="text"
          value={(styles.height as string) || ''}
          onChange={(e) => handleChange('height', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="auto"
        />
      </div>

      {/* Text Align */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Text Align
        </label>
        <div className="flex gap-1">
          {[
            { value: 'left', icon: AlignLeft },
            { value: 'center', icon: AlignCenter },
            { value: 'right', icon: AlignRight },
          ].map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleChange('textAlign', value)}
              className={`flex-1 p-1.5 rounded ${
                styles.textAlign === value
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon className="h-4 w-4 mx-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Display */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Display
        </label>
        <select
          value={(styles.display as string) || ''}
          onChange={(e) => handleChange('display', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Default</option>
          <option value="block">Block</option>
          <option value="flex">Flex</option>
          <option value="grid">Grid</option>
          <option value="inline">Inline</option>
          <option value="inline-block">Inline Block</option>
          <option value="none">None</option>
        </select>
      </div>
    </div>
  );
}

// =====================================================
// SPACING EDITOR
// =====================================================

function SpacingEditor({ block, breakpoint, onUpdate }: StyleEditorProps) {
  const styles = block.styles[breakpoint] || {};

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(block.id, breakpoint, { [key]: value });
    },
    [block.id, breakpoint, onUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Margin */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Margin
        </label>
        <SpacingInput
          value={styles.margin as string}
          onChange={(value) => handleChange('margin', value)}
        />
      </div>

      {/* Padding */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Padding
        </label>
        <SpacingInput
          value={styles.padding as string}
          onChange={(value) => handleChange('padding', value)}
        />
      </div>
    </div>
  );
}

interface SpacingInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

function SpacingInput({ value, onChange }: SpacingInputProps) {
  // Parse value like "10px 20px 10px 20px" into [top, right, bottom, left]
  const parts = (value || '0 0 0 0').split(' ').map((v) => parseInt(v) || 0);
  const [top, right, bottom, left] = [
    parts[0] || 0,
    (parts[1] ?? parts[0]) || 0,
    (parts[2] ?? parts[0]) || 0,
    ((parts[3] ?? parts[1]) ?? parts[0]) || 0,
  ];

  const handleSideChange = (side: string, newValue: number) => {
    const newParts = { top, right, bottom, left, [side]: newValue };
    onChange(`${newParts.top}px ${newParts.right}px ${newParts.bottom}px ${newParts.left}px`);
  };

  return (
    <div className="grid grid-cols-3 gap-1 place-items-center">
      <div />
      <input
        type="number"
        value={top}
        onChange={(e) => handleSideChange('top', parseInt(e.target.value) || 0)}
        className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        placeholder="T"
      />
      <div />
      <input
        type="number"
        value={left}
        onChange={(e) => handleSideChange('left', parseInt(e.target.value) || 0)}
        className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        placeholder="L"
      />
      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded" />
      <input
        type="number"
        value={right}
        onChange={(e) => handleSideChange('right', parseInt(e.target.value) || 0)}
        className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        placeholder="R"
      />
      <div />
      <input
        type="number"
        value={bottom}
        onChange={(e) => handleSideChange('bottom', parseInt(e.target.value) || 0)}
        className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        placeholder="B"
      />
      <div />
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function formatLabel(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
