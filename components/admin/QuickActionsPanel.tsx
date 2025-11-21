'use client';

import { useState, useRef, useEffect } from 'react';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
  Database,
  Edit,
  FileText,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface QuickActionsPanelProps {
  onCreateDestination?: () => void;
  onExportData?: (format: 'csv' | 'json' | 'excel') => void;
  onBulkImport?: (data: any[], format: 'csv' | 'json') => void;
  onRunEnrichment?: (slugs?: string[]) => void;
}

interface ActionCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  shortcut?: string;
  onClick: () => void;
  badge?: string;
}

export function QuickActionsPanel({
  onCreateDestination,
  onExportData,
  onBulkImport,
  onRunEnrichment,
}: QuickActionsPanelProps) {
  const { isEditMode, enableEditMode, disableEditMode } = useAdminEditMode();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // Create destination with template
  const handleCreateDestination = (template?: string) => {
    if (onCreateDestination) {
      onCreateDestination();
    } else {
      // Default behavior - could open a modal or navigate
      toast.info('Create destination action triggered');
    }
  };

  // Bulk import handler
  const handleBulkImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      
      let data: any[] = [];
      
      if (format === 'json') {
        data = JSON.parse(text);
      } else {
        // Simple CSV parser (could be enhanced)
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = values[i] || '';
          });
          return obj;
        }).filter(obj => Object.keys(obj).length > 0);
      }

      if (onBulkImport) {
        onBulkImport(data, format);
      } else {
        toast.success(`Imported ${data.length} records from ${file.name}`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Failed to import: ${error.message || 'Invalid file format'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export data handler
  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    setIsExporting(true);
    try {
      if (onExportData) {
        onExportData(format);
      } else {
        // Default export behavior
        const supabase = createClient({ skipValidation: true });
        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .limit(1000);

        if (error) throw error;

        let content = '';
        let mimeType = '';
        let extension = '';

        if (format === 'json') {
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          extension = 'json';
        } else if (format === 'csv') {
          if (data && data.length > 0) {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).map(v => 
              typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
            ).join(','));
            content = [headers, ...rows].join('\n');
          }
          mimeType = 'text/csv';
          extension = 'csv';
        } else {
          // Excel format (CSV for now, could use a library like xlsx)
          if (data && data.length > 0) {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).map(v => 
              typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
            ).join(','));
            content = [headers, ...rows].join('\n');
          }
          mimeType = 'text/csv';
          extension = 'xlsx';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `destinations-export-${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${data?.length || 0} destinations as ${format.toUpperCase()}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync operations
  const handleSync = async (direction: 'supabase-to-sanity' | 'sanity-to-supabase' | 'full') => {
    setIsSyncing(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      if (direction === 'supabase-to-sanity' || direction === 'full') {
        const response = await fetch('/api/admin/sync-sanity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ dryRun: false }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Sync failed');
        }

        const result = await response.json();
        toast.success(`Synced ${result.stats.created + result.stats.updated} destinations to Sanity`);
      }

      // Note: Sanity → Supabase sync would require a different endpoint
      if (direction === 'sanity-to-supabase' || direction === 'full') {
        toast.info('Sanity → Supabase sync not yet implemented');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run enrichment
  const handleEnrichment = async () => {
    setIsEnriching(true);
    try {
      if (onRunEnrichment) {
        await onRunEnrichment();
      } else {
        // Default enrichment behavior
        toast.info('Enrichment feature - select destinations in the table to enrich');
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast.error(`Enrichment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsEnriching(false);
    }
  };

  // Open Sanity Studio
  const handleOpenSanityStudio = () => {
    const studioUrl = '/studio';
    window.open(studioUrl, '_blank', 'noopener,noreferrer');
  };

  const actions: ActionCard[] = [
    {
      id: 'create',
      label: 'Create Destination',
      description: 'Add a new destination with template',
      icon: Plus,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      shortcut: 'C',
      onClick: () => handleCreateDestination(),
    },
    {
      id: 'import',
      label: 'Bulk Import',
      description: 'Import from CSV or JSON',
      icon: Upload,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      shortcut: 'I',
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'export',
      label: 'Export Data',
      description: 'Export to CSV, JSON, or Excel',
      icon: Download,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      shortcut: 'E',
      onClick: () => {}, // Handled by dropdown
    },
    {
      id: 'sync-supabase-sanity',
      label: 'Sync to Sanity',
      description: 'Supabase → Sanity',
      icon: ArrowRight,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      onClick: () => handleSync('supabase-to-sanity'),
    },
    {
      id: 'sync-sanity-supabase',
      label: 'Sync from Sanity',
      description: 'Sanity → Supabase',
      icon: ArrowLeft,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      onClick: () => handleSync('sanity-to-supabase'),
    },
    {
      id: 'sync-full',
      label: 'Full Sync',
      description: 'Bidirectional sync',
      icon: ArrowUpDown,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      onClick: () => handleSync('full'),
    },
    {
      id: 'edit-mode',
      label: 'Edit Mode',
      description: isEditMode ? 'Disable edit mode' : 'Enable edit mode',
      icon: Edit,
      color: isEditMode ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400',
      bgColor: isEditMode ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
      badge: isEditMode ? 'Active' : 'Inactive',
      shortcut: 'M',
      onClick: () => isEditMode ? disableEditMode() : enableEditMode(),
    },
    {
      id: 'sanity-studio',
      label: 'Sanity Studio',
      description: 'Open in new tab',
      icon: ExternalLink,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      shortcut: 'S',
      onClick: handleOpenSanityStudio,
    },
    {
      id: 'enrichment',
      label: 'Run Enrichment',
      description: 'Enrich selected destinations',
      icon: Sparkles,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      shortcut: 'R',
      onClick: handleEnrichment,
    },
  ];

  // Keyboard shortcuts
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      const action = actions.find(a => a.shortcut?.toLowerCase() === key);
      if (action) {
        e.preventDefault();
        action.onClick();
      }
    }
  };

  // Add keyboard shortcut listeners
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress as any);
      return () => window.removeEventListener('keydown', handleKeyPress as any);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Common operations and shortcuts
          </p>
        </div>
        <Zap className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleBulkImport(file);
          }
        }}
      />

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isLoading = 
            (action.id === 'import' && isImporting) ||
            (action.id === 'export' && isExporting) ||
            (action.id.startsWith('sync') && isSyncing) ||
            (action.id === 'enrichment' && isEnriching);

          // Special handling for export (dropdown)
          if (action.id === 'export') {
            return (
              <DropdownMenu key={action.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'relative p-4 rounded-xl border border-gray-200 dark:border-gray-800',
                      'hover:border-gray-300 dark:hover:border-gray-700',
                      'transition-all hover:shadow-md',
                      action.bgColor,
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={isLoading}
                  >
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2 w-full">
                        <Icon className={cn('h-5 w-5', action.color)} />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white flex-1 text-left">
                          {action.label}
                        </span>
                        {action.shortcut && (
                          <Badge variant="secondary" className="text-[0.65rem] px-1 py-0">
                            ⌘{action.shortcut}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[0.65rem] text-gray-600 dark:text-gray-400 text-left">
                        {action.description}
                      </p>
                    </div>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-xl">
                        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          // Regular action card
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={isLoading}
              className={cn(
                'relative p-4 rounded-xl border border-gray-200 dark:border-gray-800',
                'hover:border-gray-300 dark:hover:border-gray-700',
                'transition-all hover:shadow-md',
                action.bgColor,
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 w-full">
                  <Icon className={cn('h-5 w-5', action.color)} />
                  <span className="text-xs font-semibold text-gray-900 dark:text-white flex-1 text-left">
                    {action.label}
                  </span>
                  {action.badge && (
                    <Badge
                      variant={action.id === 'edit-mode' && isEditMode ? 'default' : 'secondary'}
                      className="text-[0.65rem] px-1.5 py-0"
                    >
                      {action.badge}
                    </Badge>
                  )}
                  {action.shortcut && !action.badge && (
                    <Badge variant="secondary" className="text-[0.65rem] px-1 py-0">
                      ⌘{action.shortcut}
                    </Badge>
                  )}
                </div>
                <p className="text-[0.65rem] text-gray-600 dark:text-gray-400 text-left">
                  {action.description}
                </p>
              </div>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-xl">
                  <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Keyboard Shortcuts:</strong> Use ⌘+[key] to quickly access actions (C=Create, I=Import, E=Export, M=Edit Mode, S=Studio, R=Enrich)
        </p>
      </div>
    </div>
  );
}

