
'use client';

import { TripPlanner } from '@/components/TripPlanner';
import { useRouter } from 'next/navigation';

export default function NewTripPage() {
    const router = useRouter();

    return (
        <TripPlanner
            isOpen={true}
            onClose={() => router.push('/trips')}
        />
    );
}
