import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { optionalAuth, ensureRoleOrThrow } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const context = await optionalAuth();
  if (!context) {
    redirect('/account');
  }

  try {
    ensureRoleOrThrow(context.roles, ['admin', 'editor', 'moderator', 'support']);
  } catch {
    redirect('/account');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <AdminDashboard />
    </div>
  );
}
