"use client";

import Image from "next/image";
import { Bookmark, ListPlus, Share2, MessageSquare, ArrowUpRight, Trash2 } from "lucide-react";
import type { Destination } from "@/types/destination";
import type { ShortlistItem } from "@/hooks/useJourneyShortlist";

interface JourneyActionRailProps {
  selectedDestination: Destination | null;
  shortlist: ShortlistItem[];
  isShortlisted: (slug: string | null | undefined) => boolean;
  onToggleShortlist: (destination: Destination) => void;
  onAddToTrip: (destination: Destination) => void;
  onOpenDetailPage: (destination: Destination) => void;
  onShare: (destination: Destination) => void;
  onOpenChat: (destination: Destination) => void;
  onRemoveShortlist: (slug: string) => void;
  onSelectFromShortlist: (slug: string) => void;
}

export function JourneyActionRail({
  selectedDestination,
  shortlist,
  isShortlisted,
  onToggleShortlist,
  onAddToTrip,
  onOpenDetailPage,
  onShare,
  onOpenChat,
  onRemoveShortlist,
  onSelectFromShortlist,
}: JourneyActionRailProps) {
  return (
    <div className="sticky top-32 space-y-6">
      <div className="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-lg p-4 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.9)]">
        <div className="mb-4 text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium">
          Action hub
        </div>
        {selectedDestination ? (
          <div className="space-y-4">
            <SelectionCard
              destination={selectedDestination}
              isShortlisted={isShortlisted(selectedDestination.slug)}
              onToggleShortlist={() => onToggleShortlist(selectedDestination)}
              onAddToTrip={() => onAddToTrip(selectedDestination)}
              onOpenDetail={() => onOpenDetailPage(selectedDestination)}
              onShare={() => onShare(selectedDestination)}
              onOpenChat={() => onOpenChat(selectedDestination)}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Tap a card to preview details here without leaving the feed.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.9)]">
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium">
          Shortlist
          {shortlist.length > 0 && (
            <span className="text-[11px] text-gray-400">{shortlist.length}/20</span>
          )}
        </div>
        {shortlist.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Save a few spots to compare vibes and build trips faster.
          </p>
        ) : (
          <div className="space-y-3">
            {shortlist.slice(0, 4).map(item => (
              <button
                key={item.slug}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-white/10 px-3 py-2 text-left hover:border-gray-900/70 dark:hover:border-white/40 transition-colors"
                onClick={() => onSelectFromShortlist(item.slug)}
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-white/10">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      <Bookmark className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {[item.category, item.city].filter(Boolean).join(" • ")}
                  </p>
                </div>
                <button
                  onClick={event => {
                    event.stopPropagation();
                    onRemoveShortlist(item.slug);
                  }}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
            ))}
            {shortlist.length > 4 && (
              <p className="text-[11px] uppercase tracking-[2px] text-gray-400 text-center">
                +{shortlist.length - 4} more saved
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionCard({
  destination,
  isShortlisted,
  onToggleShortlist,
  onAddToTrip,
  onOpenDetail,
  onShare,
  onOpenChat,
}: {
  destination: Destination;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
  onAddToTrip: () => void;
  onOpenDetail: () => void;
  onShare: () => void;
  onOpenChat: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-white/10">
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs uppercase tracking-[2px]">
            {destination.city}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-white">
          <p className="text-xs uppercase tracking-[2px] text-white/70">
            {destination.category}
          </p>
          <p className="text-lg font-medium">{destination.name}</p>
          <p className="text-xs text-white/80">{destination.city}</p>
        </div>
      </div>

      {destination.micro_description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {destination.micro_description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={<Bookmark className="h-4 w-4" />}
          label={isShortlisted ? "Shortlisted" : "Shortlist"}
          onClick={onToggleShortlist}
          active={isShortlisted}
        />
        <ActionButton
          icon={<ListPlus className="h-4 w-4" />}
          label="Add to trip"
          onClick={onAddToTrip}
        />
        <ActionButton
          icon={<Share2 className="h-4 w-4" />}
          label="Share"
          onClick={onShare}
        />
        <ActionButton
          icon={<MessageSquare className="h-4 w-4" />}
          label="Ask AI"
          onClick={onOpenChat}
        />
        <ActionButton
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Full details"
          onClick={onOpenDetail}
          variant="ghost"
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
  variant = "solid",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "solid" | "ghost";
}) {
  const baseClasses =
    "flex items-center justify-center gap-2 rounded-2xl border text-xs font-semibold uppercase tracking-[1.5px] py-3 transition-colors";

  let className = `${baseClasses} ${
    active
      ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white/20 dark:text-white"
      : "border-gray-200 text-gray-800 hover:border-gray-900 dark:border-white/10 dark:text-white dark:hover:border-white/40"
  }`;

  if (variant === "ghost") {
    className = `${baseClasses} border-transparent text-gray-500 hover:border-gray-900/40 dark:text-gray-300 dark:hover:border-white/30`;
  }

  return (
    <button onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  );
}

