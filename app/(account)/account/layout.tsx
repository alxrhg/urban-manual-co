'use client';

import { ReactNode } from 'react';
import { AccountLayout } from '@/components/account/AccountLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { UserProvider } from '@/contexts/UserContext';

interface AccountSectionLayoutProps {
  children: ReactNode;
}

export default function AccountSectionLayout({ children }: AccountSectionLayoutProps) {
  return (
    <RequireAuth reason="account">
      <UserProvider>
        <AccountLayout>{children}</AccountLayout>
      </UserProvider>
    </RequireAuth>
  );
}
