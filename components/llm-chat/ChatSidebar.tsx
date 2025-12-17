'use client';

import React, { memo } from 'react';
import { Plus, MessageSquare, Trash2, Settings, X, Menu } from 'lucide-react';

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: Date;
  messageCount?: number;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function groupConversations(conversations: Conversation[]): Record<string, Conversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Conversation[]> = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': [],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updatedAt);
    if (convDate >= today) {
      groups['Today'].push(conv);
    } else if (convDate >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (convDate >= lastWeek) {
      groups['Previous 7 Days'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

export const ChatSidebar = memo(function ChatSidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
  userName,
}: ChatSidebarProps) {
  const groupedConversations = groupConversations(conversations);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {Object.keys(groupedConversations).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No conversations yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            Object.entries(groupedConversations).map(([group, convs]) => (
              <div key={group} className="mb-4">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group}
                  </h3>
                </div>
                <div className="space-y-0.5">
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative mx-2 rounded-lg ${
                        currentConversationId === conv.id
                          ? 'bg-gray-200 dark:bg-gray-800'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <button
                        onClick={() => onSelectConversation(conv.id)}
                        className="w-full text-left px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {conv.title}
                            </p>
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {conv.lastMessage}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatRelativeTime(new Date(conv.updatedAt))}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Delete button */}
                      {onDeleteConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userName ? userName.charAt(0).toUpperCase() : 'G'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userName || 'Guest'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Urban Manual AI
              </p>
            </div>
            <button
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});

export default ChatSidebar;
