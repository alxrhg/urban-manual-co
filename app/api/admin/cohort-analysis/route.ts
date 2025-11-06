import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cohort data - users grouped by signup week/month
    // Cohort analysis shows retention of users over time
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, created_at')
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    // Get all user interactions for retention calculation
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('user_id, created_at, interaction_type')
      .order('created_at', { ascending: true });

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
    }

    // Calculate cohorts by week
    const cohortData = calculateCohorts(userProfiles || [], interactions || []);

    return NextResponse.json({
      cohorts: cohortData.cohorts,
      summary: cohortData.summary,
    });
  } catch (error: any) {
    console.error('Cohort analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function calculateCohorts(users: any[], interactions: any[]) {
  // Group users by signup week
  const cohortMap = new Map<string, Set<string>>();
  const userCohortMap = new Map<string, string>(); // user_id -> cohort week

  users.forEach((user) => {
    const signupDate = new Date(user.created_at);
    const cohortWeek = getWeekKey(signupDate);

    if (!cohortMap.has(cohortWeek)) {
      cohortMap.set(cohortWeek, new Set());
    }
    cohortMap.get(cohortWeek)!.add(user.user_id);
    userCohortMap.set(user.user_id, cohortWeek);
  });

  // Calculate retention for each cohort
  const cohorts: any[] = [];
  const sortedCohortWeeks = Array.from(cohortMap.keys()).sort();

  sortedCohortWeeks.forEach((cohortWeek) => {
    const cohortUsers = cohortMap.get(cohortWeek)!;
    const cohortSize = cohortUsers.size;

    // Get first date of this cohort
    const cohortStartDate = parseWeekKey(cohortWeek);

    // Calculate retention for weeks 0-12
    const retention: number[] = [];
    for (let weekOffset = 0; weekOffset <= 12; weekOffset++) {
      const weekStart = new Date(cohortStartDate);
      weekStart.setDate(weekStart.getDate() + weekOffset * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Count how many users from this cohort were active in this week
      const activeUsers = new Set<string>();
      interactions.forEach((interaction) => {
        const interactionDate = new Date(interaction.created_at);
        if (
          cohortUsers.has(interaction.user_id) &&
          interactionDate >= weekStart &&
          interactionDate < weekEnd
        ) {
          activeUsers.add(interaction.user_id);
        }
      });

      const retentionRate = cohortSize > 0 ? (activeUsers.size / cohortSize) * 100 : 0;
      retention.push(Math.round(retentionRate * 10) / 10); // Round to 1 decimal
    }

    cohorts.push({
      cohortWeek,
      cohortSize,
      retention,
    });
  });

  // Calculate summary statistics
  const totalUsers = users.length;
  const avgRetentionWeek1 = cohorts.length > 0
    ? cohorts.reduce((sum, c) => sum + (c.retention[1] || 0), 0) / cohorts.length
    : 0;
  const avgRetentionWeek4 = cohorts.length > 0
    ? cohorts.reduce((sum, c) => sum + (c.retention[4] || 0), 0) / cohorts.length
    : 0;

  return {
    cohorts: cohorts.slice(-12), // Last 12 cohorts
    summary: {
      totalUsers,
      totalCohorts: cohorts.length,
      avgRetentionWeek1: Math.round(avgRetentionWeek1 * 10) / 10,
      avgRetentionWeek4: Math.round(avgRetentionWeek4 * 10) / 10,
    },
  };
}

function getWeekKey(date: Date): string {
  // Get ISO week number
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function parseWeekKey(weekKey: string): Date {
  const [year, week] = weekKey.split('-W').map(Number);
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7;
  const result = new Date(firstDayOfYear);
  result.setDate(result.getDate() + daysToAdd);
  return result;
}
