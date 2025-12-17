'use client';

import { cn } from '@/lib/utils';

const gradientClasses = [
  'from-blue-500/90 to-indigo-500/90',
  'from-rose-500/90 to-orange-500/90',
  'from-emerald-500/90 to-lime-500/90',
  'from-cyan-500/90 to-sky-500/90',
  'from-fuchsia-500/90 to-purple-500/90',
];

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function resolveBadgeCode(code?: string, airline?: string): string {
  if (code) {
    return code.replace(/\s+/g, '').slice(0, 3).toUpperCase();
  }
  if (airline) {
    const words = airline.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return airline.trim().slice(0, 3).toUpperCase();
  }
  return 'FL';
}

interface AirlineLogoBadgeProps {
  code?: string;
  airline?: string;
  className?: string;
}

export default function AirlineLogoBadge({
  code,
  airline,
  className,
}: AirlineLogoBadgeProps) {
  const badgeCode = resolveBadgeCode(code, airline);
  const gradient = gradientClasses[Math.abs(hashText(badgeCode)) % gradientClasses.length];

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br text-white shadow-sm',
        gradient,
        className
      )}
    >
      <span className="text-sm font-semibold tracking-[0.35em]">{badgeCode}</span>
    </div>
  );
}
