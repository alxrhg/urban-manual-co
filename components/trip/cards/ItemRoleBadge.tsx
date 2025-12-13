'use client';

import { Lock, Calendar, Sparkles, ListTodo } from 'lucide-react';
import type { ItemRole } from '@/types/trip';
import { inferItemRole, type ItineraryItemNotes, type ItineraryItemType, type CardType } from '@/types/trip';

/**
 * Role-based styling configuration
 */
export const ROLE_STYLES: Record<ItemRole, {
  bg: string;
  text: string;
  border: string;
  indicator: string;
  label: string;
  description: string;
}> = {
  fixed: {
    bg: 'bg-gray-900 dark:bg-white',
    text: 'text-white dark:text-gray-900',
    border: 'border-gray-900 dark:border-white',
    indicator: 'bg-gray-900 dark:bg-white',
    label: 'Fixed',
    description: 'Cannot be moved',
  },
  planned: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    indicator: 'bg-blue-500',
    label: 'Planned',
    description: 'Has reservation',
  },
  flexible: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    indicator: 'bg-emerald-500',
    label: 'Flexible',
    description: 'Can be moved',
  },
  candidate: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    indicator: 'bg-amber-500',
    label: 'Candidate',
    description: 'Not scheduled',
  },
};

/**
 * Get the appropriate icon for a role
 */
function RoleIcon({ role, className }: { role: ItemRole; className?: string }) {
  const iconClass = className || 'w-3 h-3';

  switch (role) {
    case 'fixed':
      return <Lock className={iconClass} />;
    case 'planned':
      return <Calendar className={iconClass} />;
    case 'flexible':
      return <Sparkles className={iconClass} />;
    case 'candidate':
      return <ListTodo className={iconClass} />;
  }
}

interface ItemRoleBadgeProps {
  role?: ItemRole;
  itemType?: ItineraryItemType | CardType;
  notes?: ItineraryItemNotes | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

/**
 * ItemRoleBadge - Visual indicator for item role
 *
 * Displays a badge with the item's role (fixed, planned, flexible, candidate).
 * Role is either explicitly provided or inferred from item type and notes.
 */
export function ItemRoleBadge({
  role,
  itemType,
  notes,
  size = 'sm',
  showLabel = true,
  showIcon = true,
  className = '',
}: ItemRoleBadgeProps) {
  // Use explicit role from notes, or infer from type
  const effectiveRole = role ?? notes?.role ?? inferItemRole(itemType, notes);
  const styles = ROLE_STYLES[effectiveRole];

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${styles.bg} ${styles.text}
        ${sizeClasses}
        ${className}
      `}
      title={styles.description}
    >
      {showIcon && <RoleIcon role={effectiveRole} className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {showLabel && <span>{styles.label}</span>}
    </span>
  );
}

/**
 * RoleIndicatorDot - Minimal dot indicator for item role
 *
 * A small colored dot that indicates the role without taking much space.
 * Useful for compact views or timeline indicators.
 */
export function RoleIndicatorDot({
  role,
  itemType,
  notes,
  size = 'sm',
  className = '',
}: Omit<ItemRoleBadgeProps, 'showLabel' | 'showIcon'>) {
  const effectiveRole = role ?? notes?.role ?? inferItemRole(itemType, notes);
  const styles = ROLE_STYLES[effectiveRole];

  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={`
        inline-block rounded-full
        ${styles.indicator}
        ${sizeClasses}
        ${className}
      `}
      title={`${styles.label}: ${styles.description}`}
      aria-label={styles.label}
    />
  );
}

/**
 * Get role-based border styling for cards
 */
export function getRoleBorderClass(
  role?: ItemRole,
  itemType?: ItineraryItemType | CardType,
  notes?: ItineraryItemNotes | null
): string {
  const effectiveRole = role ?? notes?.role ?? inferItemRole(itemType, notes);

  switch (effectiveRole) {
    case 'fixed':
      return 'border-l-4 border-l-gray-900 dark:border-l-white';
    case 'planned':
      return 'border-l-4 border-l-blue-500';
    case 'flexible':
      return 'border-l-4 border-l-emerald-500';
    case 'candidate':
      return 'border-l-4 border-l-amber-500';
    default:
      return '';
  }
}

/**
 * Get role-based background styling for cards
 */
export function getRoleBackgroundClass(
  role?: ItemRole,
  itemType?: ItineraryItemType | CardType,
  notes?: ItineraryItemNotes | null,
  variant: 'subtle' | 'solid' = 'subtle'
): string {
  const effectiveRole = role ?? notes?.role ?? inferItemRole(itemType, notes);
  const styles = ROLE_STYLES[effectiveRole];

  return variant === 'subtle' ? styles.bg : styles.indicator;
}

export default ItemRoleBadge;
