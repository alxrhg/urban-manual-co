/**
 * Weather Service
 * Provides weather forecasts for trip destinations
 *
 * Uses OpenWeatherMap API if available, falls back to historical averages
 */

import type { TripWeatherForecast } from '@/types/trip';

/**
 * Historical average temperatures (Fahrenheit) by city and month
 * Format: city -> [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 */
const HISTORICAL_TEMPS: Record<string, { high: number[]; low: number[] }> = {
  // US Cities
  'new york': {
    high: [39, 42, 50, 61, 72, 80, 85, 84, 76, 65, 54, 43],
    low: [26, 28, 35, 44, 54, 63, 68, 67, 60, 49, 41, 32],
  },
  miami: {
    high: [76, 78, 80, 83, 87, 89, 91, 91, 89, 86, 82, 78],
    low: [60, 62, 65, 68, 73, 76, 77, 77, 76, 73, 68, 63],
  },
  'los angeles': {
    high: [68, 68, 69, 71, 72, 76, 82, 84, 83, 78, 72, 67],
    low: [49, 50, 52, 54, 58, 61, 65, 66, 64, 59, 52, 48],
  },
  'san francisco': {
    high: [57, 60, 62, 64, 66, 69, 68, 69, 71, 69, 63, 57],
    low: [46, 48, 49, 50, 52, 54, 55, 56, 56, 54, 50, 46],
  },

  // Europe
  paris: {
    high: [44, 46, 53, 59, 66, 73, 77, 77, 70, 60, 50, 45],
    low: [34, 34, 38, 42, 49, 54, 58, 58, 53, 46, 40, 36],
  },
  london: {
    high: [46, 47, 52, 57, 63, 69, 73, 72, 66, 58, 51, 46],
    low: [36, 36, 38, 41, 47, 53, 57, 56, 52, 46, 41, 38],
  },
  rome: {
    high: [54, 56, 61, 67, 75, 83, 89, 89, 82, 72, 62, 55],
    low: [37, 38, 42, 47, 54, 61, 66, 67, 61, 53, 45, 39],
  },
  barcelona: {
    high: [57, 58, 62, 66, 72, 79, 84, 84, 79, 71, 63, 57],
    low: [42, 43, 47, 51, 58, 65, 70, 70, 66, 58, 50, 44],
  },

  // Asia
  tokyo: {
    high: [50, 52, 58, 67, 74, 79, 84, 87, 81, 71, 62, 53],
    low: [34, 35, 41, 50, 59, 67, 74, 75, 69, 58, 47, 38],
  },
  bangkok: {
    high: [91, 93, 95, 96, 93, 91, 90, 89, 89, 89, 89, 89],
    low: [71, 74, 77, 79, 78, 77, 77, 77, 76, 76, 74, 71],
  },
  singapore: {
    high: [86, 88, 89, 89, 89, 88, 88, 88, 88, 88, 87, 86],
    low: [75, 75, 76, 76, 77, 77, 76, 76, 76, 76, 76, 75],
  },

  // Caribbean
  'san juan': {
    high: [83, 83, 84, 86, 87, 89, 89, 90, 89, 88, 86, 84],
    low: [72, 72, 72, 74, 76, 78, 78, 78, 78, 77, 75, 73],
  },

  // Middle East
  dubai: {
    high: [75, 77, 83, 91, 100, 104, 106, 106, 102, 95, 86, 78],
    low: [57, 59, 63, 70, 78, 82, 86, 87, 82, 75, 67, 60],
  },
  istanbul: {
    high: [47, 48, 53, 62, 71, 80, 84, 85, 78, 69, 59, 51],
    low: [36, 36, 39, 46, 54, 62, 68, 68, 62, 55, 47, 40],
  },

  // Mexico
  'mexico city': {
    high: [70, 73, 78, 79, 79, 76, 73, 73, 72, 71, 70, 69],
    low: [43, 45, 49, 52, 54, 55, 54, 54, 54, 51, 47, 44],
  },
};

/**
 * Weather conditions by city and month
 */
const WEATHER_CONDITIONS: Record<string, string[]> = {
  // Sunny/Clear
  'los angeles': ['Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny'],
  miami: ['Sunny', 'Sunny', 'Sunny', 'Sunny', 'Partly Cloudy', 'Thunderstorms', 'Thunderstorms', 'Thunderstorms', 'Thunderstorms', 'Partly Cloudy', 'Sunny', 'Sunny'],
  dubai: ['Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Sunny'],

  // Variable
  'new york': ['Cloudy', 'Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Sunny', 'Sunny', 'Sunny', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Cloudy'],
  paris: ['Cloudy', 'Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Sunny', 'Sunny', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Cloudy', 'Cloudy'],
  london: ['Cloudy', 'Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Cloudy', 'Cloudy', 'Cloudy'],

  // Tropical
  bangkok: ['Sunny', 'Sunny', 'Sunny', 'Sunny', 'Thunderstorms', 'Rainy', 'Rainy', 'Rainy', 'Rainy', 'Thunderstorms', 'Sunny', 'Sunny'],
  'san juan': ['Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Thunderstorms', 'Thunderstorms', 'Partly Cloudy', 'Thunderstorms', 'Thunderstorms', 'Thunderstorms', 'Partly Cloudy', 'Partly Cloudy'],

  // Temperate
  tokyo: ['Sunny', 'Sunny', 'Partly Cloudy', 'Partly Cloudy', 'Partly Cloudy', 'Rainy', 'Rainy', 'Sunny', 'Partly Cloudy', 'Partly Cloudy', 'Sunny', 'Sunny'],
};

export class WeatherService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
  }

  /**
   * Get weather forecast for a destination and date
   */
  async getWeatherForecast(
    destination: string,
    date: string,
    unit: 'F' | 'C' = 'F'
  ): Promise<TripWeatherForecast> {
    // Try live API first
    if (this.apiKey) {
      try {
        const forecast = await this.fetchLiveWeather(destination, date, unit);
        if (forecast) return forecast;
      } catch (error) {
        console.warn('Live weather fetch failed, using historical data:', error);
      }
    }

    // Fall back to historical averages
    return this.getHistoricalForecast(destination, date, unit);
  }

  /**
   * Get weather forecast for a date range
   */
  async getWeatherForDateRange(
    destination: string,
    startDate: string,
    endDate: string,
    unit: 'F' | 'C' = 'F'
  ): Promise<TripWeatherForecast> {
    // For simplicity, get the average for the date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startForecast = await this.getWeatherForecast(destination, startDate, unit);
    const endForecast = await this.getWeatherForecast(destination, endDate, unit);

    // Return averaged values
    return {
      tempHigh: Math.round((startForecast.tempHigh + endForecast.tempHigh) / 2),
      tempLow: Math.round((startForecast.tempLow + endForecast.tempLow) / 2),
      tempUnit: unit,
      condition: startForecast.condition, // Use start date condition
      precipitation: Math.round((startForecast.precipitation + endForecast.precipitation) / 2),
    };
  }

  /**
   * Fetch live weather from OpenWeatherMap API
   */
  private async fetchLiveWeather(
    destination: string,
    date: string,
    unit: 'F' | 'C'
  ): Promise<TripWeatherForecast | null> {
    if (!this.apiKey) return null;

    try {
      const units = unit === 'F' ? 'imperial' : 'metric';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)}&appid=${this.apiKey}&units=${units}`
      );

      if (!response.ok) return null;

      const data = await response.json();

      return {
        tempHigh: Math.round(data.main.temp_max),
        tempLow: Math.round(data.main.temp_min),
        tempUnit: unit,
        condition: data.weather[0]?.main || 'Unknown',
        precipitation: data.rain?.['1h'] || 0,
        humidity: data.main.humidity,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get forecast from historical averages
   */
  private getHistoricalForecast(
    destination: string,
    date: string,
    unit: 'F' | 'C'
  ): TripWeatherForecast {
    const normalizedDest = destination.toLowerCase().trim();
    const dateObj = new Date(date);
    const month = dateObj.getMonth(); // 0-indexed

    // Find matching city data
    let temps = HISTORICAL_TEMPS[normalizedDest];
    let conditions = WEATHER_CONDITIONS[normalizedDest];

    // Try partial match if exact match not found
    if (!temps) {
      const matchingKey = Object.keys(HISTORICAL_TEMPS).find(
        (key) => normalizedDest.includes(key) || key.includes(normalizedDest)
      );
      if (matchingKey) {
        temps = HISTORICAL_TEMPS[matchingKey];
        conditions = WEATHER_CONDITIONS[matchingKey];
      }
    }

    // Default values if no data found
    if (!temps) {
      const defaultTemps = this.getDefaultTemps(month);
      return {
        tempHigh: unit === 'C' ? this.fahrenheitToCelsius(defaultTemps.high) : defaultTemps.high,
        tempLow: unit === 'C' ? this.fahrenheitToCelsius(defaultTemps.low) : defaultTemps.low,
        tempUnit: unit,
        condition: 'Variable',
        precipitation: 20,
      };
    }

    let high = temps.high[month];
    let low = temps.low[month];

    if (unit === 'C') {
      high = this.fahrenheitToCelsius(high);
      low = this.fahrenheitToCelsius(low);
    }

    return {
      tempHigh: high,
      tempLow: low,
      tempUnit: unit,
      condition: conditions?.[month] || 'Variable',
      precipitation: this.getAveragePrecipitation(normalizedDest, month),
    };
  }

  /**
   * Get default temperatures for unknown destinations
   */
  private getDefaultTemps(month: number): { high: number; low: number } {
    // Assume temperate climate
    const temps = [
      { high: 45, low: 30 }, // Jan
      { high: 48, low: 32 }, // Feb
      { high: 55, low: 38 }, // Mar
      { high: 65, low: 45 }, // Apr
      { high: 75, low: 55 }, // May
      { high: 82, low: 62 }, // Jun
      { high: 86, low: 68 }, // Jul
      { high: 85, low: 67 }, // Aug
      { high: 78, low: 60 }, // Sep
      { high: 68, low: 50 }, // Oct
      { high: 55, low: 40 }, // Nov
      { high: 47, low: 33 }, // Dec
    ];
    return temps[month];
  }

  /**
   * Get average precipitation percentage for a destination/month
   */
  private getAveragePrecipitation(destination: string, month: number): number {
    // Simplified precipitation data
    const rainyDestinations = ['london', 'tokyo', 'bangkok', 'singapore', 'san juan'];
    const dryDestinations = ['los angeles', 'dubai', 'phoenix'];

    if (dryDestinations.some((d) => destination.includes(d))) {
      return [5, 5, 10, 5, 5, 0, 0, 5, 5, 5, 5, 5][month];
    }

    if (rainyDestinations.some((d) => destination.includes(d))) {
      if (destination.includes('bangkok') || destination.includes('tokyo')) {
        // Monsoon/rainy season
        return [10, 15, 20, 30, 50, 70, 60, 60, 50, 40, 25, 15][month];
      }
      return [40, 35, 35, 30, 25, 20, 20, 20, 25, 35, 40, 45][month];
    }

    // Default moderate precipitation
    return [25, 25, 30, 30, 25, 20, 15, 15, 20, 25, 30, 30][month];
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  private fahrenheitToCelsius(f: number): number {
    return Math.round((f - 32) * (5 / 9));
  }

  /**
   * Format temperature range for display
   */
  formatTemperatureRange(forecast: TripWeatherForecast): string {
    return `${forecast.tempLow}°${forecast.tempUnit}-${forecast.tempHigh}°${forecast.tempUnit}`;
  }
}

export const weatherService = new WeatherService();
