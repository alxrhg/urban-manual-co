"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Map, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatDrawer } from "@/features/chat/components/ChatDrawer";
import { LoginDrawer } from "@/features/account/components/LoginDrawer";
import { LoginModal } from "@/components/LoginModal";
import { CommandPalette } from "@/components/CommandPalette";
import { AccountDropdown } from "@/components/AccountDropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/tooltip";
import { Button } from "@/ui/button";
import { ChristmasTree } from "@/components/ChristmasTree";

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const [buildVersion, setBuildVersion] = useState<string | null>(null);

  // Determine admin role from user metadata (sync, no useEffect needed)
  const isAdmin = useMemo(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    return role === "admin";
  }, [user]);

  // Fetch build version for admins
  useEffect(() => {
    if (!user?.id || !isAdmin) {
      setBuildVersion(null);
      return;
    }

    const fetchBuildVersion = async () => {
      try {
        const versionRes = await fetch("/api/build-version");
        if (!versionRes.ok) {
          setBuildVersion(null);
          return;
        }
        const versionData = await versionRes.json();
        setBuildVersion(
          versionData.buildNumber ||
            versionData.shortSha ||
            versionData.commitSha?.substring(0, 7) ||
            versionData.version ||
            null
        );
      } catch {
        setBuildVersion(null);
      }
    };

    fetchBuildVersion();
  }, [user, isAdmin]);

  const navigate = (path: string) => {
    router.push(path);
  };

  const actionButtons = (
    <>
      {isAdmin && buildVersion && (
        <span
          className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
          title="Build version"
          aria-label={`Build version ${buildVersion}`}
        >
          {buildVersion}
        </span>
      )}

      {/* Admin button for admins, Trips button for others */}
      {isAdmin ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              aria-label="Admin dashboard"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Admin dashboard</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trips')}
              aria-label="View trips"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Trips</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{user ? 'View your trips' : 'Plan a trip'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      <AccountDropdown />
    </>
  );

  return (
    <header
      className="mt-6 md:mt-8 relative z-30 bg-white dark:bg-gray-950 w-full"
      role="banner"
    >
      {/* Primary Nav */}
      <div className="w-full px-6 md:px-10">
        <nav
          className="flex items-center justify-between py-4 w-full"
          aria-label="Main navigation"
        >
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg py-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>

          <div className="flex items-center gap-1.5">
            <ChristmasTree />
            <CommandPalette />
            {actionButtons}
          </div>
        </nav>
      </div>
      {/* Chat Drawer - Only render when open */}
      {isDrawerOpen('chat') && (
        <ChatDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}

      {/* Login Drawer - Only render when open */}
      {isDrawerOpen('login') && (
        <LoginDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}

      {/* Login Modal - Centered on-page modal for auth prompts */}
      {isDrawerOpen('login-modal') && (
        <LoginModal
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
    </header>
  );
}
