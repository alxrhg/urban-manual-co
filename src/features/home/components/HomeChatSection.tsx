"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { type ExtractedIntent } from "@/app/api/intent/schema";
import { type RefinementTag } from "@/components/RefinementChips";

// Lazy load components
const MarkdownRenderer = dynamic(
  () => import("@/src/components/MarkdownRenderer").then((mod) => ({ default: mod.MarkdownRenderer })),
  { ssr: false }
);

const FollowUpSuggestions = dynamic(
  () => import("@/components/FollowUpSuggestions").then((mod) => ({ default: mod.FollowUpSuggestions })),
  { ssr: false }
);

const IntentConfirmationChips = dynamic(
  () => import("@/components/IntentConfirmationChips").then((mod) => ({ default: mod.IntentConfirmationChips })),
  { ssr: false }
);

const RefinementChips = dynamic(
  () => import("@/components/RefinementChips").then((mod) => ({ default: mod.RefinementChips })),
  { ssr: false }
);

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

interface HomeChatSectionProps {
  submittedQuery: string;
  isSearching: boolean;
  isDiscoveryLoading: boolean;
  chatMessages: ChatMessage[];
  currentLoadingText: string;
  followUpSuggestions: FollowUpSuggestion[];
  searchIntent: ExtractedIntent | null;
  inferredTags: InferredTags | null;
  activeFilters: Set<string>;
  onFollowUpClick: (suggestion: string) => void;
  onChipClick: (tag: RefinementTag) => void;
  onChipRemove: (tag: RefinementTag) => void;
  onFollowUpSubmit: (query: string) => void;
}

export function HomeChatSection({
  submittedQuery,
  isSearching,
  isDiscoveryLoading,
  chatMessages,
  currentLoadingText,
  followUpSuggestions,
  searchIntent,
  inferredTags,
  activeFilters,
  onFollowUpClick,
  onChipClick,
  onChipRemove,
  onFollowUpSubmit,
}: HomeChatSectionProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [followUpInput, setFollowUpInput] = React.useState("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Convert inferred tags to refinement tags
  const convertInferredTagsToRefinementTags = (
    tags: InferredTags,
    activeFilters: Set<string>,
    activeOnly: boolean
  ): RefinementTag[] => {
    const result: RefinementTag[] = [];

    if (tags.neighborhoods) {
      tags.neighborhoods.forEach((neighborhood) => {
        const key = `neighborhood-${neighborhood}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({ type: "neighborhood", value: neighborhood, label: neighborhood });
        }
      });
    }

    if (tags.styleTags) {
      tags.styleTags.forEach((style) => {
        const key = `style-${style}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({ type: "style", value: style, label: style });
        }
      });
    }

    if (tags.priceLevel) {
      const key = `price-${tags.priceLevel}`;
      const isActive = activeFilters.has(key);
      if (activeOnly ? isActive : !isActive) {
        result.push({ type: "price", value: tags.priceLevel, label: tags.priceLevel });
      }
    }

    if (tags.modifiers) {
      tags.modifiers.forEach((modifier) => {
        const key = `modifier-${modifier}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({ type: "modifier", value: modifier, label: modifier });
        }
      });
    }

    return result;
  };

  if (!submittedQuery) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Scrollable chat history */}
      <div
        ref={chatContainerRef}
        className="max-h-[400px] overflow-y-auto space-y-6 mb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {chatMessages.length > 0
          ? chatMessages.map((message, index) => (
              <div key={index} className="space-y-2">
                {message.type === "user" ? (
                  <div className="text-left text-xs uppercase tracking-[2px] font-medium text-black dark:text-white">
                    {message.content}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <MarkdownRenderer
                      content={message.content}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                    />
                    {message.contextPrompt && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed text-left italic">
                        {message.contextPrompt}
                      </div>
                    )}
                    {/* View Trip button */}
                    {message.tripId && (
                      <div className="pt-2">
                        <Link
                          href={`/trips/${message.tripId}`}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[2px] font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
                        >
                          <Map className="w-4 h-4" />
                          View Trip
                        </Link>
                      </div>
                    )}
                    {/* Follow-up suggestions */}
                    {index === chatMessages.length - 1 &&
                      followUpSuggestions.length > 0 &&
                      !message.tripId && (
                        <FollowUpSuggestions
                          suggestions={followUpSuggestions}
                          onSuggestionClick={onFollowUpClick}
                          isLoading={isSearching}
                        />
                      )}
                  </div>
                )}
              </div>
            ))
          : null}

        {/* Loading State */}
        {(isSearching || (submittedQuery && chatMessages.length === 0)) && (
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
            <div className="flex items-center gap-2">
              {isDiscoveryLoading && (
                <div className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1.4s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1.4s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1.4s" }}>.</span>
                </div>
              )}
              <span>{currentLoadingText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up input */}
      {!isSearching && chatMessages.length > 0 && (
        <div className="relative">
          <input
            placeholder="Refine your search or ask a follow-up..."
            value={followUpInput}
            onChange={(e) => setFollowUpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && followUpInput.trim()) {
                e.preventDefault();
                onFollowUpSubmit(followUpInput.trim());
                setFollowUpInput("");
              }
            }}
            className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
          />
        </div>
      )}

      {/* Intent Confirmation Chips */}
      {searchIntent && !isSearching && (
        <div className="mt-4">
          <IntentConfirmationChips intent={searchIntent} editable={false} />
        </div>
      )}

      {/* Active Filters */}
      {inferredTags && !isSearching && (() => {
        const activeTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, true);
        if (activeTags.length === 0) return null;
        return (
          <div className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filtered by:</div>
            <RefinementChips
              tags={activeTags}
              onChipClick={onChipClick}
              onChipRemove={onChipRemove}
              activeTags={activeFilters}
            />
          </div>
        );
      })()}

      {/* Refinement Chips - Suggestions */}
      {inferredTags && !isSearching && (() => {
        const suggestionTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, false);
        if (suggestionTags.length === 0) return null;
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</div>
            <RefinementChips
              tags={suggestionTags}
              onChipClick={onChipClick}
              activeTags={activeFilters}
            />
          </div>
        );
      })()}
    </div>
  );
}

export default HomeChatSection;
