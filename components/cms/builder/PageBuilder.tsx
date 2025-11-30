'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageBuilderProvider } from '@/contexts/PageBuilderContext';
import { Toolbar } from './Toolbar';
import { BlockLibrary } from './BlockLibrary';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';

interface PageBuilderProps {
  pageId?: string;
}

export function PageBuilder({ pageId }: PageBuilderProps) {
  return (
    <PageBuilderProvider pageId={pageId}>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        {/* Top toolbar */}
        <Toolbar />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Block library */}
          <BlockLibrary />

          {/* Center - Canvas */}
          <Canvas />

          {/* Right sidebar - Properties */}
          <PropertyPanel />
        </div>
      </div>
    </PageBuilderProvider>
  );
}

// Export a wrapper for creating new pages
export function PageBuilderNew() {
  return (
    <PageBuilderProvider>
      <NewPageFlow />
    </PageBuilderProvider>
  );
}

function NewPageFlow() {
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [pageName, setPageName] = React.useState('');
  const [pageSlug, setPageSlug] = React.useState('');

  // Auto-generate slug from name
  React.useEffect(() => {
    setPageSlug(
      pageName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }, [pageName]);

  if (showBuilder) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <BlockLibrary />
          <Canvas />
          <PropertyPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
      <motion.div
        className="max-w-md w-full bg-white dark:bg-gray-950 rounded-xl shadow-xl p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create a new page
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Give your page a name and URL-friendly slug.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Page Name
            </label>
            <input
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My New Page"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Slug
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg text-gray-500 dark:text-gray-400 text-sm">
                /p/
              </span>
              <input
                type="text"
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-r-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-new-page"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href="/cms"
            className="flex-1 px-4 py-2 text-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => setShowBuilder(true)}
            disabled={!pageName || !pageSlug}
            className="flex-1 px-4 py-2 text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Page
          </button>
        </div>
      </motion.div>
    </div>
  );
}
