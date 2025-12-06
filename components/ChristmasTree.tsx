'use client';

import { useChristmasTheme } from '@/contexts/ChristmasThemeContext';

export function ChristmasTree() {
  const { isChristmasMode, toggleChristmasMode } = useChristmasTheme();

  // Only show in December
  const isDecember = new Date().getMonth() === 11;
  if (!isDecember) return null;

  return (
    <button
      onClick={toggleChristmasMode}
      className="christmas-tree-toggle group relative"
      aria-label={isChristmasMode ? 'Disable Christmas theme' : 'Enable Christmas theme'}
      title={isChristmasMode ? 'Click to disable Christmas theme' : 'Click to enable Christmas theme'}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-300 ${
          isChristmasMode
            ? 'christmas-tree-active'
            : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-500'
        }`}
      >
        {/* Star on top */}
        <path
          d="M12 1L13.09 4.26L16.27 4.27L13.82 6.43L14.64 9.73L12 7.77L9.36 9.73L10.18 6.43L7.73 4.27L10.91 4.26L12 1Z"
          fill={isChristmasMode ? '#FFD700' : 'currentColor'}
          className={isChristmasMode ? 'animate-twinkle' : ''}
        />
        {/* Tree layers */}
        <path
          d="M12 6L17 12H14L18 18H6L10 12H7L12 6Z"
          fill={isChristmasMode ? '#228B22' : 'currentColor'}
        />
        {/* Tree trunk */}
        <rect
          x="10"
          y="18"
          width="4"
          height="4"
          fill={isChristmasMode ? '#8B4513' : 'currentColor'}
        />
        {/* Ornaments when active */}
        {isChristmasMode && (
          <>
            <circle cx="10" cy="11" r="1" fill="#FF0000" className="animate-twinkle" style={{ animationDelay: '0.2s' }} />
            <circle cx="14" cy="13" r="1" fill="#FFD700" className="animate-twinkle" style={{ animationDelay: '0.5s' }} />
            <circle cx="11" cy="15" r="1" fill="#0000FF" className="animate-twinkle" style={{ animationDelay: '0.8s' }} />
            <circle cx="13" cy="10" r="0.8" fill="#FF69B4" className="animate-twinkle" style={{ animationDelay: '0.3s' }} />
          </>
        )}
      </svg>
      {/* Glow effect when active */}
      {isChristmasMode && (
        <span className="absolute inset-0 -z-10 animate-pulse-slow rounded-full bg-green-500/20 blur-md" />
      )}
    </button>
  );
}
