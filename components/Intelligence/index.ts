/**
 * Contextual Intelligence Modules
 *
 * Smart widgets that provide actionable information for trip planning:
 * - WeatherWidget: Visual weather forecast with rain alerts
 * - SmartPacking: Auto-generated packing list based on weather & activities
 */

export { default as WeatherWidget, RainAlertBadge } from './WeatherWidget';
export {
  default as SmartPacking,
  analyzeItineraryForPacking,
  convertWeatherForecast,
} from './SmartPacking';
