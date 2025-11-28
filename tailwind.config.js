module.exports = {
  theme: {
    extend: {
      fontFamily: {
        // Distinctive typography - avoid generic AI aesthetics
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'stagger-1': 'fadeIn 0.5s ease-out 0.1s forwards',
        'stagger-2': 'fadeIn 0.5s ease-out 0.2s forwards',
        'stagger-3': 'fadeIn 0.5s ease-out 0.3s forwards',
        'stagger-4': 'fadeIn 0.5s ease-out 0.4s forwards',
        'stagger-5': 'fadeIn 0.5s ease-out 0.5s forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      maxWidth: {
        'um': 'var(--um-content-max)',
      },
      padding: {
        'um': 'var(--um-content-padding)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '3rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
      colors: {
        // Warm brownish dark theme colors
        'dark-warm': {
          950: 'hsl(24 10% 6%)',
          900: 'hsl(24 10% 10%)',
          800: 'hsl(24 8% 14%)',
          700: 'hsl(24 8% 20%)',
        },
      },
    },
  },
}

