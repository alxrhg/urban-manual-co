"use client";

import { useState, useCallback, useRef } from "react";
import { Destination } from "@/types/destination";
import { useAuth } from "@/contexts/AuthContext";
import { useSequenceTracker } from "@/hooks/useSequenceTracker";
import { type ExtractedIntent } from "@/app/api/intent/schema";
import { trackSearch } from "@/lib/tracking";
import { getContextAwareLoadingMessage } from "@/src/lib/context/loading-message";

export interface ChatMessage {
  type: "user" | "assistant";
  content: string;
  contextPrompt?: string;
  tripId?: string;
  tripTitle?: string;
}

export interface FollowUpSuggestion {
  text: string;
  icon?: "location" | "time" | "price" | "rating" | "default";
  type?: "refine" | "expand" | "related";
}

export interface InferredTags {
  neighborhoods?: string[];
  styleTags?: string[];
  priceLevel?: string;
  modifiers?: string[];
}

interface UseHomeSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  submittedQuery: string;
  isSearching: boolean;
  searchTier: string | null;
  chatResponse: string;
  chatMessages: ChatMessage[];
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    destinations?: Destination[];
  }>;
  searchIntent: ExtractedIntent | null;
  seasonalContext: Record<string, unknown> | null;
  followUpSuggestions: FollowUpSuggestion[];
  inferredTags: InferredTags | null;
  activeFilters: Set<string>;
  currentLoadingText: string;
  performSearch: (query: string) => Promise<Destination[]>;
  clearSearch: () => void;
  handleFollowUp: (query: string) => void;
  setActiveFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const loadingTextVariants = [
  "Finding the perfect spots...",
  "Searching for amazing places...",
  "Discovering hidden gems...",
  "Curating the best destinations...",
];

export function useHomeSearch(): UseHomeSearchReturn {
  const { user } = useAuth();
  const { trackAction } = useSequenceTracker();

  const [searchTerm, setSearchTerm] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchTier, setSearchTier] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string; destinations?: Destination[] }>
  >([]);
  const [searchIntent, setSearchIntent] = useState<ExtractedIntent | null>(null);
  const [seasonalContext, setSeasonalContext] = useState<Record<string, unknown> | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [inferredTags, setInferredTags] = useState<InferredTags | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [currentLoadingText, setCurrentLoadingText] = useState(loadingTextVariants[0]);

  const lastSearchedQueryRef = useRef<string>("");

  const performSearch = useCallback(
    async (query: string): Promise<Destination[]> => {
      const trimmedQuery = query.trim();

      // Prevent duplicate searches
      if (trimmedQuery === lastSearchedQueryRef.current && isSearching) {
        return [];
      }

      if (!trimmedQuery || isSearching) {
        return [];
      }

      // Track search
      if (trimmedQuery) {
        trackAction({ type: "search", query: trimmedQuery });
        trackSearch({ query: trimmedQuery });
      }

      lastSearchedQueryRef.current = trimmedQuery;
      setSubmittedQuery(trimmedQuery);
      setFollowUpSuggestions([]);
      setCurrentLoadingText(loadingTextVariants[0]);
      setIsSearching(true);
      setSearchTier("ai-enhanced");
      setSearchIntent(null);

      try {
        const historyForAPI = conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmedQuery,
            userId: user?.id,
            conversationHistory: historyForAPI,
          }),
        });

        if (!response.ok) {
          throw new Error("AI chat failed");
        }

        const data = await response.json();

        setSearchTier(data.searchTier || "ai-chat");

        // Update conversation history
        const userMessage = { role: "user" as const, content: query };
        const assistantMessage = {
          role: "assistant" as const,
          content: data.content || "",
          destinations: data.destinations,
        };

        const newHistory = [...conversationHistory, userMessage, assistantMessage];
        setConversationHistory(newHistory.slice(-10));

        // Store intent data
        if (data.intent) {
          setSearchIntent(data.intent);

          if (data.inferredTags) {
            setInferredTags(data.inferredTags);
          } else {
            setInferredTags(null);
          }

          // Fetch seasonal context if city detected
          if (data.intent.city) {
            try {
              const seasonResponse = await fetch(
                `/api/seasonality?city=${encodeURIComponent(data.intent.city)}`
              );
              if (seasonResponse.ok) {
                const seasonData = await seasonResponse.json();
                setSeasonalContext(seasonData);
              }
            } catch {
              // Seasonal context is optional
            }
          } else {
            setSeasonalContext(null);
          }

          const contextAwareText = getContextAwareLoadingMessage(query, data.intent);
          setCurrentLoadingText(contextAwareText);
        } else {
          const contextAwareText = getContextAwareLoadingMessage(query, null);
          setCurrentLoadingText(contextAwareText);
        }

        setChatResponse(data.content || "");

        // Store follow-up suggestions
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setFollowUpSuggestions(data.suggestions);
        } else {
          setFollowUpSuggestions([]);
        }

        const destinations = data.destinations || [];

        // Add messages to visual chat history
        const contextPrompt = getContextAwareLoadingMessage(query);
        setChatMessages((prev) => [
          ...prev,
          { type: "user", content: query },
          {
            type: "assistant",
            content: data.content || "",
            contextPrompt: destinations.length > 0 ? contextPrompt : undefined,
          },
        ]);

        return destinations;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("AI chat error:", error);
        }

        setChatResponse("Sorry, I encountered an error. Please try again.");
        setSearchIntent(null);
        setSeasonalContext(null);
        setFollowUpSuggestions([]);
        lastSearchedQueryRef.current = "";

        setChatMessages((prev) => [
          ...prev,
          { type: "user", content: query },
          { type: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);

        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [user?.id, isSearching, conversationHistory, trackAction]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSubmittedQuery("");
    setChatResponse("");
    setConversationHistory([]);
    setChatMessages([]);
    setSearchIntent(null);
    setSeasonalContext(null);
    setFollowUpSuggestions([]);
    setInferredTags(null);
    setActiveFilters(new Set());
    setSearchTier(null);
    lastSearchedQueryRef.current = "";
  }, []);

  const handleFollowUp = useCallback(
    (query: string) => {
      setSearchTerm(query);
      performSearch(query);
    },
    [performSearch]
  );

  return {
    searchTerm,
    setSearchTerm,
    submittedQuery,
    isSearching,
    searchTier,
    chatResponse,
    chatMessages,
    conversationHistory,
    searchIntent,
    seasonalContext,
    followUpSuggestions,
    inferredTags,
    activeFilters,
    currentLoadingText,
    performSearch,
    clearSearch,
    handleFollowUp,
    setActiveFilters,
    setChatMessages,
  };
}
