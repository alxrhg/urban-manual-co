# Interactive Map View

## Overview

The `InteractiveMapView` component provides a fully interactive Mapbox-based map with custom markers, popups, and smooth animations.

## Features

- ✅ **Custom Markers**: Category-based emoji icons
- ✅ **Interactive Popups**: Hover to see destination details
- ✅ **Click Handling**: Click markers to open destination drawer
- ✅ **Auto-fit Bounds**: Automatically zooms to show all destinations
- ✅ **Selected State**: Highlights selected destination
- ✅ **Dark Mode**: Supports light/dark map styles
- ✅ **Responsive**: Works on mobile and desktop
- ✅ **Smooth Animations**: Fly-to animations when selecting destinations

## Usage

### Basic Usage

```tsx
import { InteractiveMapView } from '@/components/maps/InteractiveMapView';

<InteractiveMapView
  destinations={destinations}
  onMarkerClick={(destination) => console.log(destination)}
/>
```

### With Selection

```tsx
const [selected, setSelected] = useState<Destination | null>(null);

<InteractiveMapView
  destinations={destinations}
  selectedDestination={selected}
  onMarkerClick={setSelected}
  darkMode={isDark}
/>
```

### Homepage Integration

```tsx
import { MapInterface } from '@/components/homepage/MapInterface';

<MapInterface
  destinations={destinations}
  selectedDestination={selected}
  onMarkerClick={handleMarkerClick}
  darkMode={theme === 'dark'}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `destinations` | `Destination[]` | `[]` | Array of destinations to display |
| `selectedDestination` | `Destination \| null` | `null` | Currently selected destination |
| `onMarkerClick` | `(dest: Destination) => void` | - | Callback when marker is clicked |
| `center` | `{ lat: number; lng: number }` | Tokyo | Initial map center |
| `zoom` | `number` | `12` | Initial zoom level |
| `className` | `string` | `'w-full h-full'` | Container class |
| `darkMode` | `boolean` | `false` | Use dark map style |

## Environment Variables

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token-here
```

Get your token from: https://account.mapbox.com/access-tokens/

## Category Icons

The map uses emoji icons based on destination category:

- 🍽️ Restaurant
- ☕ Cafe
- 🍸 Bar
- 🏨 Hotel
- 🛍️ Shop
- 🏛️ Museum
- 🌳 Park
- 🎭 Attraction
- 📍 Default

## Customization

### Custom Marker Colors

Edit the `createMarkerElement` function in `InteractiveMapView.tsx`:

```tsx
const bgColor = isSelected ? '#000' : '#fff';
const borderColor = isSelected ? '#fff' : '#e5e7eb';
```

### Map Styles

Available Mapbox styles:
- `mapbox://styles/mapbox/light-v11` (default light)
- `mapbox://styles/mapbox/dark-v11` (default dark)
- `mapbox://styles/mapbox/streets-v12`
- `mapbox://styles/mapbox/outdoors-v12`
- `mapbox://styles/mapbox/satellite-v9`

## Performance

- **Lazy Loading**: Component is dynamically imported to avoid SSR issues
- **Marker Reuse**: Markers are efficiently updated, not recreated
- **Bounds Fitting**: Automatically adjusts viewport to show all markers
- **Popup Caching**: Popups are created once and reused

## Future Enhancements

- [ ] Marker clustering for dense areas
- [ ] Custom map styles
- [ ] Geolocation "Near Me" button
- [ ] Route drawing between destinations
- [ ] Heatmap layer for popular areas
- [ ] 3D buildings
- [ ] Custom marker images (not just emojis)

## Troubleshooting

### Map not loading

1. Check that `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set
2. Verify token is valid at https://account.mapbox.com/
3. Check browser console for errors

### Markers not appearing

1. Ensure destinations have `latitude` and `longitude` fields
2. Check that coordinates are valid numbers
3. Verify destinations array is not empty

### Dark mode not working

1. Pass `darkMode={true}` prop
2. Check that map has loaded (`mapLoaded` state)
3. Verify Mapbox style URLs are correct
