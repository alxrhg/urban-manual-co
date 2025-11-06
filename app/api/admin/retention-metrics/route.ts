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

    // Get user profiles
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, created_at')
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    // Get all user interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('user_id, created_at, interaction_type')
      .order('created_at', { ascending: true });

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
    }

    // Calculate retention metrics
    const metrics = calculateRetentionMetrics(userProfiles || [], interactions || []);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Retention metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function calculateRetentionMetrics(users: any[], interactions: any[]) {
  const now = new Date();

  // Day 1, Day 7, Day 30 retention
  const retentionRates = calculateDayRetention(users, interactions, now);

  // Weekly Active Users (last 12 weeks)
  const wau = calculateWeeklyActiveUsers(interactions, now);

  // Monthly Active Users (last 6 months)
  const mau = calculateMonthlyActiveUsers(interactions, now);

  // Engagement by interaction type
  const engagementByType = calculateEngagementByType(interactions);

  // User lifecycle stages
  const lifecycleStages = calculateLifecycleStages(users, interactions, now);

  return {
    retentionRates,
    wau,
    mau,
    engagementByType,
    lifecycleStages,
  };
}

function calculateDayRetention(users: any[], interactions: any[], now: Date) {
  const retention: any = {
    day1: { returned: 0, total: 0, rate: 0 },
    day7: { returned: 0, total: 0, rate: 0 },
    day30: { returned: 0, total: 0, rate: 0 },
  };

  // Build user interaction map
  const userInteractionDates = new Map<string, Date[]>();
  interactions.forEach((interaction) => {
    if (!userInteractionDates.has(interaction.user_id)) {
      userInteractionDates.set(interaction.user_id, []);
    }
    userInteractionDates.get(interaction.user_id)!.push(new Date(interaction.created_at));
  });

  users.forEach((user) => {
    const signupDate = new Date(user.created_at);
    const userInteractions = userInteractionDates.get(user.user_id) || [];

    // Day 1 retention
    const day1Start = new Date(signupDate);
    day1Start.setDate(day1Start.getDate() + 1);
    const day1End = new Date(day1Start);
    day1End.setDate(day1End.getDate() + 1);

    if (now >= day1End) {
      retention.day1.total++;
      const hasDay1Activity = userInteractions.some(
        (d) => d >= day1Start && d < day1End
      );
      if (hasDay1Activity) retention.day1.returned++;
    }

    // Day 7 retention
    const day7Start = new Date(signupDate);
    day7Start.setDate(day7Start.getDate() + 7);
    const day7End = new Date(day7Start);
    day7End.setDate(day7End.getDate() + 1);

    if (now >= day7End) {
      retention.day7.total++;
      const hasDay7Activity = userInteractions.some(
        (d) => d >= day7Start && d < day7End
      );
      if (hasDay7Activity) retention.day7.returned++;
    }

    // Day 30 retention
    const day30Start = new Date(signupDate);
    day30Start.setDate(day30Start.getDate() + 30);
    const day30End = new Date(day30Start);
    day30End.setDate(day30End.getDate() + 1);

    if (now >= day30End) {
      retention.day30.total++;
      const hasDay30Activity = userInteractions.some(
        (d) => d >= day30Start && d < day30End
      );
      if (hasDay30Activity) retention.day30.returned++;
    }
  });

  // Calculate rates
  retention.day1.rate =
    retention.day1.total > 0
      ? Math.round((retention.day1.returned / retention.day1.total) * 100)
      : 0;
  retention.day7.rate =
    retention.day7.total > 0
      ? Math.round((retention.day7.returned / retention.day7.total) * 100)
      : 0;
  retention.day30.rate =
    retention.day30.total > 0
      ? Math.round((retention.day30.returned / retention.day30.total) * 100)
      : 0;

  return retention;
}

function calculateWeeklyActiveUsers(interactions: any[], now: Date) {
  const wau: any[] = [];

  for (let i = 0; i < 12; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const activeUsers = new Set<string>();
    interactions.forEach((interaction) => {
      const interactionDate = new Date(interaction.created_at);
      if (interactionDate >= weekStart && interactionDate <= weekEnd) {
        activeUsers.add(interaction.user_id);
      }
    });

    wau.unshift({
      week: formatWeek(weekStart),
      count: activeUsers.size,
    });
  }

  return wau;
}

function calculateMonthlyActiveUsers(interactions: any[], now: Date) {
  const mau: any[] = [];

  for (let i = 0; i < 6; i++) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthStart.setHours(0, 0, 0, 0);

    const activeUsers = new Set<string>();
    interactions.forEach((interaction) => {
      const interactionDate = new Date(interaction.created_at);
      if (interactionDate >= monthStart && interactionDate <= monthEnd) {
        activeUsers.add(interaction.user_id);
      }
    });

    mau.unshift({
      month: formatMonth(monthStart),
      count: activeUsers.size,
    });
  }

  return mau;
}

function calculateEngagementByType(interactions: any[]) {
  const typeCount: Record<string, number> = {};

  interactions.forEach((interaction) => {
    const type = interaction.interaction_type || 'unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  return Object.entries(typeCount)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateLifecycleStages(users: any[], interactions: any[], now: Date) {
  const stages = {
    new: 0, // Signed up in last 30 days
    active: 0, // Active in last 7 days
    returning: 0, // Active in last 30 days but not last 7 days
    dormant: 0, // Active 30-90 days ago
    churned: 0, // No activity in 90+ days
  };

  const userLastActivity = new Map<string, Date>();
  interactions.forEach((interaction) => {
    const userId = interaction.user_id;
    const date = new Date(interaction.created_at);
    if (
      !userLastActivity.has(userId) ||
      date > userLastActivity.get(userId)!
    ) {
      userLastActivity.set(userId, date);
    }
  });

  users.forEach((user) => {
    const signupDate = new Date(user.created_at);
    const lastActivity = userLastActivity.get(user.user_id);
    const daysSinceSignup = Math.floor(
      (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup <= 30) {
      stages.new++;
    }

    if (lastActivity) {
      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity <= 7) {
        stages.active++;
      } else if (daysSinceActivity <= 30) {
        stages.returning++;
      } else if (daysSinceActivity <= 90) {
        stages.dormant++;
      } else {
        stages.churned++;
      }
    } else {
      // No activity ever
      if (daysSinceSignup > 90) {
        stages.churned++;
      } else if (daysSinceSignup > 30) {
        stages.dormant++;
      }
    }
  });

  return stages;
}

function formatWeek(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatMonth(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
