'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';

export default function NewPagePage() {
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generatedSlug);
  }, []);

  const handleCreate = async () => {
    if (!name || !slug) {
      toast.error('Name and slug are required');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .insert({
          name,
          slug,
          title: name,
          description,
          status: 'draft',
          layout_config: {
            maxWidth: '1280px',
            padding: { x: 16, y: 24 },
            gap: 16,
          },
          seo_config: {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A page with this slug already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Page created');
      router.push(`/cms/${data.id}`);
    } catch (error) {
      console.error('Failed to create page:', error);
      toast.error('Failed to create page');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/cms"
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back to Pages</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create a new page
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Design your page visually with the page builder
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Page name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My New Page"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-400">
                This is the internal name for your page
              </p>
            </div>

            {/* URL slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg text-gray-500 dark:text-gray-400 text-sm">
                  urbanmanual.co/p/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-r-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-new-page"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                URL-friendly identifier (lowercase, hyphens only)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="A brief description of this page..."
              />
              <p className="mt-1 text-xs text-gray-400">
                Optional description for SEO and social sharing
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <Link
              href="/cms"
              className="flex-1 px-4 py-3 text-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={!name || !slug || isCreating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Page'
              )}
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div
          className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Tips for creating pages
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Choose a descriptive name that&apos;s easy to find</li>
            <li>• Keep URLs short and meaningful</li>
            <li>• Use hyphens to separate words in slugs</li>
            <li>• Add a description for better SEO</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
