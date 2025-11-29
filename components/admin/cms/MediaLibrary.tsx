'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Upload,
  Grid,
  List,
  Filter,
  Trash2,
  Download,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  Film,
  File,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  MoreVertical,
  FolderPlus,
  HardDrive,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  created_at: string;
  destination_id?: number;
  destination_name?: string;
}

type ViewMode = 'grid' | 'list';

export function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  const ITEMS_PER_PAGE = viewMode === 'grid' ? 24 : 20;

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch destinations with images
      let query = supabase
        .from('destinations')
        .select('id, name, image, primary_photo_url, photos_json, created_at', { count: 'exact' })
        .not('image', 'is', null);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, count, error } = await query;

      if (error) throw error;

      const mediaItems: MediaItem[] = [];
      let totalSize = 0;

      data?.forEach((dest) => {
        if (dest.image) {
          mediaItems.push({
            id: `${dest.id}-main`,
            name: `${dest.name} - Main Image`,
            url: dest.image,
            type: 'image',
            size: 500000, // Estimated size
            created_at: dest.created_at,
            destination_id: dest.id,
            destination_name: dest.name,
          });
          totalSize += 500000;
        }

        if (dest.primary_photo_url && dest.primary_photo_url !== dest.image) {
          mediaItems.push({
            id: `${dest.id}-primary`,
            name: `${dest.name} - Primary Photo`,
            url: dest.primary_photo_url,
            type: 'image',
            size: 600000,
            created_at: dest.created_at,
            destination_id: dest.id,
            destination_name: dest.name,
          });
          totalSize += 600000;
        }

        // Parse additional photos from JSON
        if (dest.photos_json) {
          const photos = typeof dest.photos_json === 'string'
            ? JSON.parse(dest.photos_json)
            : dest.photos_json;

          if (Array.isArray(photos)) {
            photos.slice(0, 3).forEach((photo: { url?: string; photo_reference?: string }, idx: number) => {
              const photoUrl = photo.url || photo.photo_reference;
              if (photoUrl) {
                mediaItems.push({
                  id: `${dest.id}-photo-${idx}`,
                  name: `${dest.name} - Photo ${idx + 1}`,
                  url: photoUrl,
                  type: 'image',
                  size: 400000,
                  created_at: dest.created_at,
                  destination_id: dest.id,
                  destination_name: dest.name,
                });
                totalSize += 400000;
              }
            });
          }
        }
      });

      setMedia(mediaItems);
      setTotalCount(count ? count * 2 : 0); // Approximate
      setStorageUsed(totalSize);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, ITEMS_PER_PAGE]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (error) throw error;
      }

      fetchMedia();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media item?')) return;
    // In a real app, you would delete from storage
    setMedia(media.filter(m => m.id !== id));
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} items?`)) return;
    setMedia(media.filter(m => !selectedItems.has(m.id)));
    setSelectedItems(new Set());
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Media Library</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage images and media files for destinations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-lg border border-gray-800">
            <HardDrive className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">{formatFileSize(storageUsed)} used</span>
          </div>
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search media..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-900 rounded-lg border border-gray-800 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <span className="text-sm text-indigo-300">
            {selectedItems.size} selected
          </span>
          <div className="h-4 w-px bg-indigo-500/30" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Media Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div
              key={i}
              className={`bg-gray-800 rounded-lg animate-pulse ${viewMode === 'grid' ? 'aspect-square' : 'h-16'}`}
            />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No media files found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className={`
                group relative aspect-square rounded-lg overflow-hidden bg-gray-800 border transition-all cursor-pointer
                ${selectedItems.has(item.id) ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-800 hover:border-gray-700'}
              `}
              onClick={() => setSelectedMedia(item)}
            >
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Checkbox */}
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(item.id);
                }}
              >
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${selectedItems.has(item.id)
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'}
                `}>
                  {selectedItems.has(item.id) && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white truncate max-w-[80%]">
                  {item.destination_name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUrl(item.url);
                  }}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {copiedUrl === item.url ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="w-12 px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">File</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Destination</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Size</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Date</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {media.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-900/50 transition-colors ${selectedItems.has(item.id) ? 'bg-indigo-500/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-gray-800 overflow-hidden flex-shrink-0">
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm text-white truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{item.destination_name || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{formatFileSize(item.size)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyUrl(item.url)}
                        className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        {copiedUrl === item.url ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setSelectedMedia(item)}
                        className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-gray-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedMedia.url}
              alt={selectedMedia.name}
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="p-4 border-t border-gray-800">
              <h3 className="font-medium text-white">{selectedMedia.name}</h3>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{formatFileSize(selectedMedia.size)}</span>
                <span>{new Date(selectedMedia.created_at).toLocaleDateString()}</span>
                {selectedMedia.destination_name && (
                  <span>From: {selectedMedia.destination_name}</span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => copyUrl(selectedMedia.url)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
                >
                  {copiedUrl === selectedMedia.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy URL
                </button>
                <a
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={() => {
                    handleDelete(selectedMedia.id);
                    setSelectedMedia(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-sm text-rose-400 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
