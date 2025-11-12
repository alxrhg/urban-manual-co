import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface TripRecord {
  id: number;
  title: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  user_id?: string | null;
  is_public?: boolean | null;
}

interface ItineraryItemRecord {
  id: number;
  day: number;
  order_index: number;
  time?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
}

interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
}

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const tripId = Number(id);

  if (!Number.isFinite(tripId) || tripId <= 0) {
    return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const [{ data: authData }] = await Promise.all([
    supabase.auth.getUser(),
  ]);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id,title,destination,start_date,end_date,user_id,is_public')
    .eq('id', tripId)
    .maybeSingle<TripRecord>();

  if (tripError) {
    console.error('[planner] calendar export failed to load trip', tripError);
    return NextResponse.json({ error: 'Unable to load trip' }, { status: 500 });
  }

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const userId = authData?.user?.id ?? null;
  const isOwner = userId && trip.user_id && userId === trip.user_id;
  const isPublic = Boolean(trip.is_public);

  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: 'You do not have access to this trip' }, { status: 403 });
  }

  const { data: itineraryItems, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('id,day,order_index,time,title,description,notes')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    console.error('[planner] calendar export failed to load itinerary items', itemsError);
    return NextResponse.json({ error: 'Unable to load itinerary data' }, { status: 500 });
  }

  const [segments, tasks] = await Promise.all([
    fetchOptionalRecords(supabase, 'trip_segments', tripId),
    fetchOptionalRecords(supabase, 'trip_tasks', tripId),
  ]);

  const events: CalendarEvent[] = [];

  if (Array.isArray(itineraryItems)) {
    const dayDates = buildDayDateMap(itineraryItems, trip.start_date);
    itineraryItems.forEach(item => {
      const metadata = safeParseJSON(item.notes);

      if (metadata?.type === 'day' || item.title === '__day_meta__') {
        return;
      }

      const baseDate = resolveDayDate(item.day, dayDates, trip.start_date);
      if (!baseDate) {
        return;
      }

      const start = parseItemStart(baseDate, item.time, metadata?.time ?? null);
      const durationMinutes = resolveDuration(metadata?.durationMinutes);
      const end = start ? addMinutes(start, durationMinutes ?? 60) : undefined;
      const allDay = !start;
      const summary = item.title || 'Itinerary item';
      const description = buildDescription([
        item.description,
        typeof metadata?.notes === 'string' ? metadata.notes : undefined,
        formatAttachments(metadata?.attachments),
      ]);
      const location = formatLocation(metadata?.location);

      events.push({
        uid: `itinerary-item-${item.id}`,
        summary,
        description,
        location,
        start: start ?? baseDate,
        end: allDay ? addDays(baseDate, 1) : end,
        allDay,
      });
    });
  }

  segments.forEach(segment => {
    const metadata = safeParseJSON(segment?.metadata);
    const start = resolveDateTime(segment, metadata, ['start_at', 'start_time', 'startDate', 'start_date', 'departure_at', 'departure_time']);
    const end = resolveDateTime(segment, metadata, ['end_at', 'end_time', 'endDate', 'end_date', 'arrival_at', 'arrival_time']);
    const title = selectFirstString(segment, metadata, ['title', 'name'], 'Trip segment');
    const description = buildDescription([
      selectFirstString(segment, metadata, ['description', 'details', 'notes']),
      formatAttachments(metadata?.attachments),
    ]);
    const location = buildSegmentLocation(segment, metadata);

    if (start) {
      events.push({
        uid: `trip-segment-${segment.id ?? randomUUID()}`,
        summary: title,
        description,
        location,
        start,
        end: end ?? addMinutes(start, 90),
        allDay: false,
      });
    }
  });

  tasks.forEach(task => {
    const metadata = safeParseJSON(task?.metadata);
    const due = resolveDateTime(task, metadata, ['due_at', 'due_time', 'dueDate', 'due_date', 'date']);
    const fallbackDate = metadata?.dueDate ?? metadata?.date ?? task?.date ?? null;
    const start = due ?? parseDateOnly(fallbackDate);

    if (!start) {
      return;
    }

    const hasTimeComponent = Boolean(due);
    const summary = selectFirstString(task, metadata, ['title', 'name'], 'Trip task');
    const description = buildDescription([
      selectFirstString(task, metadata, ['description', 'notes', 'details']),
    ]);

    events.push({
      uid: `trip-task-${task.id ?? randomUUID()}`,
      summary,
      description,
      start,
      end: hasTimeComponent ? addMinutes(start, 30) : addDays(start, 1),
      allDay: !hasTimeComponent,
    });
  });

  if (!events.length) {
    const emptyCalendar = renderCalendar([], trip);
    return createCalendarResponse(emptyCalendar, trip.title);
  }

  const calendar = renderCalendar(events, trip);
  return createCalendarResponse(calendar, trip.title);
}

function safeParseJSON(value: unknown): any {
  if (typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[planner] calendar export failed to parse metadata', error);
    return undefined;
  }
}

function buildDayDateMap(items: ItineraryItemRecord[], startDate?: string | null) {
  const map = new Map<number, Date>();
  items.forEach(item => {
    const metadata = safeParseJSON(item.notes);
    if (metadata?.type === 'day' || item.title === '__day_meta__') {
      const date = metadata?.date || metadata?.startDate || metadata?.dayDate;
      const parsed = parseDateOnly(date) ?? deriveDateFromStart(startDate, item.day);
      if (parsed) {
        map.set(item.day, parsed);
      }
    }
  });
  return map;
}

function resolveDayDate(day: number, map: Map<number, Date>, startDate?: string | null) {
  if (map.has(day)) {
    return map.get(day) as Date;
  }
  const derived = deriveDateFromStart(startDate, day);
  if (derived) {
    map.set(day, derived);
  }
  return derived ?? null;
}

function deriveDateFromStart(startDate: string | null | undefined, day: number) {
  if (!startDate) return null;
  const base = parseDateOnly(startDate);
  if (!base) return null;
  return addDays(base, Math.max(0, day - 1));
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const normalized = value.length === 10 ? `${value}T00:00:00Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseItemStart(baseDate: Date, primaryTime?: string | null, fallbackTime?: string | null) {
  const timeValue = primaryTime || fallbackTime;
  if (!timeValue) return null;
  const parsed = parseTimeWithDate(baseDate, timeValue);
  return parsed;
}

function parseTimeWithDate(baseDate: Date, rawTime: string) {
  const text = rawTime.trim();
  if (!text) return null;

  const meridianMatch = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (meridianMatch) {
    const hours = Number(meridianMatch[1]);
    const minutes = Number(meridianMatch[2] ?? '0');
    const meridian = meridianMatch[3].toLowerCase();
    let normalizedHours = hours % 12;
    if (meridian === 'pm') {
      normalizedHours += 12;
    }
    return composeDate(baseDate, normalizedHours, minutes);
  }

  const twentyFourMatch = text.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/);
  if (twentyFourMatch) {
    const hours = Number(twentyFourMatch[1]);
    const minutes = Number(twentyFourMatch[2] ?? '0');
    const seconds = Number(twentyFourMatch[3] ?? '0');
    return composeDate(baseDate, hours, minutes, seconds);
  }

  const keyword = text.toLowerCase();
  const keywordMap: Record<string, number> = {
    morning: 9,
    afternoon: 13,
    evening: 18,
    night: 21,
    midday: 12,
    sunrise: 6,
    sunset: 19,
  };

  if (keyword in keywordMap) {
    return composeDate(baseDate, keywordMap[keyword], 0);
  }

  return null;
}

function composeDate(baseDate: Date, hours: number, minutes: number, seconds = 0) {
  const utc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    hours,
    minutes,
    seconds,
  );
  return new Date(utc);
}

function resolveDuration(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function buildDescription(parts: Array<string | undefined | null>) {
  const filtered = parts.filter((part): part is string => Boolean(part && part.trim()));
  return filtered.length ? filtered.join('\n\n') : undefined;
}

function formatAttachments(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const links = value
    .map(entry => {
      if (!entry) return null;
      const label = typeof entry.label === 'string' ? entry.label : 'Link';
      const url = typeof entry.url === 'string' ? entry.url : null;
      return url ? `${label}: ${url}` : null;
    })
    .filter((item): item is string => Boolean(item));
  return links.length ? `Links:\n${links.join('\n')}` : undefined;
}

function formatLocation(value: any) {
  if (!value || typeof value !== 'object') return undefined;
  const address = typeof value.address === 'string' ? value.address : undefined;
  const pieces: string[] = [];
  if (address) {
    pieces.push(address);
  }
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    pieces.push(`(${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)})`);
  }
  return pieces.length ? pieces.join(' ') : undefined;
}

function buildSegmentLocation(segment: Record<string, any>, metadata: any) {
  const from = selectFirstString(segment, metadata, ['origin', 'from', 'departure_location', 'start_location']);
  const to = selectFirstString(segment, metadata, ['destination', 'to', 'arrival_location', 'end_location']);
  if (from && to) {
    return `${from} → ${to}`;
  }
  return from || to || undefined;
}

function selectFirstString(primary: Record<string, any>, secondary: any, keys: string[], fallback?: string) {
  for (const key of keys) {
    const primaryValue = primary?.[key];
    if (typeof primaryValue === 'string' && primaryValue.trim()) {
      return primaryValue;
    }
    const secondaryValue = secondary?.[key];
    if (typeof secondaryValue === 'string' && secondaryValue.trim()) {
      return secondaryValue;
    }
  }
  return fallback;
}

function resolveDateTime(record: Record<string, any>, metadata: any, keys: string[]) {
  for (const key of keys) {
    const raw = record?.[key] ?? metadata?.[key];
    const parsed = parseDateValue(raw);
    if (parsed) return parsed;
  }

  const dateComponent = record?.date ?? metadata?.date;
  const timeComponent = record?.time ?? metadata?.time;
  if (dateComponent && timeComponent) {
    const base = parseDateOnly(dateComponent);
    if (base) {
      return parseTimeWithDate(base, timeComponent);
    }
  }

  return null;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

async function fetchOptionalRecords(client: SupabaseClient, table: string, tripId: number) {
  try {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('trip_id', tripId);

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`[planner] calendar export skipped ${table}`, error);
    return [] as Record<string, any>[];
  }
}

function renderCalendar(events: CalendarEvent[], trip: TripRecord) {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Urban Manual//Planner//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  if (trip.title) {
    lines.push(foldLine(`X-WR-CALNAME:${escapeICSText(trip.title)}`));
  }
  if (trip.destination) {
    lines.push(foldLine(`X-WR-CALDESC:${escapeICSText(`Itinerary for ${trip.destination}`)}`));
  }

  const nowStamp = formatDateTime(new Date());

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeICSText(event.uid)}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
      const end = event.end ?? addDays(event.start, 1);
      lines.push(`DTEND;VALUE=DATE:${formatDate(end)}`);
    } else {
      lines.push(`DTSTART:${formatDateTime(event.start)}`);
      const end = event.end ?? addMinutes(event.start, 60);
      lines.push(`DTEND:${formatDateTime(end)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeICSText(event.summary)}`));
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
    }
    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeICSText(event.location)}`));
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICSText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line: string) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const segments: string[] = [];
  let index = 0;
  while (index < line.length) {
    const chunk = line.slice(index, index === 0 ? index + maxLength : index + maxLength - 1);
    segments.push(index === 0 ? chunk : ` ${chunk}`);
    index += index === 0 ? maxLength : maxLength - 1;
  }

  return segments.join('\r\n');
}

function formatDateTime(date: Date) {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
    'T',
    date.getUTCHours().toString().padStart(2, '0'),
    date.getUTCMinutes().toString().padStart(2, '0'),
    date.getUTCSeconds().toString().padStart(2, '0'),
    'Z',
  ].join('');
}

function formatDate(date: Date) {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('');
}

function createCalendarResponse(body: string, title?: string | null) {
  const safeTitle = sanitizeFileName(title ?? 'itinerary');
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeTitle}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeFileName(name: string) {
  return (
    name
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toLowerCase() || 'itinerary'
  );
}
