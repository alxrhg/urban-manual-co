
'use client';

import { useState } from 'react';
import ReactMapGL, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Trip } from '@/types/trip';

interface MapProps {
  trip: Trip;
}

export function Map({ trip }: MapProps) {
  const [viewport, setViewport] = useState({
    latitude: 35.6895,
    longitude: 139.6917,
    zoom: 10,
  });

  const markers = trip.itinerary
    .filter((item) => item.destination)
    .map((item) => (
      <Marker
        key={item.id}
        latitude={item.destination!.latitude}
        longitude={item.destination!.longitude}
      >
        <div className="text-2xl">📍</div>
      </Marker>
    ));

  return (
    <ReactMapGL
      {...viewport}
      onMove={(evt) => setViewport(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
    >
      {markers}
    </ReactMapGL>
  );
}
