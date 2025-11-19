import { supabase } from '@/lib/supabase';

export interface UserProfile {
    id: string;
    preferences: {
        categories: string[];
        dietary?: string[];
        pace?: 'relaxed' | 'fast';
    };
    history: string[]; // IDs of visited places
}

export class UserProfileService {
    async getProfile(userId: string): Promise<UserProfile | null> {
        // TODO: Fetch from 'user_profiles' table
        return null;
    }

    async updatePreferences(userId: string, preferences: UserProfile['preferences']): Promise<void> {
        // TODO: Update 'user_profiles' table
    }
}
