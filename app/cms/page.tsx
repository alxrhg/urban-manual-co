'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Globe,
  Clock,
  CheckCircle2,
  Archive,
  Filter,
  SortAsc,
  LayoutGrid,
  List,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import type { CMSPage } from '@/types/cms';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  draft: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
  published: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
  archived: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: Archive },
};

export default function CMSDashboard() {
  const toast = useToast();
  const supabase = createClient();

  const [pages, setPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Failed to load pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const { error } = await supabase.from('cms_pages').delete().eq('id', pageId);
      if (error) throw error;
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      toast.success('Page deleted');
    } catch (error) {
      console.error('Failed to delete page:', error);
      toast.error('Failed to delete page');
    }
  };

  const handleDuplicate = async (page: CMSPage) => {
    try {
      const newSlug = `${page.slug}-copy-${Date.now()}`;
      const { data, error } = await supabase
        .from('cms_pages')
        .insert({
          name: `${page.name} (Copy)`,
          slug: newSlug,
          title: page.title,
          description: page.description,
          layout_config: page.layout_config,
          seo_config: page.seo_config,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Copy blocks
      const { data: blocks } = await supabase
        .from('cms_blocks')
        .select('*')
        .eq('page_id', page.id);

      if (blocks && blocks.length > 0) {
        const newBlocks = blocks.map((block) => ({
          ...block,
          id: undefined,
          page_id: data.id,
        }));
        await supabase.from('cms_blocks').insert(newBlocks);
      }

      setPages((prev) => [data, ...prev]);
      toast.success('Page duplicated');
    } catch (error) {
      console.error('Failed to duplicate page:', error);
      toast.error('Failed to duplicate page');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Page Builder
              </h1>
            </div>
            <Link
              href="/cms/new"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Page</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {pages.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Pages</div>
          </div>
          <div className="bg-white dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {pages.filter((p) => p.status === 'published').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Published</div>
          </div>
          <div className="bg-white dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pages.filter((p) => p.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Drafts</div>
          </div>
          <div className="bg-white dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {pages.filter((p) => p.status === 'archived').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Archived</div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPages.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No pages found'
                : 'No pages yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Get started by creating your first page'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/cms/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Page</span>
              </Link>
            )}
          </motion.div>
        )}

        {/* Pages grid/list */}
        {!isLoading && filteredPages.length > 0 && (
          <AnimatePresence mode="popLayout">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPages.map((page, index) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    index={index}
                    onDelete={() => handleDelete(page.id)}
                    onDuplicate={() => handleDuplicate(page)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Page
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        URL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredPages.map((page, index) => (
                      <PageRow
                        key={page.id}
                        page={page}
                        index={index}
                        onDelete={() => handleDelete(page.id)}
                        onDuplicate={() => handleDuplicate(page)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

interface PageItemProps {
  page: CMSPage;
  index: number;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PageCard({ page, index, onDelete, onDuplicate }: PageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusColors[page.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Preview area */}
      <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-900 relative">
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700">
          <FileText className="h-12 w-12" />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Link
            href={`/cms/${page.id}`}
            className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            <Pencil className="h-4 w-4 inline mr-1" />
            Edit
          </Link>
          {page.status === 'published' && (
            <Link
              href={`/p/${page.slug}`}
              target="_blank"
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <Eye className="h-4 w-4 inline mr-1" />
              View
            </Link>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{page.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">/p/{page.slug}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link
                  href={`/cms/${page.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
          >
            <StatusIcon className="h-3 w-3" />
            {page.status}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(page.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PageRow({ page, index, onDelete, onDuplicate }: PageItemProps) {
  const status = statusColors[page.status];
  const StatusIcon = status.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02 }}
      className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
    >
      <td className="px-4 py-3">
        <Link href={`/cms/${page.id}`} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{page.name}</div>
            {page.title && (
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {page.title}
              </div>
            )}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
        >
          <StatusIcon className="h-3 w-3" />
          {page.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <code className="text-sm text-gray-500 dark:text-gray-400">/p/{page.slug}</code>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {new Date(page.updated_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/cms/${page.id}`}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          {page.status === 'published' && (
            <Link
              href={`/p/${page.slug}`}
              target="_blank"
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
