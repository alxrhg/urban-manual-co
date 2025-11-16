export interface TripDayHotel {
  day: number;
  hotel: string | null;
}

export interface TripDescriptionMeta {
  notes: string | null;
  dayHotels: TripDayHotel[];
}

const DESCRIPTION_TYPE = 'trip-meta';
const DESCRIPTION_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cleanHotelEntry = (entry: Partial<TripDayHotel>, index: number): TripDayHotel => ({
  day: Number.isFinite(entry?.day) && entry!.day! > 0 ? Number(entry!.day) : index + 1,
  hotel: typeof entry?.hotel === 'string' && entry!.hotel!.trim().length
    ? entry!.hotel!.trim()
    : null,
});

export const formatDayHotelSummary = (dayHotels: TripDayHotel[]): string | null => {
  const filtered = dayHotels.filter((entry) => entry.hotel);
  if (filtered.length === 0) return null;

  if (filtered.length === 1 && filtered[0].hotel) {
    return filtered[0].hotel;
  }

  const segments = filtered
    .slice(0, 3)
    .map((entry) => `Day ${entry.day}: ${entry.hotel}`);

  if (filtered.length > 3) {
    segments.push(`+${filtered.length - 3} more`);
  }

  return segments.join(' · ');
};

export const parseTripDescription = (raw: string | null): TripDescriptionMeta => {
  if (!raw) {
    return { notes: null, dayHotels: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (isRecord(parsed)) {
      const type = typeof parsed.type === 'string' ? parsed.type : null;
      const version = typeof parsed.version === 'number' ? parsed.version : null;
      const isStructured =
        (type === DESCRIPTION_TYPE || type === 'day-hotels') &&
        version !== null &&
        Array.isArray(parsed.dayHotels);

      if (isStructured) {
        const dayHotels = (parsed.dayHotels as Array<Partial<TripDayHotel>>)
          .map(cleanHotelEntry)
          .filter((entry) => entry.day > 0);

        const notes =
          typeof parsed.notes === 'string' && parsed.notes.trim().length
            ? parsed.notes.trim()
            : null;

        return {
          notes,
          dayHotels,
        };
      }
    }
  } catch {
    // Not JSON - fall back to legacy behavior
  }

  const legacyText = raw.trim();
  if (!legacyText) {
    return { notes: null, dayHotels: [] };
  }

  return {
    notes: legacyText,
    dayHotels: [{ day: 1, hotel: legacyText }],
  };
};

export const serializeTripDescription = (meta: TripDescriptionMeta): string | null => {
  const notes = meta.notes?.trim() || null;
  const cleanedHotels = meta.dayHotels
    ?.map((entry, index) => cleanHotelEntry(entry, index))
    .filter((entry) => entry.hotel);

  if (!cleanedHotels || cleanedHotels.length === 0) {
    return notes;
  }

  return JSON.stringify({
    type: DESCRIPTION_TYPE,
    version: DESCRIPTION_VERSION,
    notes,
    dayHotels: cleanedHotels,
  });
};

export const getHotelForDay = (dayHotels: TripDayHotel[], dayNumber: number): string | null => {
  const match = dayHotels.find((entry) => entry.day === dayNumber);
  return match?.hotel || null;
};
