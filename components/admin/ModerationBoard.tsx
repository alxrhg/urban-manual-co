'use client';

import { useMemo, useState } from 'react';
import { AlertOctagon, Check, RefreshCcw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ModerationItem, ModerationActionPayload } from '@/hooks/useAdminData';

interface ModerationBoardProps {
  items: ModerationItem[];
  filter: 'all' | 'pending' | 'flagged' | 'needs_enrichment' | 'approved';
  onFilterChange: (value: ModerationBoardProps['filter']) => void;
  onBulkAction: (payload: ModerationActionPayload) => Promise<void>;
  unavailable?: boolean;
  isLoading?: boolean;
}

function formatRelative(dateString: string | null) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) {
    const value = Math.max(1, Math.round(diff / minute));
    return `${value}m ago`;
  }
  if (diff < day) {
    const value = Math.max(1, Math.round(diff / hour));
    return `${value}h ago`;
  }
  const value = Math.max(1, Math.round(diff / day));
  return `${value}d ago`;
}

const FILTERS: Array<{ value: ModerationBoardProps['filter']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'needs_enrichment', label: 'Needs enrichment' },
  { value: 'approved', label: 'Approved' },
];

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending review', variant: 'secondary' },
  flagged: { label: 'Flagged', variant: 'destructive' },
  needs_enrichment: { label: 'Needs enrichment', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
};

export function ModerationBoard({
  items,
  filter,
  onFilterChange,
  onBulkAction,
  unavailable,
  isLoading,
}: ModerationBoardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const filteredItems = useMemo(() => items, [items]);

  const toggleSelection = (id: number | string) => {
    setSelected(prev => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredItems.map(item => String(item.id))));
  };

  const selectedIds = Array.from(selected).map(id => (Number.isNaN(Number(id)) ? id : Number(id)));

  const performAction = async (action: ModerationActionPayload['action']) => {
    try {
      await onBulkAction({
        action,
        ids: selectedIds,
        notes: notes.trim() || undefined,
      });
      setSelected(new Set());
      setNotes('');
    } catch {
      // Errors are surfaced via toast in the hook; keep selection for retry.
    }
  };

  return (
    <section aria-labelledby="moderation-board-heading" className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="moderation-board-heading" className="text-xl font-semibold">
            Moderation queue
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review destinations awaiting approval or enrichment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Bulk actions</CardTitle>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Internal notes (optional)"
              className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => performAction('approve')}
                disabled={selected.size === 0 || isLoading}
              >
                <Check className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => performAction('flag')}
                disabled={selected.size === 0 || isLoading}
              >
                <TriangleAlert className="mr-2 h-4 w-4" /> Flag
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => performAction('reject')}
                disabled={selected.size === 0 || isLoading}
              >
                <AlertOctagon className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => performAction('reset')}
                disabled={selected.size === 0 || isLoading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {unavailable ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-amber-600 dark:text-amber-300">
              <ShieldAlert className="h-8 w-8" />
              <p>Moderation metadata is not configured in Supabase yet.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No items match this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selected.size > 0 && selected.size === filteredItems.length}
                      onChange={event => toggleAll(event.target.checked)}
                      aria-label="Select all destinations"
                    />
                  </TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
                  const key = String(item.id);
                  return (
                    <TableRow key={key} className={cn(selected.has(key) && 'bg-gray-50 dark:bg-gray-800/40')}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selected.has(key)}
                          onChange={() => toggleSelection(item.id)}
                          aria-label={`Select ${item.name ?? item.slug}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name ?? item.slug ?? 'Untitled'}</div>
                        {item.flaggedReason && (
                          <p className="text-xs text-amber-600 dark:text-amber-300">{item.flaggedReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{item.city ?? '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{item.category ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {formatRelative(item.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
