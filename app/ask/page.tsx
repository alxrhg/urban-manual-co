'use client';

import { Suspense } from 'react';
import { AskPageContent } from '@/components/chat/AskPageContent';
import { Sparkles } from 'lucide-react';

export default function AskPage() {
  return (
    <Suspense fallback={<AskPageFallback />}>
      <AskPageContent />
    </Suspense>
  );
}

function AskPageFallback() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="text-center">
        <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4 animate-pulse" />
        <div className="text-gray-400 dark:text-gray-600">Loading chat...</div>
      </div>
    </div>
  );
}
