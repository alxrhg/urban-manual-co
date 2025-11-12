'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './useToast';

export interface DatasetSummary {
  key: string;
  label: string;
  available: boolean;
  description: string;
  total?: number;
  newThisWeek?: number;
  active30d?: number;
  pending?: number;
  totalEvents?: number;
  searches?: number;
  searchesLastWeek?: number;
  discoveryEngineEnabled?: boolean;
}

export interface ModerationItem {
  id: number | string;
  slug?: string;
  name?: string;
  city?: string;
  category?: string;
  status: string;
  flaggedReason: string | null;
  updatedAt: string | null;
}

export interface SupportTicketItem {
  id: number | string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo: string | null;
  payload: Record<string, unknown>;
}

export interface DashboardResponse {
  datasets: DatasetSummary[];
  moderation: {
    items: ModerationItem[];
    unavailable: boolean;
  };
  support: {
    items: SupportTicketItem[];
    unavailable: boolean;
  };
  systemStatus: {
    supabaseConfigured: boolean;
    lastAnalyticsEvent: string | null;
    lastContentUpdate: string | null;
    datasetsUnavailable: string[];
  };
}

export interface ModerationActionPayload {
  ids: Array<number | string>;
  action: 'approve' | 'reject' | 'flag' | 'reset';
  notes?: string;
}

export interface SupportActionPayload {
  ids: Array<number | string>;
  action: 'assign' | 'close' | 'reopen' | 'escalate' | 'update_priority';
  assigneeId?: string;
  notes?: string;
  priority?: string;
}

async function fetchDashboard(): Promise<DashboardResponse> {
  const response = await fetch('/api/admin/dashboard');
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to load admin dashboard');
  }
  return response.json();
}

async function postModerationAction(payload: ModerationActionPayload) {
  const response = await fetch('/api/admin/moderation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update moderation queue');
  }

  return response.json();
}

async function postSupportAction(payload: SupportActionPayload) {
  const response = await fetch('/api/admin/support', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update support tickets');
  }

  return response.json();
}

export function useAdminData() {
  const { success, error: showError, info } = useToast();
  const queryClient = useQueryClient();
  const [moderationFilter, setModerationFilter] = useState<'all' | 'pending' | 'flagged' | 'needs_enrichment' | 'approved'>(
    'all'
  );
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'closed' | 'escalated' | 'high' | 'medium' | 'low'>(
    'all'
  );

  const dashboardQuery = useQuery<DashboardResponse, Error>({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchDashboard,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const moderationMutation = useMutation({
    mutationFn: postModerationAction,
    onSuccess: () => {
      success('Moderation queue updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (mutationError: any) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to update moderation queue';
      showError(message);
    },
  });

  const supportMutation = useMutation({
    mutationFn: postSupportAction,
    onSuccess: () => {
      success('Support tickets updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (mutationError: any) => {
      const message = mutationError instanceof Error ? mutationError.message : 'Failed to update support tickets';
      showError(message);
    },
  });

  const moderationItems = useMemo(() => {
    if (!dashboardQuery.data) return [] as ModerationItem[];
    if (moderationFilter === 'all') return dashboardQuery.data.moderation.items;
    return dashboardQuery.data.moderation.items.filter(item => {
      if (moderationFilter === 'needs_enrichment') {
        return item.status === 'needs_enrichment';
      }
      return item.status === moderationFilter;
    });
  }, [dashboardQuery.data, moderationFilter]);

  const supportItems = useMemo(() => {
    if (!dashboardQuery.data) return [] as SupportTicketItem[];
    const items = dashboardQuery.data.support.items;
    if (supportFilter === 'all') return items;

    if (supportFilter === 'open' || supportFilter === 'closed' || supportFilter === 'escalated') {
      return items.filter(item => item.status === supportFilter);
    }

    return items.filter(item => item.priority?.toLowerCase() === supportFilter);
  }, [dashboardQuery.data, supportFilter]);

  const bulkModerationAction = useCallback(
    async (payload: ModerationActionPayload) => {
      if (!payload.ids || payload.ids.length === 0) {
        showError('Select at least one destination');
        return;
      }
      await moderationMutation.mutateAsync(payload);
    },
    [moderationMutation, showError]
  );

  const bulkSupportAction = useCallback(
    async (payload: SupportActionPayload) => {
      if (!payload.ids || payload.ids.length === 0) {
        showError('Select at least one ticket');
        return;
      }
      await supportMutation.mutateAsync(payload);
    },
    [supportMutation, showError]
  );

  const datasetSummary = dashboardQuery.data?.datasets ?? [];
  const systemStatus = dashboardQuery.data?.systemStatus;
  const supportAllItems = dashboardQuery.data?.support.items ?? [];

  return {
    datasetSummary,
    moderationItems,
    supportItems,
    supportAllItems,
    moderationUnavailable: dashboardQuery.data?.moderation.unavailable ?? false,
    supportUnavailable: dashboardQuery.data?.support.unavailable ?? false,
    moderationFilter,
    setModerationFilter,
    supportFilter,
    setSupportFilter,
    bulkModerationAction,
    bulkSupportAction,
    systemStatus,
    refetch: dashboardQuery.refetch,
    isLoading: dashboardQuery.isLoading,
    isFetching: dashboardQuery.isFetching,
    error: dashboardQuery.error,
    info,
  };
}
