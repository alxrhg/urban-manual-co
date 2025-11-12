'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CollectionsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/account/history#collections');
  }, [router]);

  return null;
}

