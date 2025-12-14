'use client';

import { useState, useCallback, useRef } from 'react';

export interface ItineraryParams {
  destination: string;
  dates: {
    start: string;
    end: string;
  };
  preferences?: string[];
  travelStyle?: 'relaxed' | 'moderate' | 'packed';
  budget?: 'budget' | 'moderate' | 'luxury';
  tripId?: string;
}

export interface ItineraryData {
  destination: string;
  dates: {
    start: string;
    end: string;
  };
  tripDays: number;
  preferences: string[];
  travelStyle: string;
  budget: string;
  content: string;
}

interface SSEMessage {
  type: 'status' | 'chunk' | 'complete' | 'error';
  content?: string;
  status?: string;
  message?: string;
  error?: string;
  details?: string;
  itinerary?: ItineraryData;
  tripId?: string | null;
  model?: string;
  limit?: number;
  remaining?: number;
  reset?: number;
}

export interface UseStreamingItineraryReturn {
  /** The accumulated itinerary content as it streams in */
  content: string;
  /** Whether the itinerary is currently being generated */
  isStreaming: boolean;
  /** Current status message during generation */
  status: string | null;
  /** Error message if generation failed */
  error: string | null;
  /** The complete itinerary data after generation completes */
  itinerary: ItineraryData | null;
  /** Function to start generating an itinerary */
  generateItinerary: (params: ItineraryParams) => Promise<void>;
  /** Function to abort the current generation */
  abort: () => void;
  /** Reset the state to initial values */
  reset: () => void;
}

/**
 * Hook for streaming AI-powered itinerary generation
 *
 * @example
 * ```tsx
 * const { content, isStreaming, generateItinerary, error } = useStreamingItinerary();
 *
 * const handleGenerate = async () => {
 *   await generateItinerary({
 *     destination: 'Tokyo',
 *     dates: { start: '2024-03-01', end: '2024-03-07' },
 *     preferences: ['food', 'architecture'],
 *     travelStyle: 'moderate',
 *     budget: 'moderate',
 *   });
 * };
 *
 * return (
 *   <div>
 *     <button onClick={handleGenerate} disabled={isStreaming}>
 *       {isStreaming ? 'Generating...' : 'Generate Itinerary'}
 *     </button>
 *     {content && <div className="whitespace-pre-wrap">{content}</div>}
 *     {error && <div className="text-red-500">{error}</div>}
 *   </div>
 * );
 * ```
 */
export function useStreamingItinerary(): UseStreamingItineraryReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setContent('');
    setIsStreaming(false);
    setStatus(null);
    setError(null);
    setItinerary(null);
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStatus(null);
    }
  }, []);

  const generateItinerary = useCallback(async (params: ItineraryParams) => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setContent('');
    setError(null);
    setItinerary(null);
    setIsStreaming(true);
    setStatus('Initializing...');

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: SSEMessage = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'status':
                  setStatus(data.message || data.status || 'Processing...');
                  break;

                case 'chunk':
                  if (data.content) {
                    setContent((prev: string) => prev + data.content);
                    setStatus(null); // Clear status once content starts flowing
                  }
                  break;

                case 'complete':
                  if (data.itinerary) {
                    setItinerary(data.itinerary);
                  }
                  setIsStreaming(false);
                  setStatus(null);
                  break;

                case 'error':
                  setError(data.error || 'An error occurred');
                  setIsStreaming(false);
                  setStatus(null);
                  break;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE message:', line, parseError);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, don't set error
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to generate itinerary';
      console.error('Itinerary generation error:', err);
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    content,
    isStreaming,
    status,
    error,
    itinerary,
    generateItinerary,
    abort,
    reset,
  };
}
