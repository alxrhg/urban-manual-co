'use server';

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

const STATUS_MAP = [
  { label: 'scheduled', text: 'On Time' },
  { label: 'boarding', text: 'Boarding Soon' },
  { label: 'departed', text: 'Departed' },
  { label: 'in_flight', text: 'En Route' },
  { label: 'landed', text: 'Landed' },
  { label: 'delayed', text: 'Delayed' },
];

function mockStatus(seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const status = STATUS_MAP[hash % STATUS_MAP.length];
  const delay = status.label === 'delayed' ? ((hash % 45) + 15) : 0;

  return {
    status: status.label,
    statusText: status.text,
    delay,
    gate: `C${(hash % 12) + 1}`,
    terminal: String((hash % 3) + 1),
    actualDeparture: delay > 0 ? undefined : undefined,
  };
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const airline = (body?.airline || '').trim();
  const flightNumber = (body?.flightNumber || '').trim();
  const date = (body?.date || '').trim();

  if (!airline || !flightNumber) {
    throw createValidationError('airline and flightNumber are required');
  }

  const mock = mockStatus(`${airline}-${flightNumber}-${date}`);

  const response = {
    status: mock.status,
    statusText: mock.statusText,
    delay: mock.delay,
    gate: mock.gate,
    terminal: mock.terminal,
    actualDeparture: mock.delay > 0 ? undefined : undefined,
    actualArrival: undefined,
  };

  return NextResponse.json(response);
});
