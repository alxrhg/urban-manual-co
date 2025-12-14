'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Info, ExternalLink, Loader2 } from 'lucide-react';

interface SafetyAlert {
  level: 'low' | 'moderate' | 'high' | 'extreme';
  title: string;
  description: string;
  source?: string;
  url?: string;
}

interface TripSafetyAlertsProps {
  destination: string | null;
  countryCode?: string;
}

// Safety info database (would be fetched from API in production)
const SAFETY_INFO: Record<string, SafetyAlert[]> = {
  // Common travel advisories by country
  default: [],
};

export default function TripSafetyAlerts({ destination, countryCode }: TripSafetyAlertsProps) {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchSafetyInfo = async () => {
      if (!destination) {
        setLoading(false);
        return;
      }

      try {
        // Try to fetch from travel advisory API
        // Using a mock implementation since most APIs require keys
        const response = await fetch('/api/travel-safety', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination, countryCode }),
        });

        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts || []);
        } else {
          // Fallback: check for common safety tips
          const tips = getGeneralSafetyTips(destination);
          setAlerts(tips);
        }
      } catch (err) {
        // Use general tips on error
        const tips = getGeneralSafetyTips(destination);
        setAlerts(tips);
      } finally {
        setLoading(false);
      }
    };

    fetchSafetyInfo();
  }, [destination, countryCode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-stone-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking safety info...</span>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  const highPriorityAlerts = alerts.filter((a) => a.level === 'high' || a.level === 'extreme');
  const otherAlerts = alerts.filter((a) => a.level !== 'high' && a.level !== 'extreme');

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs w-full"
      >
        <Shield className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-stone-700 dark:text-stone-300">Travel Safety</span>
        {highPriorityAlerts.length > 0 && (
          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-[10px] font-medium">
            {highPriorityAlerts.length} alert{highPriorityAlerts.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-stone-400 ml-auto">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-2 pl-6">
          {/* High priority alerts first */}
          {highPriorityAlerts.map((alert, i) => (
            <AlertCard key={`high-${i}`} alert={alert} />
          ))}

          {/* Other alerts */}
          {otherAlerts.map((alert, i) => (
            <AlertCard key={`other-${i}`} alert={alert} />
          ))}

          {/* Link to official sources */}
          <a
            href={`https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600"
          >
            <ExternalLink className="w-3 h-3" />
            View official travel advisories
          </a>
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: SafetyAlert }) {
  const levelColors = {
    low: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    moderate: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
    high: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
    extreme: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
  };

  const levelIcons = {
    low: <Info className="w-3 h-3 text-green-500" />,
    moderate: <Info className="w-3 h-3 text-yellow-500" />,
    high: <AlertTriangle className="w-3 h-3 text-orange-500" />,
    extreme: <AlertTriangle className="w-3 h-3 text-red-500" />,
  };

  return (
    <div className={`p-2 rounded-lg border ${levelColors[alert.level]}`}>
      <div className="flex items-start gap-2">
        {levelIcons[alert.level]}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{alert.title}</p>
          <p className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">
            {alert.description}
          </p>
          {alert.source && (
            <p className="text-[10px] text-stone-400 mt-1">Source: {alert.source}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getGeneralSafetyTips(destination: string): SafetyAlert[] {
  // General safety tips applicable to most destinations
  return [
    {
      level: 'low',
      title: 'Keep copies of documents',
      description: 'Store digital copies of passport, ID, and travel insurance in a secure cloud location.',
      source: 'General advice',
    },
    {
      level: 'low',
      title: 'Register with embassy',
      description: 'Register your trip with your country\'s embassy for emergency assistance.',
      source: 'General advice',
    },
    {
      level: 'low',
      title: 'Check local emergency numbers',
      description: `Research emergency contact numbers for ${destination || 'your destination'} before arrival.`,
      source: 'General advice',
    },
  ];
}
