
'use client';

import { TripPlanner } from '@/components/TripPlanner';
import { useRouter, useParams } from 'next/navigation';

export default function EditTripPage() {
    const router = useRouter();
    const params = useParams();
    const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;

    return (
        <TripPlanner
            isOpen={true}
            onClose={() => router.push(`/trips/${tripId}`)}
            tripId={tripId}
        />
    );
}
