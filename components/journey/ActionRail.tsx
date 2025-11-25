"use client";

import Image from "next/image";
import {
  Bookmark,
  ListPlus,
  Share2,
  MessageSquare,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import type { Destination } from "@/types/destination";
import type { ShortlistItem } from "@/hooks/useJourneyShortlist";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <Card className="border-border/70 bg-white/90 dark:bg-white/5 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
            Action hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDestination ? (
            <SelectionCard
              destination={selectedDestination}
              isShortlisted={isShortlisted(selectedDestination.slug)}
              onToggleShortlist={() => onToggleShortlist(selectedDestination)}
              onAddToTrip={() => onAddToTrip(selectedDestination)}
              onOpenDetail={() => onOpenDetailPage(selectedDestination)}
              onShare={() => onShare(selectedDestination)}
              onOpenChat={() => onOpenChat(selectedDestination)}
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tap a destination card to preview details here.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/90 dark:bg-white/5 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
            Shortlist
          </CardTitle>
          {shortlist.length > 0 && (
            <span className="text-[11px] uppercase tracking-[2px] text-muted-foreground">
              {shortlist.length}/20
            </span>
          )}
        </CardHeader>
        <CardContent>
          {shortlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save a few spots to compare vibes and build trips faster.
            </p>
          ) : (
            <div className="space-y-3">
              {shortlist.slice(0, 4).map(item => (
                <button
                  key={item.slug}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-border/70 px-3 py-2 text-left transition-colors hover:border-foreground/30"
                  onClick={() => onSelectFromShortlist(item.slug)}
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Bookmark className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.category, item.city].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={event => {
                      event.stopPropagation();
                      onRemoveShortlist(item.slug);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${item.name} from shortlist`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </button>
              ))}
              {shortlist.length > 4 && (
                <p className="text-center text-[11px] uppercase tracking-[2px] text-muted-foreground">
                  +{shortlist.length - 4} more saved
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-muted">
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs uppercase tracking-[2px]">
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          {destination.micro_description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <JourneyActionButton
          icon={<Bookmark className="h-4 w-4" />}
          label={isShortlisted ? "Shortlisted" : "Shortlist"}
          onClick={onToggleShortlist}
          active={isShortlisted}
        />
        <JourneyActionButton
          icon={<ListPlus className="h-4 w-4" />}
          label="Add to trip"
          onClick={onAddToTrip}
        />
        <JourneyActionButton
          icon={<Share2 className="h-4 w-4" />}
          label="Share"
          onClick={onShare}
        />
        <JourneyActionButton
          icon={<MessageSquare className="h-4 w-4" />}
          label="Ask AI"
          onClick={onOpenChat}
        />
        <JourneyActionButton
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Full details"
          onClick={onOpenDetail}
          variant="ghost"
        />
      </div>
    </div>
  );
}

function JourneyActionButton({
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
  return (
    <Button
      type="button"
      variant={variant === "ghost" ? "ghost" : "muted"}
      className={cn(
        "w-full rounded-2xl text-xs font-semibold uppercase tracking-[1.5px] py-3",
        active && variant !== "ghost"
          ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white/15"
          : variant !== "ghost"
          ? "border border-border/70"
          : "justify-start text-muted-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

