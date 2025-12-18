'use client';

/**
 * UnifiedSearch Component
 *
 * Single component that renders either guided search UI or chat interface.
 * Same brain, different presentation - switch modes seamlessly.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchSession } from '@/hooks/useSearchSession';
import { useAuth } from '@/contexts/AuthContext';
import type {
  PresentationMode,
  RankedDestination,
  Suggestion,
  FilterChip,
  GuidedPresentation,
  ChatPresentation,
  BehaviorSignal,
} from '@/types/search-session';

// ============================================
// TYPES
// ============================================

interface UnifiedSearchProps {
  /** Initial presentation mode */
  initialMode?: PresentationMode;
  /** Show mode toggle */
  showModeToggle?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Callback when destination clicked */
  onDestinationClick?: (destination: RankedDestination) => void;
  /** Callback when destination saved */
  onDestinationSave?: (destination: RankedDestination) => void;
  /** Custom class name */
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UnifiedSearch({
  initialMode = 'guided',
  showModeToggle = true,
  placeholder = 'Search destinations, plan trips...',
  onDestinationClick,
  onDestinationSave,
  className = '',
}: UnifiedSearchProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessionId,
    mode,
    isLoading,
    isStreaming,
    destinations,
    suggestions,
    narrative,
    context,
    turnCount,
    search,
    searchWithChip,
    switchMode,
    trackBehavior,
    isGuidedMode,
    isChatMode,
    currentOutput,
  } = useSearchSession({
    mode: initialMode,
    userId: user?.id,
    streaming: true,
  });

  // Scroll to bottom for chat mode
  useEffect(() => {
    if (isChatMode && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [narrative, destinations, isChatMode]);

  // Handle search submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      search(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, search]);

  // Handle chip click
  const handleChipClick = useCallback((chip: Suggestion | FilterChip) => {
    if ('query' in chip || 'action' in chip) {
      searchWithChip(chip as Suggestion);
    } else if ('value' in chip) {
      // Filter chip - construct query
      search(`${chip.type}: ${chip.value}`);
    }
  }, [search, searchWithChip]);

  // Handle destination click with behavior tracking
  const handleDestinationClick = useCallback((dest: RankedDestination) => {
    const turnId = currentOutput ? `turn-${turnCount}` : '';
    trackBehavior([{
      type: 'click',
      destinationSlug: dest.destination.slug,
      timestamp: new Date(),
      turnId,
    }]);
    onDestinationClick?.(dest);
  }, [trackBehavior, currentOutput, turnCount, onDestinationClick]);

  // Handle destination save with behavior tracking
  const handleDestinationSave = useCallback((dest: RankedDestination) => {
    const turnId = currentOutput ? `turn-${turnCount}` : '';
    trackBehavior([{
      type: 'save',
      destinationSlug: dest.destination.slug,
      timestamp: new Date(),
      turnId,
    }]);
    onDestinationSave?.(dest);
  }, [trackBehavior, currentOutput, turnCount, onDestinationSave]);

  return (
    <div className={`unified-search ${className}`}>
      {/* Mode Toggle */}
      {showModeToggle && (
        <ModeToggle
          mode={mode}
          onSwitch={switchMode}
        />
      )}

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="search-button"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <SearchIcon />
          )}
        </button>
      </form>

      {/* Content Area - Adapts to mode */}
      <div className={`content-area ${mode}-mode`}>
        {isGuidedMode ? (
          <GuidedContent
            destinations={destinations}
            suggestions={suggestions}
            presentation={currentOutput?.presentation as GuidedPresentation}
            isLoading={isLoading}
            onChipClick={handleChipClick}
            onDestinationClick={handleDestinationClick}
            onDestinationSave={handleDestinationSave}
          />
        ) : (
          <ChatContent
            destinations={destinations}
            suggestions={suggestions}
            narrative={narrative}
            presentation={currentOutput?.presentation as ChatPresentation}
            isLoading={isLoading}
            isStreaming={isStreaming}
            turnCount={turnCount}
            onChipClick={handleChipClick}
            onDestinationClick={handleDestinationClick}
            onDestinationSave={handleDestinationSave}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <SuggestionChips
          suggestions={suggestions}
          onChipClick={handleChipClick}
        />
      )}

      <style jsx>{`
        .unified-search {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .search-input-container {
          display: flex;
          gap: 0.5rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          padding: 0.5rem;
        }

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          outline: none;
        }

        .search-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 8px;
          background: var(--primary, #000);
          color: white;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content-area {
          min-height: 300px;
        }

        .content-area.guided-mode {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .content-area.chat-mode {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 60vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ModeToggle({
  mode,
  onSwitch,
}: {
  mode: PresentationMode;
  onSwitch: (mode: PresentationMode) => void;
}) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'guided' ? 'active' : ''}`}
        onClick={() => onSwitch('guided')}
      >
        <GridIcon />
        <span>Discover</span>
      </button>
      <button
        className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
        onClick={() => onSwitch('chat')}
      >
        <ChatIcon />
        <span>Chat</span>
      </button>

      <style jsx>{`
        .mode-toggle {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border, #e0e0e0);
          border-radius: 9999px;
          background: transparent;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: var(--primary, #000);
          color: white;
          border-color: var(--primary, #000);
        }

        .mode-btn:hover:not(.active) {
          background: var(--bg-secondary, #f5f5f5);
        }
      `}</style>
    </div>
  );
}

function GuidedContent({
  destinations,
  suggestions,
  presentation,
  isLoading,
  onChipClick,
  onDestinationClick,
  onDestinationSave,
}: {
  destinations: RankedDestination[];
  suggestions: Suggestion[];
  presentation?: GuidedPresentation;
  isLoading: boolean;
  onChipClick: (chip: Suggestion | FilterChip) => void;
  onDestinationClick: (dest: RankedDestination) => void;
  onDestinationSave: (dest: RankedDestination) => void;
}) {
  if (isLoading) {
    return <LoadingState mode="guided" />;
  }

  if (destinations.length === 0) {
    return <EmptyState mode="guided" />;
  }

  return (
    <>
      {/* Filter Chips */}
      {presentation?.filterChips && (
        <div className="filter-chips">
          {presentation.filterChips.slice(0, 8).map((chip) => (
            <button
              key={chip.id}
              className={`filter-chip ${chip.active ? 'active' : ''}`}
              onClick={() => onChipClick(chip)}
            >
              {chip.label}
              {chip.count && <span className="count">{chip.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {presentation?.stats && (
        <div className="stats">
          <span>{presentation.stats.total} places found</span>
        </div>
      )}

      {/* Destination Grid */}
      <div className="destination-grid">
        {destinations.map((dest) => (
          <DestinationCard
            key={dest.destination.slug}
            destination={dest}
            compact={true}
            onClick={() => onDestinationClick(dest)}
            onSave={() => onDestinationSave(dest)}
          />
        ))}
      </div>

      <style jsx>{`
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .filter-chip {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border, #e0e0e0);
          border-radius: 9999px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-chip:hover {
          border-color: var(--primary, #000);
        }

        .filter-chip.active {
          background: var(--primary, #000);
          color: white;
          border-color: var(--primary, #000);
        }

        .filter-chip .count {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .stats {
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
        }

        .destination-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }
      `}</style>
    </>
  );
}

function ChatContent({
  destinations,
  suggestions,
  narrative,
  presentation,
  isLoading,
  isStreaming,
  turnCount,
  onChipClick,
  onDestinationClick,
  onDestinationSave,
  messagesEndRef,
}: {
  destinations: RankedDestination[];
  suggestions: Suggestion[];
  narrative: string;
  presentation?: ChatPresentation;
  isLoading: boolean;
  isStreaming: boolean;
  turnCount: number;
  onChipClick: (chip: Suggestion) => void;
  onDestinationClick: (dest: RankedDestination) => void;
  onDestinationSave: (dest: RankedDestination) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (turnCount === 0 && !isLoading) {
    return <EmptyState mode="chat" />;
  }

  return (
    <div className="chat-container">
      {/* Narrative Response */}
      {(narrative || isStreaming) && (
        <div className="message assistant-message">
          <div className="message-content">
            {narrative}
            {isStreaming && <span className="cursor">|</span>}
          </div>
        </div>
      )}

      {/* Destination Cards (horizontal scroll in chat) */}
      {destinations.length > 0 && (
        <div className="destination-scroll">
          {destinations.map((dest) => (
            <DestinationCard
              key={dest.destination.slug}
              destination={dest}
              compact={false}
              showReasoning={!!dest.reasoning}
              onClick={() => onDestinationClick(dest)}
              onSave={() => onDestinationSave(dest)}
            />
          ))}
        </div>
      )}

      {/* Contextual Hints */}
      {presentation?.hints && presentation.hints.length > 0 && (
        <div className="hints">
          {presentation.hints.map((hint, i) => (
            <span key={i} className="hint">{hint}</span>
          ))}
        </div>
      )}

      {/* Seasonal Context */}
      {presentation?.seasonalContext && (
        <div className="seasonal-context">
          <span className="event">{presentation.seasonalContext.event}</span>
          <span className="description">{presentation.seasonalContext.description}</span>
          {presentation.seasonalContext.daysUntil && (
            <span className="days">in {presentation.seasonalContext.daysUntil} days</span>
          )}
        </div>
      )}

      {/* Proactive Actions */}
      {presentation?.proactiveActions && presentation.proactiveActions.length > 0 && (
        <div className="proactive-actions">
          {presentation.proactiveActions.map((action) => (
            <button key={action.id} className="action-btn">
              {action.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && <LoadingState mode="chat" />}

      <div ref={messagesEndRef} />

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message {
          max-width: 85%;
        }

        .assistant-message {
          align-self: flex-start;
        }

        .message-content {
          padding: 1rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          line-height: 1.5;
        }

        .cursor {
          animation: blink 1s infinite;
        }

        @keyframes blink {
          50% { opacity: 0; }
        }

        .destination-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding: 0.5rem 0;
          scroll-snap-type: x mandatory;
        }

        .destination-scroll > :global(*) {
          scroll-snap-align: start;
          flex-shrink: 0;
          width: 280px;
        }

        .hints {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .hint {
          font-size: 0.75rem;
          color: var(--text-secondary, #666);
          background: var(--bg-secondary, #f5f5f5);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .seasonal-context {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .seasonal-context .event {
          font-weight: 600;
        }

        .seasonal-context .days {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .proactive-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--primary, #000);
          border-radius: 8px;
          background: transparent;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--primary, #000);
          color: white;
        }
      `}</style>
    </div>
  );
}

function DestinationCard({
  destination,
  compact = false,
  showReasoning = false,
  onClick,
  onSave,
}: {
  destination: RankedDestination;
  compact?: boolean;
  showReasoning?: boolean;
  onClick: () => void;
  onSave: () => void;
}) {
  const { destination: dest, reasoning } = destination;

  return (
    <div
      className={`destination-card ${compact ? 'compact' : ''}`}
      onClick={onClick}
    >
      {dest.image && (
        <div className="image-container">
          <img src={dest.image} alt={dest.name} loading="lazy" />
        </div>
      )}
      <div className="card-content">
        <h3 className="name">{dest.name}</h3>
        <p className="meta">
          {dest.category} • {dest.city}
          {dest.michelin_stars && <> • {Array.from({ length: dest.michelin_stars }).map((_, i) => <img key={i} src="/michelin-star.svg" alt="Michelin" className="h-3 w-3 inline" />)}</>}
        </p>
        {!compact && dest.micro_description && (
          <p className="description">{dest.micro_description}</p>
        )}
        {showReasoning && reasoning && (
          <p className="reasoning">{reasoning.primaryReason}</p>
        )}
      </div>
      <button
        className="save-btn"
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
      >
        <HeartIcon />
      </button>

      <style jsx>{`
        .destination-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .destination-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .destination-card.compact {
          flex-direction: row;
          align-items: center;
        }

        .image-container {
          aspect-ratio: ${compact ? '1' : '16/10'};
          overflow: hidden;
        }

        .compact .image-container {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-content {
          padding: ${compact ? '0.5rem' : '1rem'};
          flex: 1;
        }

        .name {
          font-size: ${compact ? '0.875rem' : '1rem'};
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .meta {
          font-size: 0.75rem;
          color: var(--text-secondary, #666);
          margin: 0;
        }

        .description {
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
          margin: 0.5rem 0 0 0;
          line-height: 1.4;
        }

        .reasoning {
          font-size: 0.75rem;
          color: var(--primary, #000);
          margin: 0.5rem 0 0 0;
          font-style: italic;
        }

        .save-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .destination-card:hover .save-btn {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

function SuggestionChips({
  suggestions,
  onChipClick,
}: {
  suggestions: Suggestion[];
  onChipClick: (chip: Suggestion) => void;
}) {
  return (
    <div className="suggestion-chips">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          className="suggestion-chip"
          onClick={() => onChipClick(suggestion)}
        >
          {suggestion.label}
        </button>
      ))}

      <style jsx>{`
        .suggestion-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .suggestion-chip {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border, #e0e0e0);
          border-radius: 9999px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-chip:hover {
          background: var(--bg-secondary, #f5f5f5);
          border-color: var(--primary, #000);
        }
      `}</style>
    </div>
  );
}

function LoadingState({ mode }: { mode: PresentationMode }) {
  return (
    <div className="loading-state">
      <LoadingSpinner />
      <span>{mode === 'chat' ? 'Thinking...' : 'Searching...'}</span>

      <style jsx>{`
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
          color: var(--text-secondary, #666);
        }
      `}</style>
    </div>
  );
}

function EmptyState({ mode }: { mode: PresentationMode }) {
  return (
    <div className="empty-state">
      {mode === 'chat' ? (
        <>
          <ChatIcon />
          <h3>Start a conversation</h3>
          <p>Ask about restaurants, hotels, or plan your next trip</p>
        </>
      ) : (
        <>
          <SearchIcon />
          <h3>Discover places</h3>
          <p>Search for restaurants, hotels, bars, and more</p>
        </>
      )}

      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 3rem;
          text-align: center;
          color: var(--text-secondary, #666);
        }

        .empty-state h3 {
          margin: 0.5rem 0 0 0;
          color: var(--text-primary, #000);
        }

        .empty-state p {
          margin: 0;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="spinner">
      <style jsx>{`
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default UnifiedSearch;
