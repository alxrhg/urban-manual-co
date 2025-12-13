'use client';

import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

type StatusType = 'open' | 'closing_soon' | 'closed' | 'unknown';

interface ItemStatusProps {
  status?: StatusType;
  closingTime?: string;
  waitMinutes?: number;
  compact?: boolean;
  className?: string;
}

/**
 * ItemStatus - Shows real-time open/closed status and wait times
 */
export default function ItemStatus({
  status = 'unknown',
  closingTime,
  waitMinutes,
  compact = false,
  className = '',
}: ItemStatusProps) {
  if (status === 'unknown' && !waitMinutes) {
    return null;
  }

  const statusConfig = {
    open: {
      icon: CheckCircle2,
      color: 'text-gray-600 dark:text-gray-300',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: 'Open',
    },
    closing_soon: {
      icon: AlertCircle,
      color: 'text-gray-600 dark:text-gray-300',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: closingTime ? `Closes ${closingTime}` : 'Closing soon',
    },
    closed: {
      icon: AlertCircle,
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: 'Closed',
    },
    unknown: {
      icon: Clock,
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: '',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {status !== 'unknown' && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${config.bg} ${config.color}`}>
            <Icon className="w-2.5 h-2.5" />
            {config.label}
          </span>
        )}
        {waitMinutes !== undefined && waitMinutes > 0 && (
          <span className="text-[9px] text-gray-400 dark:text-gray-500">
            ~{waitMinutes}min wait
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {status !== 'unknown' && (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg}`}>
          <Icon className={`w-3 h-3 ${config.color}`} />
          <span className={`text-[10px] font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      )}

      {waitMinutes !== undefined && waitMinutes > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>~{waitMinutes} min wait</span>
        </div>
      )}
    </div>
  );
}

/**
 * StatusDot - Minimal indicator for cards
 */
export function StatusDot({ status }: { status?: StatusType }) {
  if (!status || status === 'unknown') return null;

  const colors = {
    open: 'bg-gray-400',
    closing_soon: 'bg-gray-500',
    closed: 'bg-gray-600',
  };

  return (
    <span
      className={`w-1.5 h-1.5 rounded-full ${colors[status]}`}
      title={status === 'open' ? 'Open now' : status === 'closing_soon' ? 'Closing soon' : 'Closed'}
    />
  );
}
