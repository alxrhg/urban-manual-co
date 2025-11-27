'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';

// Types for AI Chat
interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  destinations?: Destination[];
}

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

  // View state: 'account' or 'chat'
  const [view, setView] = useState<'account' | 'chat'>('account');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, view]);

  // Focus chat input when switching to chat view
  useEffect(() => {
    if (view === 'chat' && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [view]);

  // Reset view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setView('account');
    }
  }, [isOpen]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          userId: user?.id,
          conversationHistory,
        }),
      });

      if (!response.ok) throw new Error('AI chat failed');

      const data = await response.json();
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: data.content || '',
        destinations: data.destinations
      }]);
    } catch (error) {
      console.error("AI error:", error);
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

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

  // Chat View
  if (view === 'chat') {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Chat Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('account')}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-900 dark:text-white" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Chat</h2>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {chatMessages.length === 0 && !isChatLoading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Ask about destinations, restaurants, or travel tips.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Best restaurants in Tokyo", "Michelin-starred spots", "Cafes in Paris"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setChatInput(suggestion)}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium opacity-70">AI Assistant</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content.split('\n').map((line, i) => {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <div key={i}>
                        {parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Destination Cards */}
                {message.destinations && message.destinations.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {message.destinations.map((dest) => (
                      <a
                        key={dest.slug}
                        href={`/destination/${dest.slug}`}
                        className="group block"
                        onClick={(e) => {
                          e.preventDefault();
                          onClose();
                          router.push(`/destination/${dest.slug}`);
                        }}
                      >
                        <div className="relative aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden mb-1.5">
                          {dest.image ? (
                            <img
                              src={dest.image}
                              alt={dest.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <MapPin className="h-6 w-6 opacity-20" />
                            </div>
                          )}
                          {dest.crown && (
                            <div className="absolute top-1.5 left-1.5 text-sm">👑</div>
                          )}
                          {dest.michelin_stars && dest.michelin_stars > 0 && (
                            <div className="absolute bottom-1.5 left-1.5 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                              <span>⭐</span>
                              <span>{dest.michelin_stars}</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-0.5">
                          {dest.name}
                        </h4>
                        <span className="text-[10px] text-gray-500 capitalize">
                          {dest.city.replace(/-/g, ' ')} · {dest.category}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-100 dark:border-gray-900 p-4">
          <form onSubmit={handleChatSubmit} className="flex items-end gap-2">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e);
                }
              }}
              placeholder="Ask about destinations..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm resize-none focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              style={{ maxHeight: '100px' }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Account View (default)
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
          {/* AI */}
          <div>
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              AI
            </h3>
            <div className="space-y-1">
              <NavItem
                icon={Sparkles}
                label="AI Chat"
                description="Get personalized recommendations"
                onClick={() => setView('chat')}
              />
            </div>
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
