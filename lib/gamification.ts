import { createServiceRoleClient } from '@/lib/supabase-server';

const POINT_VALUES = {
  SAVE_DESTINATION: 5,
  CREATE_LIST: 10,
  COMPLETE_TRIP: 50,
  WRITE_REVIEW: 25,
  UPLOAD_PHOTO: 10,
} as const;

const LEVELS = [
  { name: 'Novice', minPoints: 0 },
  { name: 'Explorer', minPoints: 100 },
  { name: 'Local', minPoints: 500 },
  { name: 'Globetrotter', minPoints: 1000 },
  { name: 'Legend', minPoints: 5000 },
] as const;

export type GamificationAction = keyof typeof POINT_VALUES;

export const LEVEL_DEFINITIONS = LEVELS;

export async function awardPoints(userId: string, action: GamificationAction) {
  const supabase = createServiceRoleClient();
  const points = POINT_VALUES[action];

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('explorer_score, level')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`);
  }

  const currentScore = profile?.explorer_score ?? 0;
  const newScore = currentScore + points;

  const newLevel = [...LEVELS]
    .sort((a, b) => b.minPoints - a.minPoints)
    .find((level) => newScore >= level.minPoints)?.name || 'Novice';

  const profilesTable = supabase.from('profiles');
  const { error: updateError } = await profilesTable.upsert(
    { id: userId, explorer_score: newScore, level: newLevel },
    { onConflict: 'id' }
  );

  if (updateError) {
    throw new Error(`Failed to update gamification stats: ${updateError.message}`);
  }

  return { newScore, newLevel, pointsAwarded: points };
}

export function getPointsForAction(action: GamificationAction) {
  return POINT_VALUES[action] ?? 0;
}
