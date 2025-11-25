'use server';

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  createValidationError,
} from '@/lib/errors';

type AlertLevel = 'low' | 'moderate' | 'high' | 'extreme';

interface SafetyAlert {
  level: AlertLevel;
  title: string;
  description: string;
  source?: string;
  url?: string;
}

interface AlertProfile {
  keywords: string[];
  alerts: SafetyAlert[];
}

const GLOBAL_TIPS: SafetyAlert[] = [
  {
    level: 'low',
    title: 'Register with your embassy',
    description:
      'Share your travel plans with your country’s embassy or consulate so they can reach you during emergencies.',
    source: 'General travel advisory',
  },
  {
    level: 'low',
    title: 'Monitor official advisories',
    description:
      'Review the latest alerts from the U.S. State Department, UK FCDO, or your local authority before and during travel.',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
  },
];

const CONFLICT_ALERTS: AlertProfile[] = [
  {
    keywords: ['ukraine', 'kyiv', 'lviv', 'odesa', 'kharkiv'],
    alerts: [
      {
        level: 'extreme',
        title: 'Active conflict zone',
        description:
          'Russia’s invasion continues to create missile and drone threats nationwide. Commercial flights remain suspended and essential services may be disrupted.',
        source: 'UK FCDO',
      },
      {
        level: 'high',
        title: 'Critical infrastructure strikes',
        description:
          'Attacks on energy and transport infrastructure happen with little warning. Have backup power, cash, and evacuation plans.',
      },
    ],
  },
  {
    keywords: ['israel', 'tel aviv', 'jerusalem', 'haifa', 'gaza', 'west bank'],
    alerts: [
      {
        level: 'high',
        title: 'Rocket and drone alerts',
        description:
          'Intermittent rocket and drone fire triggers shelter sirens in central and southern Israel. Know the closest shelter and follow Home Front Command guidance.',
        source: 'Israel Home Front Command',
      },
      {
        level: 'moderate',
        title: 'Heightened tensions',
        description:
          'Security incidents and protests can escalate quickly, especially near Jerusalem’s Old City and checkpoints leading into the West Bank.',
      },
    ],
  },
  {
    keywords: ['lebanon', 'beirut', 'tripoli'],
    alerts: [
      {
        level: 'high',
        title: 'Border clashes',
        description:
          'Cross-border fire between Israel and Hezbollah continues to flare. Avoid the southern border region and monitor evacuation guidance.',
      },
    ],
  },
  {
    keywords: ['russia', 'moscow', 'saint petersburg'],
    alerts: [
      {
        level: 'high',
        title: 'Mobilization risk',
        description:
          'Foreign nationals with dual citizenship or military experience have reported questioning or conscription attempts. Carry proof of exit plans.',
      },
      {
        level: 'moderate',
        title: 'Flight disruptions',
        description:
          'Airspace restrictions and sanctions cause sudden schedule changes. Keep flexible onward-travel options.',
      },
    ],
  },
  {
    keywords: ['taiwan', 'taipei', 'kaohsiung', 'taichung'],
    alerts: [
      {
        level: 'moderate',
        title: 'Geopolitical tension',
        description:
          'Increased PLA drills occasionally disrupt air and maritime corridors. Stay informed about air defense identification zone (ADIZ) incursions.',
      },
    ],
  },
  {
    keywords: ['iran', 'tehran', 'shiraz'],
    alerts: [
      {
        level: 'high',
        title: 'Arbitrary detention risk',
        description:
          'Dual nationals and independent travelers have faced questioning or detention. Avoid photographing government or military facilities.',
      },
    ],
  },
];

function normalize(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function findAlerts(destination: string): SafetyAlert[] {
  for (const profile of CONFLICT_ALERTS) {
    if (profile.keywords.some((keyword) => destination.includes(keyword))) {
      return profile.alerts;
    }
  }
  return [];
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const destination = normalize(body?.destination);
  const countryCode = normalize(body?.countryCode);

  if (!destination && !countryCode) {
    throw createValidationError('destination or countryCode is required');
  }

  const alerts =
    findAlerts(destination) ||
    findAlerts(countryCode) ||
    findAlerts(`${destination} ${countryCode}`);

  const responseAlerts = [...GLOBAL_TIPS];

  if (alerts.length > 0) {
    responseAlerts.unshift(...alerts);
  }

  return NextResponse.json({ alerts: responseAlerts });
});
