'use client';

import { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function TripsLayout({ children }: { children: ReactNode }) {
  return <RequireAuth reason="trips">{children}</RequireAuth>;
}
