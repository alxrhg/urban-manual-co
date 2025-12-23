'use client';

import { Plane } from 'lucide-react';
import { useDrawer } from '@/contexts/DrawerContext';
import { LoginModal } from '@/components/LoginModal';

export default function TripsUnauthenticated() {
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();

  return (
    <main className="w-full min-h-screen bg-[var(--editorial-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] flex items-center justify-center mb-6 mx-auto">
          <Plane className="h-7 w-7 text-[var(--editorial-text-tertiary)]" />
        </div>
        <h1
          className="text-2xl font-normal text-[var(--editorial-text-primary)] mb-3"
          style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
        >
          Trips
        </h1>
        <p className="text-sm text-[var(--editorial-text-secondary)] mb-8">
          Sign in to plan and organize your travels
        </p>
        <button
          onClick={() => openDrawer('login-modal')}
          className="w-full px-6 py-3 bg-[var(--editorial-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
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
