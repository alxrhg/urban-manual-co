'use client';

import { useAuth } from '@/contexts/AuthContext';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName(email: string | undefined): string {
  if (!email) return 'there';
  // Extract username from email
  const username = email.split('@')[0];
  // Capitalize first letter
  return username.charAt(0).toUpperCase() + username.slice(1);
}

export function AdminGreeting() {
  const { user } = useAuth();
  const greeting = getGreeting();
  const displayName = getDisplayName(user?.email);

  return (
    <h1 className="text-2xl md:text-3xl font-medium text-black dark:text-white text-center">
      {greeting}, {displayName}
    </h1>
  );
}
