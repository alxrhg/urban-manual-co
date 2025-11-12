'use client';

import { ReactNode } from 'react';
import { AccountLayout } from '@/components/account/AccountLayout';
import { UserProvider } from '@/contexts/UserContext';

interface AccountSectionLayoutProps {
  children: ReactNode;
}

export default function AccountSectionLayout({ children }: AccountSectionLayoutProps) {
  return (
    <UserProvider>
      <AccountLayout>{children}</AccountLayout>
    </UserProvider>
  );
}
