'use client';

import { memo } from 'react';

interface ConnectorLineProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
}

/**
 * ConnectorLine - Vertical dotted line running down the timeline
 */
function ConnectorLineComponent({
  startHour,
  endHour,
  minutesToPixels,
}: ConnectorLineProps) {
  const startTop = minutesToPixels(startHour * 60);
  const endTop = minutesToPixels(endHour * 60);
  const height = endTop - startTop;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: startTop,
        left: '3.5rem', // Align with where cards start
        height,
        width: '1px',
      }}
    >
      <div
        className="w-full h-full"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgb(209 213 219) 50%, transparent 50%)',
          backgroundSize: '1px 8px',
        }}
      />
    </div>
  );
}

export const ConnectorLine = memo(ConnectorLineComponent);
