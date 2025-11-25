"use client";

import { useMemo } from "react";
import { Bookmark, MessageSquare, ListChecks } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useDrawer } from "@/contexts/DrawerContext";

const DOCK_ITEMS = [
  {
    id: "trips",
    label: "Trips",
    icon: <ListChecks className="h-5 w-5" />,
    action: "route" as const,
    href: "/trips",
  },
  {
    id: "saved",
    label: "Saved",
    icon: <Bookmark className="h-5 w-5" />,
    action: "drawer" as const,
    drawer: "saved-places" as const,
  },
  {
    id: "chat",
    label: "Chat",
    icon: <MessageSquare className="h-5 w-5" />,
    action: "drawer" as const,
    drawer: "chat" as const,
  },
];

export function TripDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { openDrawer, isDrawerOpen } = useDrawer();

  const activeRouteId = useMemo(() => {
    if (pathname?.startsWith("/trips")) return "trips";
    if (pathname?.startsWith("/saved")) return "saved";
    return null;
  }, [pathname]);

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className="flex items-center gap-2 rounded-full border border-gray-200/60 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-2xl px-3 py-2 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.9)]">
        {DOCK_ITEMS.map(item => {
          const isActive =
            activeRouteId === item.id ||
            (item.action === "drawer" && isDrawerOpen(item.drawer));
          return (
            <button
              key={item.id}
              data-testid={`trip-dock-${item.id}`}
              onClick={() => {
                if (item.action === "route" && item.href) {
                  router.push(item.href);
                  return;
                }
                if (item.action === "drawer" && item.drawer) {
                  openDrawer(item.drawer);
                }
              }}
              className={`flex flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[1.5px] transition-colors ${
                isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
              aria-label={item.label}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white/20"
                    : "border-gray-200 text-gray-700 dark:border-white/20"
                }`}
              >
                {item.icon}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

