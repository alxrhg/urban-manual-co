'use client';

import React, { useState } from 'react';
import {
  XIcon,
  LinkIcon,
  MailIcon,
  MessageSquareIcon,
  CheckIcon,
} from 'lucide-react';
import { Drawer } from './ui/Drawer';

interface TripShareModalProps {
  tripName: string;
  onClose: () => void;
  isOpen: boolean;
}

export function TripShareModal({ tripName, onClose, isOpen }: TripShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const shareUrl = `https://urbanmanual.com/trip/${tripName.toLowerCase().replace(/\s+/g, '-')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailShare = () => {
    window.location.href = `mailto:${email}?subject=Check out my trip: ${tripName}&body=I wanted to share my trip itinerary with you: ${shareUrl}`;
  };

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
        Share Trip
      </h3>
    </div>
  );

  const content = (
    <div className="px-5 py-5 space-y-6">
          {/* Copy Link */}
          <div>
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-gray-900"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Link copied to clipboard!
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Share via Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
              <button
                onClick={handleEmailShare}
                disabled={!email}
                className="px-4 py-3 border border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-900 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MailIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Social Share */}
          <div>
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Share on Social
            </label>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                Twitter
              </button>
              <button className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                Facebook
              </button>
              <button className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                WhatsApp
              </button>
            </div>
          </div>

          {/* Permissions */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Sharing Permissions
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  defaultChecked
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Allow others to view
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Allow others to edit
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Allow others to comment
                </span>
              </label>
            </div>
          </div>
        </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      headerContent={headerContent}
      desktopWidth="480px"
      position="right"
      style="solid"
      zIndex={80}
      backdropOpacity="20"
    >
      {content}
    </Drawer>
  );
}

