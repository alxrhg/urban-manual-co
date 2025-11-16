'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Instagram, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveInstagramProfile, type InstagramProfile } from '@/lib/social/instagram';

interface InstagramProfileCardProps {
  handle?: string | null;
  url?: string | null;
  profile?: InstagramProfile | null;
  className?: string;
  condensed?: boolean;
  showActions?: boolean;
}

export function InstagramProfileCard({
  handle,
  url,
  profile: profileProp,
  className,
  condensed = false,
  showActions = true,
}: InstagramProfileCardProps) {
  const profile = useMemo(
    () => profileProp ?? resolveInstagramProfile({ handle, url }),
    [profileProp, handle, url]
  );

  const [copied, setCopied] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const resetTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeout.current) {
        clearTimeout(resetTimeout.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!profile) return;

    try {
      const textToCopy = profile.url;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (resetTimeout.current) {
        clearTimeout(resetTimeout.current);
      }
      resetTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy Instagram URL', error);
    }
  }, [profile]);

  if (!profile) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900/70 dark:via-gray-900/40 dark:to-gray-900/10 shadow-sm p-4',
        condensed && 'flex items-center gap-3',
        className
      )}
    >
      <div className={cn('flex items-center gap-3', condensed && 'flex-1')}>
        <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/70 dark:border-gray-700 shadow-sm bg-gradient-to-tr from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
          {!avatarError ? (
            <Image
              src={profile.avatarUrl}
              alt={`${profile.displayHandle} on Instagram`}
              fill
              sizes="48px"
              className="object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              IG
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Instagram
          </span>
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <Instagram className="h-4 w-4" />
            {profile.displayHandle}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
          {!condensed && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tap through their latest posts and see how it looks through their lens.
            </p>
          )}
        </div>
      </div>

      {showActions && (
        <div
          className={cn(
            'mt-4 flex flex-wrap gap-2',
            condensed && 'mt-0 ml-auto flex-row-reverse items-center'
          )}
        >
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <Instagram className="h-3.5 w-3.5" />
            View Profile
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              copied
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-200'
                : 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy handle'}
          </button>
        </div>
      )}
    </div>
  );
}
