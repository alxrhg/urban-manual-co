/**
 * Trip formatting utilities
 *
 * Consistent time, date, duration, distance, and currency formatting
 * that respects trip settings (12h vs 24h, mi vs km, etc.)
 */

export type TimeFormat = '12h' | '24h';
export type DistanceUnit = 'mi' | 'km';
export type TemperatureUnit = 'F' | 'C';
export type DateStyle = 'short' | 'medium' | 'long';
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

/**
 * Format time based on trip settings
 * @param time - Time string in 24h format (e.g., "14:30")
 * @param format - '12h' or '24h'
 * @returns Formatted time string (e.g., "2:30 PM" or "14:30")
 *
 * @example
 * formatTime("14:30", "12h") // "2:30 PM"
 * formatTime("14:30", "24h") // "14:30"
 * formatTime("09:00", "12h") // "9:00 AM"
 * formatTime("00:00", "12h") // "12:00 AM"
 */
export function formatTime(time: string, format: TimeFormat): string {
  if (!time) return '';

  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';

  if (isNaN(hours)) return time;

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // 12h format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(210) // "3h 30m"
 * formatDuration(45)  // "45m"
 * formatDuration(90)  // "1h 30m"
 * formatDuration(60)  // "1h"
 * formatDuration(0)   // "0m"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format date with different styles
 * @param date - ISO date string (e.g., "2025-12-14")
 * @param style - 'short', 'medium', or 'long'
 * @returns Formatted date string
 *
 * @example
 * formatDate("2025-12-14", "short")  // "Dec 14"
 * formatDate("2025-12-14", "medium") // "Sun, Dec 14"
 * formatDate("2025-12-14", "long")   // "Sunday, December 14, 2025"
 */
export function formatDate(date: string, style: DateStyle): string {
  if (!date) return '';

  const dateObj = new Date(date + 'T00:00:00');
  if (isNaN(dateObj.getTime())) return date;

  switch (style) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

    case 'medium':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

    default:
      return date;
  }
}

/**
 * Format a date range
 * @param start - Start date ISO string
 * @param end - End date ISO string
 * @returns Formatted date range string
 *
 * @example
 * formatDateRange("2025-12-14", "2025-12-16") // "Dec 14 - 16, 2025"
 * formatDateRange("2025-12-14", "2025-12-14") // "Dec 14, 2025"
 * formatDateRange("2025-12-28", "2026-01-02") // "Dec 28, 2025 - Jan 2, 2026"
 */
export function formatDateRange(start: string, end: string): string {
  if (!start) return '';
  if (!end) return formatDate(start, 'short');

  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return `${start} - ${end}`;
  }

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();

  // Same day
  if (start === end) {
    return startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Different years
  if (startYear !== endYear) {
    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endStr = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }

  // Same year, different months
  if (startMonth !== endMonth) {
    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }

  // Same year, same month
  const month = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  return `${month} ${startDay} - ${endDay}, ${startYear}`;
}

/**
 * Format distance with unit conversion
 * @param km - Distance in kilometers
 * @param unit - 'mi' or 'km'
 * @returns Formatted distance string
 *
 * @example
 * formatDistance(16.3, "mi") // "10.1 mi"
 * formatDistance(16.3, "km") // "16.3 km"
 * formatDistance(0.5, "km")  // "0.5 km"
 */
export function formatDistance(km: number, unit: DistanceUnit): string {
  if (km === null || km === undefined || isNaN(km)) return '';

  if (unit === 'mi') {
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }

  return `${km.toFixed(1)} km`;
}

/**
 * Format temperature with unit conversion
 * @param celsius - Temperature in Celsius
 * @param unit - 'F' or 'C'
 * @returns Formatted temperature string
 *
 * @example
 * formatTemp(25, "F") // "77°F"
 * formatTemp(25, "C") // "25°C"
 * formatTemp(0, "F")  // "32°F"
 */
export function formatTemp(celsius: number, unit: TemperatureUnit): string {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return '';

  if (unit === 'F') {
    const fahrenheit = Math.round((celsius * 9) / 5 + 32);
    return `${fahrenheit}°F`;
  }

  return `${Math.round(celsius)}°C`;
}

const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  $: 'Budget',
  $$: 'Moderate',
  $$$: 'Upscale',
  $$$$: 'Luxury',
};

/**
 * Format price range with optional label
 * @param range - Price range symbol
 * @param asLabel - If true, returns descriptive label instead of symbols
 * @returns Price range string or label
 *
 * @example
 * formatPriceRange("$$")           // "$$"
 * formatPriceRange("$$", true)     // "Moderate"
 * formatPriceRange("$$$$", true)   // "Luxury"
 */
export function formatPriceRange(range: PriceRange, asLabel?: boolean): string {
  if (!range) return '';

  if (asLabel) {
    return PRICE_RANGE_LABELS[range] || range;
  }

  return range;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF ',
  HKD: 'HK$',
  SGD: 'S$',
  THB: '฿',
  MXN: 'MX$',
  BRL: 'R$',
  SEK: 'kr ',
  NOK: 'kr ',
  DKK: 'kr ',
  NZD: 'NZ$',
  ZAR: 'R',
  AED: 'AED ',
  PHP: '₱',
  TWD: 'NT$',
  MYR: 'RM ',
  IDR: 'Rp ',
  VND: '₫',
  PLN: 'zł ',
  CZK: 'Kč ',
  HUF: 'Ft ',
  ILS: '₪',
  TRY: '₺',
  RUB: '₽',
};

/**
 * Format currency amount with symbol
 * @param amount - Numeric amount
 * @param currency - ISO 4217 currency code
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(150, "USD")   // "$150"
 * formatCurrency(150, "EUR")   // "€150"
 * formatCurrency(1500, "JPY")  // "¥1,500"
 * formatCurrency(150.50, "GBP") // "£150.50"
 */
export function formatCurrency(amount: number, currency: string): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  if (!currency) return amount.toString();

  const upperCurrency = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[upperCurrency] || `${upperCurrency} `;

  // Currencies that don't use decimals
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'HUF'];
  const useDecimals =
    !noDecimalCurrencies.includes(upperCurrency) && amount % 1 !== 0;

  const formattedAmount = useDecimals
    ? amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : Math.round(amount).toLocaleString('en-US');

  return `${symbol}${formattedAmount}`;
}

/**
 * Format a time range (start to end time)
 * @param startTime - Start time in 24h format
 * @param endTime - End time in 24h format
 * @param format - '12h' or '24h'
 * @returns Formatted time range string
 *
 * @example
 * formatTimeRange("09:00", "11:30", "12h") // "9:00 AM - 11:30 AM"
 * formatTimeRange("14:00", "16:00", "24h") // "14:00 - 16:00"
 */
export function formatTimeRange(
  startTime: string,
  endTime: string,
  format: TimeFormat
): string {
  if (!startTime || !endTime) return '';

  return `${formatTime(startTime, format)} - ${formatTime(endTime, format)}`;
}

/**
 * Calculate end time from start time and duration
 * @param startTime - Start time in 24h format (e.g., "14:30")
 * @param durationMinutes - Duration in minutes
 * @returns End time in 24h format
 *
 * @example
 * calculateEndTime("14:30", 90) // "16:00"
 * calculateEndTime("23:00", 120) // "01:00"
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number
): string {
  if (!startTime || !durationMinutes) return '';

  const [hoursStr, minutesStr] = startTime.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return '';

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
