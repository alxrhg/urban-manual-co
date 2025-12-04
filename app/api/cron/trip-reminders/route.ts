import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { sendPrivacyEmail } from '@/lib/utils/privacy-email';
import { Trip, formatDestinationsFromField } from '@/types/trip';

const BATCH_SIZE = 50;

type ReminderType = 'week_before' | '3_days_before' | 'day_before';

interface ReminderResult {
  tripId: string;
  userId: string;
  reminderType: ReminderType;
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const results: ReminderResult[] = [];

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Calculate reminder dates
    const tomorrow = addDays(today, 1);
    const threeDaysOut = addDays(today, 3);
    const weekOut = addDays(today, 7);

    // Fetch upcoming trips that start on reminder dates
    const { data: trips, error: tripsError } = await serviceClient
      .from('trips')
      .select('*')
      .in('status', ['planning', 'upcoming'])
      .not('start_date', 'is', null)
      .or(
        `start_date.eq.${formatDate(tomorrow)},start_date.eq.${formatDate(threeDaysOut)},start_date.eq.${formatDate(weekOut)}`
      )
      .limit(BATCH_SIZE);

    if (tripsError) {
      console.error('[trip-reminders] Error fetching trips:', tripsError);
      return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
    }

    if (!trips?.length) {
      return NextResponse.json({ success: true, sent: 0, results: [] });
    }

    // Get already sent reminders to avoid duplicates
    const tripIds = trips.map((t) => t.id);
    const { data: sentReminders } = await serviceClient
      .from('trip_reminders_sent')
      .select('trip_id, reminder_type')
      .in('trip_id', tripIds);

    const sentSet = new Set(
      (sentReminders || []).map((r) => `${r.trip_id}:${r.reminder_type}`)
    );

    for (const trip of trips as Trip[]) {
      const reminderType = getReminderType(trip.start_date!, tomorrow, threeDaysOut, weekOut);
      if (!reminderType) continue;

      const key = `${trip.id}:${reminderType}`;
      if (sentSet.has(key)) {
        results.push({
          tripId: trip.id,
          userId: trip.user_id,
          reminderType,
          status: 'skipped',
        });
        continue;
      }

      try {
        const email = await getUserEmail(serviceClient, trip.user_id);
        if (!email) {
          results.push({
            tripId: trip.id,
            userId: trip.user_id,
            reminderType,
            status: 'skipped',
            error: 'No email found',
          });
          continue;
        }

        const { subject, html, text } = buildEmailContent(trip, reminderType);
        const emailResult = await sendPrivacyEmail({ to: email, subject, html, text });

        if (emailResult.skipped || emailResult.success === false) {
          results.push({
            tripId: trip.id,
            userId: trip.user_id,
            reminderType,
            status: 'skipped',
            error: 'Email send skipped or failed',
          });
          continue;
        }

        // Record that we sent this reminder
        await serviceClient.from('trip_reminders_sent').insert({
          trip_id: trip.id,
          user_id: trip.user_id,
          reminder_type: reminderType,
        });

        results.push({
          tripId: trip.id,
          userId: trip.user_id,
          reminderType,
          status: 'sent',
        });
      } catch (error) {
        const message = describeError(error);
        console.error(`[trip-reminders] Failed to send reminder for trip ${trip.id}:`, error);
        results.push({
          tripId: trip.id,
          userId: trip.user_id,
          reminderType,
          status: 'failed',
          error: message,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    return NextResponse.json({ success: true, sent: sentCount, results });
  } catch (error) {
    console.error('[trip-reminders] Cron error:', error);
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
  }
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  return vercelCronHeader === '1';
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getReminderType(
  startDate: string,
  tomorrow: Date,
  threeDaysOut: Date,
  weekOut: Date
): ReminderType | null {
  const start = formatDate(new Date(startDate));
  if (start === formatDate(tomorrow)) return 'day_before';
  if (start === formatDate(threeDaysOut)) return '3_days_before';
  if (start === formatDate(weekOut)) return 'week_before';
  return null;
}

async function getUserEmail(
  client: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user?.email || null;
  } catch (error) {
    console.error('[trip-reminders] Failed to fetch user email:', error);
    return null;
  }
}

function buildEmailContent(
  trip: Trip,
  reminderType: ReminderType
): { subject: string; html: string; text: string } {
  const destination = formatDestinationsFromField(trip.destination) || 'your destination';
  const tripTitle = trip.title || 'Your trip';
  const startDate = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  let timeframe: string;
  switch (reminderType) {
    case 'day_before':
      timeframe = 'tomorrow';
      break;
    case '3_days_before':
      timeframe = 'in 3 days';
      break;
    case 'week_before':
      timeframe = 'in one week';
      break;
  }

  const subject = `Reminder: ${tripTitle} to ${destination} starts ${timeframe}!`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Your trip is coming up!</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        <strong>${tripTitle}</strong> to <strong>${destination}</strong> starts ${timeframe} on ${startDate}.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Make sure you're ready for your adventure!
      </p>
      <div style="margin: 24px 0;">
        <a href="https://www.urbanmanual.co/trips/${trip.id}"
           style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Your Itinerary
        </a>
      </div>
      <p style="color: #888; font-size: 14px;">
        Safe travels!<br>
        The Urban Manual Team
      </p>
    </div>
  `.trim();

  const text = `Your trip is coming up!

${tripTitle} to ${destination} starts ${timeframe} on ${startDate}.

Make sure you're ready for your adventure!

View your itinerary: https://www.urbanmanual.co/trips/${trip.id}

Safe travels!
The Urban Manual Team`;

  return { subject, html, text };
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Unknown error';
}
