import { useState, useEffect } from 'react';
import { Destination } from '@/types/destination';

export type MapPin = Pick<Destination, 'id' | 'slug' | 'name' | 'latitude' | 'longitude' | 'category' | 'city'>;

export function useMapPins() {
    const [pins, setPins] = useState<MapPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchPins() {
            try {
                const response = await fetch('/api/homepage/map-pins');
                if (!response.ok) {
                    throw new Error('Failed to fetch map pins');
                }
                const data = await response.json();

                if (mounted) {
                    console.log('[useMapPins] Loaded pins:', data.pins?.length);
                    setPins(data.pins || []);
                    setError(null);
                }
            } catch (err: any) {
                if (mounted) {
                    console.error('Error fetching map pins:', err);
                    setError(err.message || 'Failed to load map pins');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchPins();

        return () => {
            mounted = false;
        };
    }, []);

    return { pins, loading, error };
}
