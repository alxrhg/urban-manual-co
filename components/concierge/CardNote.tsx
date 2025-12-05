'use client';

interface CardNoteProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * CardNote - Inline card annotation for important context
 *
 * Examples:
 * - "Reservations needed · 2 weeks"
 * - "In your trip · Day 3"
 * - "Outdoor seating · your preference"
 */
export function CardNote({ children, className = '' }: CardNoteProps) {
  return (
    <span className={`block text-xs text-gray-400 dark:text-gray-500 mt-1 ${className}`}>
      {children}
    </span>
  );
}

interface CardNoteListProps {
  notes: string[];
  className?: string;
  maxNotes?: number;
}

/**
 * CardNoteList - Render multiple card notes
 */
export function CardNoteList({ notes, className = '', maxNotes = 2 }: CardNoteListProps) {
  if (!notes || notes.length === 0) return null;

  const displayNotes = notes.slice(0, maxNotes);

  return (
    <div className={className}>
      {displayNotes.map((note, index) => (
        <CardNote key={index}>{note}</CardNote>
      ))}
    </div>
  );
}

interface ReservationNoteProps {
  required: boolean;
  bookingWindow?: string;
}

/**
 * ReservationNote - Specific note for reservation requirements
 */
export function ReservationNote({ required, bookingWindow = '2 weeks' }: ReservationNoteProps) {
  if (!required) return null;

  return (
    <CardNote>
      Reservations needed · {bookingWindow} ahead
    </CardNote>
  );
}

interface TripNoteProps {
  tripName?: string;
  tripDate?: string;
  dayNumber?: number;
}

/**
 * TripNote - Note showing destination is in user's trip
 */
export function TripNote({ tripName, tripDate, dayNumber }: TripNoteProps) {
  let text = 'In your trip';

  if (dayNumber !== undefined) {
    text += ` · Day ${dayNumber}`;
  } else if (tripDate) {
    text += ` · ${tripDate}`;
  }

  return <CardNote>{text}</CardNote>;
}

interface PreferenceNoteProps {
  preference: string;
}

/**
 * PreferenceNote - Note showing why this matches user preferences
 */
export function PreferenceNote({ preference }: PreferenceNoteProps) {
  return (
    <CardNote>
      {preference} · your preference
    </CardNote>
  );
}
