'use client';

import { ReactNode } from 'react';

export type ConciergeMessageType =
  | 'context'      // Context awareness (above results)
  | 'help'         // Soft suggestions (after results)
  | 'clarify'      // Gentle clarification (ambiguous query)
  | 'note'         // Useful warnings/notes
  | 'empty';       // Empty state with help

interface ConciergeMessageProps {
  type: ConciergeMessageType;
  children: ReactNode;
  className?: string;
}

/**
 * ConciergeMessage - Short, useful, professional messaging
 *
 * Philosophy:
 * - Concierge, not chatbot
 * - Speaks when useful, silent when not
 * - Professional warmth, not bubbly personality
 * - Results first, help second
 */
export function ConciergeMessage({ type, children, className = '' }: ConciergeMessageProps) {
  const baseClasses = {
    context: 'text-sm text-gray-500 dark:text-gray-400 mb-4',
    help: 'text-[13px] text-gray-400 dark:text-gray-500 mt-5',
    clarify: 'text-sm text-gray-600 dark:text-gray-300',
    note: 'text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-lg my-4',
    empty: 'text-sm text-gray-500 dark:text-gray-400',
  };

  return (
    <div className={`${baseClasses[type]} ${className}`}>
      {children}
    </div>
  );
}

interface ConciergeTripContextProps {
  city: string;
  daysUntil: number;
}

/**
 * Context note showing upcoming trip awareness
 * Example: "You're heading to Miami in 9 days."
 */
export function ConciergeTripContext({ city, daysUntil }: ConciergeTripContextProps) {
  if (daysUntil < 0) return null;

  const timeText = daysUntil === 0
    ? 'today'
    : daysUntil === 1
      ? 'tomorrow'
      : `in ${daysUntil} days`;

  return (
    <ConciergeMessage type="context">
      You're heading to {city} {timeText}.
    </ConciergeMessage>
  );
}

interface ConciergeClarifyProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
}

/**
 * Clarification for ambiguous queries
 * Example: "Special how? celebration · romantic · solo treat"
 */
export function ConciergeClarify({ question, options, onSelect }: ConciergeClarifyProps) {
  return (
    <ConciergeMessage type="clarify">
      <p className="mb-2">{question}</p>
      <div className="flex flex-wrap gap-x-1 gap-y-1">
        {options.map((opt, i) => (
          <span key={opt}>
            {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>}
            <button
              onClick={() => onSelect(opt)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded transition-colors"
            >
              {opt}
            </button>
          </span>
        ))}
      </div>
    </ConciergeMessage>
  );
}

interface ConciergeSuggestionsProps {
  prefix?: string;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

/**
 * Soft suggestions after results
 * Example: "Narrow it down? quiet · omakase · open late"
 */
export function ConciergeSuggestions({ prefix = 'Narrow it down?', suggestions, onSelect }: ConciergeSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <ConciergeMessage type="help">
      <span className="text-gray-400 dark:text-gray-500">{prefix} </span>
      {suggestions.map((suggestion, i) => (
        <span key={suggestion}>
          {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>}
          <button
            onClick={() => onSelect(suggestion)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded transition-colors"
          >
            {suggestion}
          </button>
        </span>
      ))}
    </ConciergeMessage>
  );
}

interface ConciergeNoteProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Useful warning/note
 * Example: "Most are closed Mondays — your trip includes one."
 */
export function ConciergeNote({ message, action }: ConciergeNoteProps) {
  return (
    <ConciergeMessage type="note">
      <span>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="ml-2 text-gray-700 dark:text-gray-200 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {action.label}
        </button>
      )}
    </ConciergeMessage>
  );
}

interface ConciergeEmptyProps {
  city: string;
  nearbyCity?: string;
  nearbyCount?: number;
  nearbyDistance?: string;
  onNearbyClick?: () => void;
}

/**
 * Empty state with helpful alternatives
 * Example: "Nothing in Austin yet. Want Houston instead? 24 places, 2.5h away."
 */
export function ConciergeEmpty({ city, nearbyCity, nearbyCount, nearbyDistance, onNearbyClick }: ConciergeEmptyProps) {
  return (
    <ConciergeMessage type="empty">
      <p className="mb-2">Nothing in {city} yet.</p>
      {nearbyCity && nearbyCount && (
        <p>
          Want{' '}
          <button
            onClick={onNearbyClick}
            className="text-gray-700 dark:text-gray-200 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white"
          >
            {nearbyCity}
          </button>
          {' '}instead? {nearbyCount} places{nearbyDistance && `, ${nearbyDistance} away`}.
        </p>
      )}
    </ConciergeMessage>
  );
}

interface ConciergePreferenceProps {
  preference: string;
  reason: string;
}

/**
 * Personalization transparency
 * Example: "Showing outdoor seating first — you usually prefer that."
 */
export function ConciergePreference({ preference, reason }: ConciergePreferenceProps) {
  return (
    <ConciergeMessage type="context">
      {preference} — {reason}
    </ConciergeMessage>
  );
}
