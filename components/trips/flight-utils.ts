'use client';

export interface FlightLabelInput {
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;
}

export function formatFlightIdentifier({
  airline,
  airlineCode,
  flightNumber,
}: FlightLabelInput): string {
  const normalizedNumber = flightNumber?.trim().toUpperCase();
  const normalizedCode = airlineCode?.trim().toUpperCase();

  if (normalizedCode && normalizedNumber) {
    const strippedNumber = normalizedNumber.replace(new RegExp(`^${normalizedCode}`), '');
    const suffix = strippedNumber || normalizedNumber;
    return normalizedNumber.startsWith(normalizedCode)
      ? normalizedNumber
      : `${normalizedCode}${suffix}`;
  }

  if (normalizedNumber) return normalizedNumber;
  if (normalizedCode) return normalizedCode;
  return airline || 'Flight';
}
