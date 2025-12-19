'use client';

import { DataManager } from '@/features/admin/components/DataManager';

export const dynamic = 'force-dynamic';

export default function AdminNeighborhoodsPage() {
  return <DataManager type="neighborhoods" />;
}
