'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, LifeBuoy, MailCheck, Sparkle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SupportTicketItem, SupportActionPayload } from '@/hooks/useAdminData';

interface SupportBoardProps {
  allItems: SupportTicketItem[];
  filter: 'all' | 'open' | 'closed' | 'escalated' | 'high' | 'medium' | 'low';
  onFilterChange: (value: SupportBoardProps['filter']) => void;
  onBulkAction: (payload: SupportActionPayload) => Promise<void>;
  unavailable?: boolean;
  isLoading?: boolean;
}

const STATUS_COLUMNS = [
  {
    key: 'open',
    label: 'Open',
    description: 'Newly created or awaiting response',
    icon: LifeBuoy,
    matcher: (item: SupportTicketItem) => {
      const status = (item.status || 'open').toLowerCase();
      const escalated = Boolean((item.payload as Record<string, any>)?.escalated);
      return status === 'open' && !escalated;
    },
  },
  {
    key: 'escalated',
    label: 'Escalated',
    description: 'Requires leadership attention',
    icon: ArrowUpRight,
    matcher: (item: SupportTicketItem) => {
      const status = (item.status || '').toLowerCase();
      const escalated = Boolean((item.payload as Record<string, any>)?.escalated);
      return status === 'escalated' || escalated;
    },
  },
  {
    key: 'closed',
    label: 'Resolved',
    description: 'Completed or archived cases',
    icon: MailCheck,
    matcher: (item: SupportTicketItem) => (item.status || '').toLowerCase() === 'closed',
  },
];

const FILTERS: Array<{ value: SupportBoardProps['filter']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed' },
  { value: 'high', label: 'High priority' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-500/10 text-red-500 border-red-500/40' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-500 border-amber-500/40' },
  low: { label: 'Low', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40' },
};

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export function SupportBoard({
  allItems,
  filter,
  onFilterChange,
  onBulkAction,
  unavailable,
  isLoading,
}: SupportBoardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return allItems;
    const normalized = filter.toLowerCase();
    if (normalized === 'open' || normalized === 'closed' || normalized === 'escalated') {
      return allItems.filter(item => {
        const status = (item.status || '').toLowerCase();
        const escalated = Boolean((item.payload as Record<string, any>)?.escalated);
        if (normalized === 'escalated') {
          return status === 'escalated' || escalated;
        }
        return status === normalized;
      });
    }
    return allItems.filter(item => (item.priority || '').toLowerCase() === normalized);
  }, [allItems, filter]);

  const columns = useMemo(() => {
    return STATUS_COLUMNS.map(column => ({
      ...column,
      items: filtered.filter(column.matcher),
    }));
  }, [filtered]);

  const toggle = (id: number | string) => {
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

  const clearSelection = () => setSelected(new Set());

  const selectedIds = Array.from(selected).map(id => (Number.isNaN(Number(id)) ? id : Number(id)));

  const handleAction = async (action: SupportActionPayload['action']) => {
    try {
      await onBulkAction({
        action,
        ids: selectedIds,
        assigneeId: assignee || undefined,
        notes: notes.trim() || undefined,
        priority: priority || undefined,
      });
      clearSelection();
      setAssignee('');
      setPriority('');
      setNotes('');
    } catch {
      // Errors surface via toast
    }
  };

  return (
    <section aria-labelledby="support-board-heading" className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="support-board-heading" className="text-xl font-semibold">
            Support workflow
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track support and escalation tickets with quick bulk updates.
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
          <CardTitle className="text-base font-semibold">Bulk ticket controls</CardTitle>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <input
              type="text"
              value={assignee}
              onChange={event => setAssignee(event.target.value)}
              placeholder="Assign to user id"
              className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 sm:max-w-xs"
            />
            <select
              value={priority}
              onChange={event => setPriority(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 sm:w-32"
            >
              <option value="">Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Comment (optional)"
              className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleAction('assign')}
                disabled={selected.size === 0 || (!assignee && !priority) || isLoading}
              >
                <Sparkle className="mr-2 h-4 w-4" /> Assign / Update
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('escalate')}
                disabled={selected.size === 0 || isLoading}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" /> Escalate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction('close')}
                disabled={selected.size === 0 || isLoading}
              >
                <MailCheck className="mr-2 h-4 w-4" /> Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unavailable ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-amber-600 dark:text-amber-300">
              <AlertTriangle className="h-8 w-8" />
              <p>Support ticket tables are not configured yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {columns.map(column => {
                const Icon = column.icon;
                return (
                  <div key={column.key} className="rounded-lg border border-gray-200 bg-white/60 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                            {column.label}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{column.description}</p>
                      </div>
                      <Badge variant="outline">{column.items.length}</Badge>
                    </div>

                    <div className="space-y-3">
                      {column.items.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No tickets</p>
                      ) : (
                        column.items.map(item => {
                          const key = String(item.id);
                          const priorityInfo = PRIORITY_BADGE[(item.priority || 'medium').toLowerCase()] ?? PRIORITY_BADGE.medium;
                          const escalated = Boolean((item.payload as Record<string, any>)?.escalated);
                          return (
                            <label
                              key={key}
                              className={cn(
                                'flex cursor-pointer flex-col gap-2 rounded-md border border-gray-200 bg-white/70 p-3 text-sm shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/40 dark:hover:border-gray-700',
                                selected.has(key) && 'border-primary/60 ring-2 ring-primary/30'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-50">{item.subject}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(item.createdAt)}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-gray-300"
                                  checked={selected.has(key)}
                                  onChange={() => toggle(item.id)}
                                  aria-label={`Select ticket ${item.subject}`}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className={cn('rounded-full border px-2 py-0.5', priorityInfo.className)}>
                                  Priority: {priorityInfo.label}
                                </span>
                                <span>Assigned: {item.assignedTo || 'Unassigned'}</span>
                                {escalated && <span className="text-amber-500">Escalated</span>}
                              </div>
                              {item.updatedAt && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Updated {formatTimestamp(item.updatedAt)}
                                </p>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
