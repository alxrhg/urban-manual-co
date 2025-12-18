/**
 * Application constants
 * Centralized to avoid magic numbers and ensure consistency
 */

// Layout & Spacing
export const LAYOUT = {
  HEADER_HEIGHT: 80,
  DRAWER_WIDTH: 480,
  MAX_CONTENT_WIDTH: 1920,
  GRID_GAP_SM: 16, // 1rem
  GRID_GAP_MD: 24, // 1.5rem
} as const;

// Pagination
export const PAGINATION = {
  ITEMS_PER_PAGE_MOBILE: 14, // 2 columns × 7 rows
  ITEMS_PER_PAGE_DESKTOP: 28, // 7 columns × 4 rows
  ITEMS_PER_PAGE_TRENDING: 12,
  ITEMS_PER_PAGE_RECOMMENDATIONS: 6,
} as const;

// Animation durations (ms)
export const ANIMATION = {
  FAST: 150,
  DEFAULT: 200,
  MEDIUM: 300,
  SLOW: 500,
  DRAWER_TRANSITION: 300,
  TOAST_DURATION: 3000,
  TOOLTIP_DELAY: 500,
} as const;

// Debounce delays (ms)
export const DEBOUNCE = {
  SEARCH: 500,
  AUTOCOMPLETE: 300,
  RESIZE: 150,
  SCROLL: 100,
} as const;

// Touch targets (minimum sizes for accessibility)
export const TOUCH_TARGET = {
  MIN_SIZE: 44, // 44x44px - Apple Human Interface Guidelines
  COMFORTABLE: 48, // 48x48px - Material Design
} as const;

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  DRAWER: 50,
  TOAST: 100,
} as const;

// API limits
export const API = {
  MAX_SEARCH_RESULTS: 100,
  MAX_RECOMMENDATIONS: 6,
  MAX_TRENDING: 12,
  MAX_NEARBY_RADIUS_KM: 25,
  MIN_NEARBY_RADIUS_KM: 0.5,
  DEFAULT_NEARBY_RADIUS_KM: 5,
} as const;

// Search
export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
  MAX_CONVERSATION_HISTORY: 10,
} as const;

// Grid breakpoints (matches Tailwind default)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Grid columns by breakpoint
export const GRID_COLUMNS = {
  MOBILE: 2,
  SM: 3,
  MD: 4,
  LG: 5,
  XL: 6,
  '2XL': 7,
} as const;

// Rating
export const RATING = {
  MIN: 0,
  MAX: 5,
  STEP: 0.5,
  DEFAULT_FILTER_OPTIONS: [4.5, 4.0, 3.5, 3.0],
} as const;

// Price levels (Google Places API standard)
export const PRICE_LEVEL = {
  MIN: 1,
  MAX: 4,
  LABELS: {
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$',
  },
} as const;

// City timezones (fallback mapping for "Open Now" feature)
export const CITY_TIMEZONES: Record<string, string> = {
  // Japan
  'tokyo': 'Asia/Tokyo',
  'kyoto': 'Asia/Tokyo',
  'osaka': 'Asia/Tokyo',
  'nara': 'Asia/Tokyo',
  'fukuoka': 'Asia/Tokyo',
  'nagoya': 'Asia/Tokyo',
  'yokohama': 'Asia/Tokyo',
  'sapporo': 'Asia/Tokyo',
  // East Asia
  'seoul': 'Asia/Seoul',
  'busan': 'Asia/Seoul',
  'taipei': 'Asia/Taipei',
  'hong-kong': 'Asia/Hong_Kong',
  'macau': 'Asia/Macau',
  'shanghai': 'Asia/Shanghai',
  'beijing': 'Asia/Shanghai',
  'shenzhen': 'Asia/Shanghai',
  'guangzhou': 'Asia/Shanghai',
  // Southeast Asia
  'singapore': 'Asia/Singapore',
  'bangkok': 'Asia/Bangkok',
  'kuala-lumpur': 'Asia/Kuala_Lumpur',
  'jakarta': 'Asia/Jakarta',
  'bali': 'Asia/Makassar',
  'manila': 'Asia/Manila',
  'ho-chi-minh': 'Asia/Ho_Chi_Minh',
  'hanoi': 'Asia/Ho_Chi_Minh',
  // South Asia
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'new-delhi': 'Asia/Kolkata',
  'bangalore': 'Asia/Kolkata',
  'goa': 'Asia/Kolkata',
  // Middle East
  'dubai': 'Asia/Dubai',
  'abu-dhabi': 'Asia/Dubai',
  'doha': 'Asia/Qatar',
  'tel-aviv': 'Asia/Jerusalem',
  'istanbul': 'Europe/Istanbul',
  // Oceania
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'perth': 'Australia/Perth',
  'brisbane': 'Australia/Brisbane',
  'auckland': 'Pacific/Auckland',
  // Western Europe
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'amsterdam': 'Europe/Amsterdam',
  'berlin': 'Europe/Berlin',
  'munich': 'Europe/Berlin',
  'frankfurt': 'Europe/Berlin',
  'hamburg': 'Europe/Berlin',
  'zurich': 'Europe/Zurich',
  'geneva': 'Europe/Zurich',
  'vienna': 'Europe/Vienna',
  'brussels': 'Europe/Brussels',
  'dublin': 'Europe/Dublin',
  'edinburgh': 'Europe/London',
  // Southern Europe
  'barcelona': 'Europe/Madrid',
  'madrid': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  'milan': 'Europe/Rome',
  'florence': 'Europe/Rome',
  'venice': 'Europe/Rome',
  'naples': 'Europe/Rome',
  'lisbon': 'Europe/Lisbon',
  'porto': 'Europe/Lisbon',
  'athens': 'Europe/Athens',
  // Northern Europe
  'stockholm': 'Europe/Stockholm',
  'copenhagen': 'Europe/Copenhagen',
  'oslo': 'Europe/Oslo',
  'helsinki': 'Europe/Helsinki',
  // Central Europe
  'prague': 'Europe/Prague',
  'budapest': 'Europe/Budapest',
  'warsaw': 'Europe/Warsaw',
  'krakow': 'Europe/Warsaw',
  // North America
  'new-york': 'America/New_York',
  'nyc': 'America/New_York',
  'boston': 'America/New_York',
  'philadelphia': 'America/New_York',
  'washington': 'America/New_York',
  'washington-dc': 'America/New_York',
  'miami': 'America/New_York',
  'atlanta': 'America/New_York',
  'chicago': 'America/Chicago',
  'dallas': 'America/Chicago',
  'houston': 'America/Chicago',
  'austin': 'America/Chicago',
  'denver': 'America/Denver',
  'phoenix': 'America/Phoenix',
  'los-angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'san-francisco': 'America/Los_Angeles',
  'san-diego': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles',
  'portland': 'America/Los_Angeles',
  'las-vegas': 'America/Los_Angeles',
  'vancouver': 'America/Vancouver',
  'toronto': 'America/Toronto',
  'montreal': 'America/Montreal',
  // Latin America
  'mexico-city': 'America/Mexico_City',
  'cancun': 'America/Cancun',
  'sao-paulo': 'America/Sao_Paulo',
  'rio-de-janeiro': 'America/Sao_Paulo',
  'buenos-aires': 'America/Argentina/Buenos_Aires',
  'lima': 'America/Lima',
  'bogota': 'America/Bogota',
  // Africa
  'cape-town': 'Africa/Johannesburg',
  'johannesburg': 'Africa/Johannesburg',
  'marrakech': 'Africa/Casablanca',
  'cairo': 'Africa/Cairo',
} as const;

// Feature flags (for easy enabling/disabling features)
export const FEATURES = {
  AI_SEARCH: true,
  NEAR_ME: true,
  HAPTIC_FEEDBACK: true,
  ANALYTICS: true,
  ADS: true,
  OFFLINE_MODE: false, // Future feature
  PUSH_NOTIFICATIONS: false, // Future feature
} as const;

// External URLs
export const URLS = {
  PRIVACY_POLICY: '/privacy',
  TERMS_OF_SERVICE: '/terms',
  SUPPORT_EMAIL: 'support@urbanmanual.co',
  GITHUB_ISSUES: 'https://github.com/urbanmanual/issues',
} as const;

// Michelin stars
export const MICHELIN = {
  MIN: 0,
  MAX: 3,
  ICON_URL: 'https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg',
  ICON_URL_FALLBACK: '/michelin-star.svg',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ITINERARY: 'urban-manual-itinerary',
  DARK_MODE: 'darkMode',
  RECENT_SEARCHES: 'recent-searches',
  RECENTLY_VIEWED: 'recently-viewed',
  USER_PREFERENCES: 'user-preferences',
} as const;

// Image sizes (for Next.js Image component)
export const IMAGE_SIZES = {
  CARD_MOBILE: '50vw',
  CARD_TABLET: '33vw',
  CARD_DESKTOP: '25vw',
  DRAWER: '(max-width: 640px) 100vw, 480px',
  HERO: '100vw',
  AVATAR: '40px',
} as const;
