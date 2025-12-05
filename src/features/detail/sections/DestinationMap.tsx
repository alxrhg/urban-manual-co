'use client';

import dynamic from 'next/dynamic';

const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  )
});

interface DestinationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

export function DestinationMap({ latitude, longitude, className = '' }: DestinationMapProps) {
  if (!latitude || !longitude) return null;

  return (
    <div className={`w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 ${className}`}>
      <GoogleStaticMap
        center={{ lat: latitude, lng: longitude }}
        zoom={15}
        height="160px"
        className="rounded-xl"
        showPin={true}
      />
    </div>
  );
}
