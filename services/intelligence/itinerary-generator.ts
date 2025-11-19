import { supabase } from '@/lib/supabase';

export interface ItineraryRequest {
    city: string;
    days: number;
    preferences: string[];
    budget?: 'low' | 'medium' | 'high';
}

export interface ItineraryPlan {
    id: string;
    title: string;
    days: ItineraryDay[];
}

export interface ItineraryDay {
    dayNumber: number;
    activities: ItineraryActivity[];
}

export interface ItineraryActivity {
    time: string;
    destinationId: string;
    type: 'meal' | 'visit' | 'activity';
    durationMinutes: number;
}

export class ItineraryGenerator {
    async generate(request: ItineraryRequest): Promise<ItineraryPlan> {
        // TODO: Implement AI generation logic
        // 1. Fetch candidates from Supabase based on city and preferences
        // 2. Use LLM (Gemini/OpenAI) to structure the itinerary
        // 3. Validate constraints (opening hours, location)

        console.log('Generating itinerary for:', request);

        return {
            id: 'mock-id',
            title: `Trip to ${request.city}`,
            days: []
        };
    }
}
