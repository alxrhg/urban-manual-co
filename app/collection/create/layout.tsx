'use client';

import type { ReactNode } from 'react';
import { UserProvider } from '@/contexts/UserContext';

export default function CollectionCreateLayout({ children }: { children: ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
