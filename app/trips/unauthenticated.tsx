'use client';

import { Plane } from 'lucide-react';
import { useDrawer } from '@/contexts/DrawerContext';
import { LoginModal } from '@/components/LoginModal';

export default function TripsUnauthenticated() {
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 mx-auto">
          <Plane className="h-7 w-7 text-gray-400" />
        </div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">Trips</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Sign in to plan and organize your travels
        </p>
        <button
          onClick={() => openDrawer('login-modal')}
          className="w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
        >
          Sign In
        </button>
      </div>

      {/* Login Modal */}
      {isDrawerOpen('login-modal') && (
        <LoginModal isOpen={true} onClose={closeDrawer} />
      )}
    </main>
  );
}
