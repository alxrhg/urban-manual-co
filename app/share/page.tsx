'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Share2, Search, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/ui/button';

/**
 * Share Target page - receives shared content from other apps
 *
 * When users share a URL or text to Urban Manual, this page:
 * 1. Extracts the shared content (URL, text, or title)
 * 2. Attempts to find a matching destination
 * 3. Redirects to the destination or search results
 */

function ShareHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'not-found' | 'error'>('processing');
  const [sharedContent, setSharedContent] = useState<{
    url?: string;
    text?: string;
    title?: string;
  }>({});

  useEffect(() => {
    const url = searchParams.get('url');
    const text = searchParams.get('text');
    const title = searchParams.get('title');

    setSharedContent({ url: url || undefined, text: text || undefined, title: title || undefined });

    // Process the shared content
    processSharedContent(url, text, title);
  }, [searchParams]);

  const processSharedContent = async (
    url: string | null,
    text: string | null,
    title: string | null
  ) => {
    try {
      // Try to extract a destination slug from the URL
      if (url) {
        // Check if it's an Urban Manual URL
        const urbanManualMatch = url.match(/urbanmanual\.co\/destination\/([^/?]+)/);
        if (urbanManualMatch) {
          router.replace(`/destination/${urbanManualMatch[1]}`);
          return;
        }

        // Check for city URL
        const cityMatch = url.match(/urbanmanual\.co\/city\/([^/?]+)/);
        if (cityMatch) {
          router.replace(`/city/${cityMatch[1]}`);
          return;
        }

        // For external URLs, extract the domain/name and search
        const urlObj = new URL(url);
        const searchQuery = urlObj.hostname.replace('www.', '').split('.')[0];
        router.replace(`/search?q=${encodeURIComponent(searchQuery)}`);
        return;
      }

      // If we have text or title, search for it
      const searchQuery = text || title;
      if (searchQuery) {
        // Clean up the text - remove URLs, extra whitespace
        const cleanQuery = searchQuery
          .replace(/https?:\/\/\S+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100); // Limit search query length

        if (cleanQuery) {
          router.replace(`/search?q=${encodeURIComponent(cleanQuery)}`);
          return;
        }
      }

      // Nothing useful to process
      setStatus('not-found');
    } catch (error) {
      console.error('Error processing shared content:', error);
      setStatus('error');
    }
  };

  const handleSearch = () => {
    const query = sharedContent.text || sharedContent.title || '';
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Processing shared content...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Looking for matching destinations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Share2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Content Received
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {status === 'error'
            ? "We couldn't process the shared content."
            : "We couldn't find an exact match for what you shared."}
        </p>

        {/* Show what was shared */}
        {(sharedContent.url || sharedContent.text || sharedContent.title) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 text-left border border-gray-200 dark:border-gray-700">
            {sharedContent.title && (
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Title
                </span>
                <p className="text-gray-900 dark:text-white truncate">
                  {sharedContent.title}
                </p>
              </div>
            )}
            {sharedContent.text && (
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Text
                </span>
                <p className="text-gray-900 dark:text-white line-clamp-3">
                  {sharedContent.text}
                </p>
              </div>
            )}
            {sharedContent.url && (
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  URL
                </span>
                <a
                  href={sharedContent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                >
                  {sharedContent.url}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={handleSearch} className="w-full" size="lg">
            <Search className="w-4 h-4 mr-2" />
            Search Destinations
          </Button>

          <Button onClick={handleGoHome} variant="outline" className="w-full" size="lg">
            <MapPin className="w-4 h-4 mr-2" />
            Explore All Destinations
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      }
    >
      <ShareHandler />
    </Suspense>
  );
}
