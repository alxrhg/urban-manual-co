/**
 * Card Styling Constants - Urban Manual Design System
 *
 * Standardized card styles for consistent visual appearance across the app.
 * Uses Apple-inspired rounded corners and subtle hover effects.
 */

// Card wrapper with smooth transitions
export const CARD_WRAPPER = "group relative w-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform";

// Card media container - consistent 4:3 aspect ratio with standardized border radius
export const CARD_MEDIA = "relative aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800/50 mb-2 sm:mb-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]";

// Card title - consistent font size and line height
export const CARD_TITLE = "text-[14px] font-medium leading-snug line-clamp-2 text-gray-900 dark:text-white tracking-[-0.01em] transition-colors duration-300 ease-out";

// Card meta/subtitle - consistent secondary text style
export const CARD_META = "text-[12px] text-gray-500 dark:text-gray-400 line-clamp-1 tracking-[-0.01em] mt-0.5";

// Card image hover effect
export const CARD_IMAGE_HOVER = "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]";

// Badge styles for Michelin stars and other indicators
export const CARD_BADGE = "absolute bottom-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-white/90 dark:bg-black/70 backdrop-blur-md text-gray-700 dark:text-gray-200 flex items-center gap-1.5 shadow-sm";


