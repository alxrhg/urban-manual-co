'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import { DrawerHeader } from "@/components/ui/DrawerHeader";
import { DrawerSection } from "@/components/ui/DrawerSection";
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Edit3,
  Sparkles,
  Send,
} from 'lucide-react';
import { useAIConversation } from '@/contexts/AIConversationContext';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function ProfileAvatar({
  avatarUrl,
  displayUsername,
  size = "lg"
}: {
  avatarUrl: string | null;
  displayUsername: string;
  size?: "sm" | "lg";
}) {
  const sizeClasses = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const textClasses = size === "lg" ? "text-2xl" : "text-sm";

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center overflow-hidden rounded-full border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900`}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes={size === "lg" ? "64px" : "40px"}
        />
      ) : (
        <span className={`${textClasses} font-medium text-gray-400 dark:text-gray-500`}>
          {displayUsername.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
      <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm mb-1">
        <Icon className="h-4 w-4 text-gray-900 dark:text-white" />
      </div>
      <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

function AIConversationSection() {
  const { messages, isLoading, sendMessage } = useAIConversation();
  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const query = input.trim();
    setInput('');
    await sendMessage(query);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-2 px-2 mb-3">
        <Sparkles className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          AI Assistant
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Ask me anything about travel...
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {["What's good in Tokyo?", "Help me plan a trip"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                {/* Destination Cards - Horizontal row */}
                {message.destinations && message.destinations.length > 0 && (
                  <div className="mt-2 -mx-1">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {message.destinations.slice(0, 5).map((dest) => (
                        <a
                          key={dest.slug}
                          href={`/destination/${dest.slug}`}
                          className="flex-shrink-0 w-24 group"
                        >
                          <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-1">
                            {dest.image && (
                              <img
                                src={dest.image}
                                alt={dest.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                          </div>
                          <p className="text-[10px] font-medium leading-tight line-clamp-2">
                            {dest.name}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  description,
  onClick,
  isDanger = false,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  isDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 text-left ${
        isDanger ? 'hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-100 dark:hover:border-red-900/30' : ''
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          isDanger
            ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-black group-hover:text-black dark:group-hover:text-white group-hover:shadow-sm'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isDanger
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`text-xs mt-0.5 ${
              isDanger
                ? 'text-red-500/70 dark:text-red-400/70'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
          isDanger ? 'text-red-400' : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400'
        }`}
      />
    </button>
  );
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const openSide = useDrawerStore((s) => s.openSide);
  const { openDrawer: openLegacyDrawer } = useDrawer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
  });

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0 });
        return;
      }

      try {
        const supabaseClient = createClient();

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        } else {
           // Fallback to user_profiles if needed, but sticking to profiles for consistency
           const { data: userProfileData } = await supabaseClient
            .from('user_profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userProfileData?.username) {
            setUsername(userProfileData.username);
          }
        }

        const [visitedResult, savedResult, tripsResult] = await Promise.all([
          supabaseClient
            .from('visited_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseClient
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseClient
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching profile and stats:', error);
      }
    }

    if (isOpen && user) {
      fetchProfileAndStats();
    }
  }, [user, isOpen]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path), 200);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  if (!user) {
    return (
      <div className="h-full flex flex-col">
        <DrawerHeader
          title="Welcome"
          rightAccessory={
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        />

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-6">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Sign in to Urban Manual
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
            Unlock your personal travel guide. Save places, create trips, and sync across devices.
          </p>
          
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-opacity"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Custom Header Area */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-start justify-between mb-6">
          <ProfileAvatar avatarUrl={avatarUrl} displayUsername={displayUsername} size="lg" />
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            {displayUsername}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user.email}
          </p>
        </div>

        <button
          onClick={() => handleNavigate('/account')}
          className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Navigation Groups */}
          <div className="px-4 space-y-8 pb-12">
          {/* AI Assistant Section */}
          <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <AIConversationSection />
          </div>

          {/* Library */}
          <div>
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Library
            </h3>
            <div className="space-y-1">
              <NavItem
                icon={Bookmark}
                label="Saved Places"
                description={`${stats.saved} curated spots`}
                onClick={() => {
                  onClose();
                  openLegacyDrawer('saved-places');
                }}
              />
              <NavItem
                icon={MapPin}
                label="Visited Places"
                description={`${stats.visited} experiences logged`}
                onClick={() => {
                  onClose();
                  openLegacyDrawer('visited-places');
                }}
              />
              <NavItem
                icon={Compass}
                label="Trip Plans"
                description={`${stats.trips} itineraries`}
                onClick={() => {
                  onClose();
                  openSide('trip-list');
                }}
              />
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Preferences
            </h3>
            <div className="space-y-1">
              <NavItem
                icon={Settings}
                label="Settings"
                description="App preferences & privacy"
                onClick={() => {
                  onClose();
                  openLegacyDrawer('settings');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-900">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
