'use client';

import { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';

interface SemanticSearchToggleProps {
  onToggle: (enabled: boolean) => void;
  isEnabled: boolean;
}

export function SemanticSearchToggle({ onToggle, isEnabled }: SemanticSearchToggleProps) {
  return (
    <button
      onClick={() => onToggle(!isEnabled)}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200
        ${isEnabled 
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
        }
        hover:shadow-sm
      `}
      title={isEnabled ? 'Using AI semantic search' : 'Using keyword search'}
    >
      {isEnabled ? (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Search</span>
        </>
      ) : (
        <>
          <Search className="h-3.5 w-3.5" />
          <span>Keyword</span>
        </>
      )}
    </button>
  );
}

interface SemanticSearchResult {
  id: number;
  name: string;
  city: string;
  category: string;
  description?: string;
  image?: string;
  similarity_score: number;
  slug?: string;
}

interface UseSemanticSearchResult {
  search: (query: string, filters?: { city?: string; category?: string }) => Promise<SemanticSearchResult[]>;
  results: SemanticSearchResult[];
  loading: boolean;
  error: string | null;
}

export function useSemanticSearch(): UseSemanticSearchResult {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (
    query: string, 
    filters?: { city?: string; category?: string }
  ): Promise<SemanticSearchResult[]> => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit: 20,
          filters: filters || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const searchResults = data.results || [];
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Semantic search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { search, results, loading, error };
}
