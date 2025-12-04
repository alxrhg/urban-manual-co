"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MapPin, Car, Building2 } from "lucide-react";

export type AddPanelTab = "places" | "transport" | "stay";

interface AddPanelTabsProps {
  activeTab: AddPanelTab;
  onTabChange: (tab: AddPanelTab) => void;
}

const TABS: { id: AddPanelTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "places",
    label: "Places",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: "transport",
    label: "Transport",
    icon: <Car className="w-4 h-4" />,
  },
  {
    id: "stay",
    label: "Stay",
    icon: <Building2 className="w-4 h-4" />,
  },
];

export function AddPanelTabs({ activeTab, onTabChange }: AddPanelTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2",
            "px-4 py-3 text-sm font-medium transition-colors",
            "border-b-2 -mb-px",
            activeTab === tab.id
              ? "text-gray-900 border-gray-900"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
