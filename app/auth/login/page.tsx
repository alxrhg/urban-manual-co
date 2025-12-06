'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { LoginDrawer } from '@/components/LoginDrawer';

function LoginPageContent() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Open drawer when page loads
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    // Navigate back after animation completes
    setTimeout(() => {
      router.push('/');
    }, 350);
  };

  // Seamless background that matches the app theme
  return (
    <div
      className={`min-h-screen bg-[hsl(43,27%,92%)] dark:bg-[hsl(43,20%,10%)] transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <LoginDrawer isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[hsl(43,27%,92%)] dark:bg-[hsl(43,20%,10%)] flex items-center justify-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
