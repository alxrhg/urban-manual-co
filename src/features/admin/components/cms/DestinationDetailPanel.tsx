'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Loader2,
  Save,
} from 'lucide-react';
import type { Destination } from '@/types/destination';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Textarea } from '@/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import { cn } from '@/lib/utils';

interface DestinationDetailPanelProps {
  destination?: Destination;
  onSave: (data: Partial<Destination>) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

const CATEGORIES = [
  'restaurant', 'hotel', 'bar', 'cafe', 'gallery', 'museum',
  'shop', 'landmark', 'park', 'beach', 'market', 'spa', 'club',
];

export function DestinationDetailPanel({
  destination,
  onSave,
  onClose,
  isSaving,
}: DestinationDetailPanelProps) {
  const [formData, setFormData] = useState({
    name: destination?.name || '',
    slug: destination?.slug || '',
    city: destination?.city || '',
    country: destination?.country || '',
    category: destination?.category || '',
    micro_description: destination?.micro_description || '',
    description: destination?.description || '',
    content: destination?.content || '',
    image: destination?.image || '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData({
      name: destination?.name || '',
      slug: destination?.slug || '',
      city: destination?.city || '',
      country: destination?.country || '',
      category: destination?.category || '',
      micro_description: destination?.micro_description || '',
      description: destination?.description || '',
      content: destination?.content || '',
      image: destination?.image || '',
    });
    setHasChanges(false);
  }, [destination]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    updateField('name', name);
    if (!destination?.id) {
      updateField('slug', generateSlug(name));
    }
  };

  const handleSave = async () => {
    const dataToSave: Partial<Destination> = {
      ...formData,
    };
    if (destination?.id) {
      dataToSave.id = destination.id;
    }
    await onSave(dataToSave);
    setHasChanges(false);
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://urbanmanual.co';

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title
              </label>
              <span className="text-xs text-red-500">Required</span>
            </div>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter title..."
              className="text-base"
            />
          </div>

          {/* Slug Field with URL Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Slug
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              placeholder="url-friendly-slug"
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Link2 className="w-3 h-3" />
              <span className="truncate">
                {siteUrl}/destinations/{formData.slug || 'your-slug-here'}
              </span>
            </div>
          </div>

          {/* Category & City Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(val) => updateField('category', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="e.g. London"
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <Input
              value={formData.micro_description}
              onChange={(e) => updateField('micro_description', e.target.value)}
              placeholder="Short description for listings..."
            />
          </div>

          {/* Content Field with Rich Text Toolbar */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>

            {/* Rich Text Toolbar */}
            <div className="flex items-center gap-1 p-2 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-900">
              <Select defaultValue="body">
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="body">Body</SelectItem>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                </SelectContent>
              </Select>

              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <ToolbarButton icon={<Link2 className="w-4 h-4" />} />
              <ToolbarButton icon={<Bold className="w-4 h-4" />} />
              <ToolbarButton icon={<Italic className="w-4 h-4" />} />
              <ToolbarButton icon={<Underline className="w-4 h-4" />} />

              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <ToolbarButton icon={<AlignLeft className="w-4 h-4" />} />
              <ToolbarButton icon={<AlignCenter className="w-4 h-4" />} />
              <ToolbarButton icon={<AlignRight className="w-4 h-4" />} />

              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <ToolbarButton icon={<List className="w-4 h-4" />} />
              <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} />
              <ToolbarButton icon={<ImageIcon className="w-4 h-4" />} />
            </div>

            {/* Content Editor */}
            <div
              ref={contentRef}
              className="min-h-[300px] p-4 border border-gray-200 dark:border-gray-700 rounded-b-md bg-white dark:bg-gray-950 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
            >
              <Textarea
                value={formData.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="Write your content here..."
                className="min-h-[280px] border-0 p-0 focus-visible:ring-0 resize-none"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Image URL
            </label>
            <Input
              value={formData.image}
              onChange={(e) => updateField('image', e.target.value)}
              placeholder="https://..."
            />
            {formData.image && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with Save Button */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {hasChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
        active && 'bg-gray-200 dark:bg-gray-700'
      )}
    >
      {icon}
    </button>
  );
}
