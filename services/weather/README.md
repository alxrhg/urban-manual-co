# Weather Intelligence Integration (Phase 6)

Weather-aware destination recommendations that adjust based on current conditions and seasonal preferences.

## Overview

Integrates real-time weather data to:
- **Weather-Based Filtering**: Adjust recommendations based on current conditions
- **Seasonal Preferences**: Track optimal seasons for each destination
- **Weather Alerts**: Warn users about poor conditions
- **Indoor Alternatives**: Suggest alternatives in bad weather
- **Score Adjustment**: Boost/penalize scores based on weather appropriateness

## Quick Start

### 1. Configure OpenWeatherMap API Key

```env
OPENWEATHERMAP_API_KEY=your_api_key
```

Get API key from: https://openweathermap.org/api

### 2. Run Database Migration

```sql
-- Execute: migrations/014_weather_intelligence.sql
```

### 3. Use Weather-Aware Recommendations

```typescript
import { useWeatherRecommendations } from '@/hooks/useWeather'

function DiscoveryPage() {
  const { recommendations, isLoading } = useWeatherRecommendations(
    'Paris',
    20,  // limit
    0.2  // weather weight (20%)
  )

  return <div>{/* Render recommendations */}</div>
}
```

## Workflow

1. **Fetch Weather**: Get current conditions from OpenWeatherMap
2. **Cache Data**: Store in database for 1 hour
3. **Calculate Scores**: Match weather with destination preferences
4. **Adjust Recommendations**: Combine weather (20%) + taste (80%)
5. **Return Results**: Sorted by final score

## Weather Scoring

### Score Calculation

```typescript
score = 0.7 // Start neutral

// Temperature check
if (temp < ideal_min) score -= 0.2
if (temp > ideal_max) score -= 0.2

// Condition check
if (ideal_conditions.includes(condition)) score += 0.2
if (avoid_conditions.includes(condition)) score -= 0.3

// Special cases
if (requires_good_visibility && foggy) score -= 0.2
if (heat_sensitive && temp > 30) score -= 0.2
if (cold_sensitive && temp < 10) score -= 0.3

final_score = clamp(score, 0, 1)
```

### Recommendation Adjustment

```typescript
// Combined score
final_score = taste_score * 0.8 + weather_score * 0.2

// Or with custom weight
final_score = taste_score * (1 - weatherWeight) + weather_score * weatherWeight
```

## API Endpoints

### Get Current Weather

```http
GET /api/weather?city=Paris&country=FR
```

**Response:**
```json
{
  "success": true,
  "weather": {
    "city": "Paris",
    "country": "FR",
    "temperature": 18.5,
    "feels_like": 17.2,
    "weather_condition": "partly_cloudy",
    "weather_description": "partly cloudy",
    "humidity": 65,
    "wind_speed": 3.5,
    "emoji": "⛅",
    "fetched_at": "2025-01-15T10:00:00Z",
    "expires_at": "2025-01-15T11:00:00Z"
  }
}
```

### Get Weather-Aware Recommendations

```http
GET /api/weather/recommendations?user_id=uuid&city=Paris&limit=20&weather_weight=0.2
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "recommendations": [
    {
      "destination_id": 123,
      "overall_score": 0.85,
      "weather_score": 0.92,
      "weather_boost": 0.22,
      "weather_reason": "Perfect weather",
      "final_score": 0.864
    }
  ],
  "weather_weight": 0.2
}
```

## React Hooks

### useWeather

```typescript
const { weather, isLoading, error } = useWeather('Paris', 'FR')
```

### useWeatherRecommendations

```typescript
const {
  recommendations,
  isLoading,
  error,
  refresh
} = useWeatherRecommendations('Paris', 20, 0.2)
```

### useWeatherEmoji

```typescript
const emoji = useWeatherEmoji('sunny') // Returns '☀️'
```

### useTemperatureFormat

```typescript
const temp = useTemperatureFormat(18.5, 'C') // Returns '19°C'
const tempF = useTemperatureFormat(18.5, 'F') // Returns '65°F'
```

## Destination Weather Preferences

Set weather preferences for destinations:

```sql
INSERT INTO destination_weather_preferences (
  destination_id,
  ideal_temperature_min,
  ideal_temperature_max,
  ideal_weather_conditions,
  avoid_weather_conditions,
  weather_dependent,
  requires_good_visibility
) VALUES (
  123,
  15,
  25,
  ARRAY['sunny', 'partly_cloudy'],
  ARRAY['rain', 'storm'],
  true,
  true
);
```

## Weather Conditions

Standardized conditions:
- `sunny` ☀️
- `cloudy` ☁️
- `partly_cloudy` ⛅
- `rain` 🌧️
- `storm` ⛈️
- `snow` ❄️
- `foggy` 🌫️
- `windy` 💨
- `dusty` 🌪️

## Cost Estimation

### OpenWeatherMap API

- **Free Tier**: 1,000 calls/day, 60 calls/min
- **Cost**: Free for basic usage
- **Cache**: 1 hour reduces calls significantly

### Example Usage

- 1,000 unique users/day
- 10 cities
- 1 call per city per hour = 24 calls/day per city
- Total: 240 calls/day (well within free tier)

## Production Checklist

- [ ] Add OPENWEATHERMAP_API_KEY to environment
- [ ] Run database migration
- [ ] Set weather preferences for top destinations
- [ ] Test weather scoring algorithm
- [ ] Monitor API usage
- [ ] Set up weather data caching
- [ ] Handle API failures gracefully

## Tips

1. **Cache Aggressively**: Weather doesn't change frequently (1 hour cache is good)
2. **Fallback Gracefully**: If weather API fails, use neutral scores
3. **Custom Weights**: Adjust weather_weight based on user preference
4. **Seasonal Data**: Enrich with historical seasonal preferences
5. **Location Detection**: Auto-detect user city for better UX

## License

Proprietary - Urban Manual
