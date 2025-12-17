import type { ReactNode } from 'react';
import AdminLayoutShell from '@/features/admin/components/AdminLayoutShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
