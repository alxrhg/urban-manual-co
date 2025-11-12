'use client';

import { useId, useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void;
  placeholder?: string;
}

export function ChatInterface({ onSendMessage, placeholder = "Ask about restaurants, hotels, or cities..." }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();

  const handleSend = () => {
    if (!message.trim()) return;
    
    if (onSendMessage) {
      onSendMessage(message);
    }
    
    setMessage('');
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium">Ask AI about destinations</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{isOpen ? 'Hide' : 'Show'}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Chat Area */}
      {isOpen && (
        <div className="p-6 bg-white dark:bg-gray-900">
          <div className="flex gap-3">
            <label htmlFor={inputId} className="sr-only">
              Ask the travel assistant a question
            </label>
            <input
              id={inputId}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

