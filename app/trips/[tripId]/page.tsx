
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TripDay } from '@/components/TripDay';
import { ItineraryItem, ItineraryItemNotes } from '@/types/trip';

async function getTripDetails(tripId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

    if (error || !trip) {
        return null;
    }

    const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

    if (itemsError) {
        console.error('Error fetching itinerary items:', itemsError);
        return { trip, items: [] };
    }

    return { trip, items };
}

export default async function TripDetailsPage({ params }: { params: { tripId: string } }) {
    const tripDetails = await getTripDetails(params.tripId);

    if (!tripDetails) {
        notFound();
    }

    const { trip, items } = tripDetails;

    const itemsByDay = (items as ItineraryItem[]).reduce((acc, item) => {
        const day = item.day;
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(item);
        return acc;
    }, {} as Record<number, ItineraryItem[]>);

    const getDateForDay = (dayNumber: number): string => {
        if (!trip?.start_date) {
            const date = new Date();
            date.setDate(date.getDate() + dayNumber - 1);
            return date.toISOString().split('T')[0];
        }
        const startDate = new Date(trip.start_date);
        startDate.setDate(startDate.getDate() + dayNumber - 1);
        return startDate.toISOString().split('T')[0];
    };

import TripActions from '@/components/TripActions';

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
                    <p className="text-lg text-gray-500">{trip.destination}</p>
                </div>
                <TripActions tripId={trip.id} tripTitle={trip.title} />
            </div>
            <div className="space-y-8">
                {Object.entries(itemsByDay).map(([day, dayItems]) => (
                    <TripDay
                        key={day}
                        dayNumber={parseInt(day)}
                        date={getDateForDay(parseInt(day))}
                        locations={dayItems.map(item => {
                            let notesData: ItineraryItemNotes = {};
                            if (item.notes) {
                                try {
                                    notesData = JSON.parse(item.notes) as ItineraryItemNotes;
                                } catch {
                                    notesData = { raw: item.notes };
                                }
                            }
                            return {
                                id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
                                name: item.title,
                                city: trip.destination || '',
                                category: item.description || '',
                                image: notesData.image || '/placeholder-image.jpg',
                                time: item.time || undefined,
                                notes: notesData.raw || undefined,
                                duration: notesData.duration || undefined,
                            };
                        })}
                        hotelLocation={trip.description || ''}
                    />
                ))}
            </div>
        </div>
    );
}
