module.exports = {
  theme: {
    extend: {
      fontFamily: {
        // Premium, neutral sans-serifs - institutional yet modern
        // Primary: Inter for body, Geist for UI, SF Pro as system fallback
        sans: ['Inter', 'Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'sans-serif'],
        // Display font for large headings - maintains editorial feel
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
        // Alternative body font for specific sections
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Typography scale with clear hierarchy
      fontSize: {
        // Body text
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],    // 14px
        'body': ['1rem', { lineHeight: '1.5' }],           // 16px
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],    // 18px
        // Subheadings
        'subhead-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],  // 18px
        'subhead': ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],      // 20px
        'subhead-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '500' }],    // 24px
        // Headings
        'heading-sm': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],   // 24px
        'heading': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],    // 30px
        'heading-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],   // 36px
        'heading-xl': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],      // 48px
        'heading-2xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],  // 60px
      },
      // Line height tokens for readability
      lineHeight: {
        'tight': '1.1',
        'snug': '1.25',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '1.75',
        'prose': '1.65',  // Optimal for long-form reading
      },
      // Max-width for optimal line length (60-75 characters)
      maxWidth: {
        'prose-narrow': '55ch',   // ~55 characters - compact
        'prose': '65ch',          // ~65 characters - optimal readability
        'prose-wide': '75ch',     // ~75 characters - maximum
        'prose-reading': '70ch',  // ~70 characters - sweet spot for body text
      },
      // Letter spacing for hierarchy
      letterSpacing: {
        'heading': '-0.02em',
        'subhead': '-0.01em',
        'body': '0',
        'wide': '0.025em',
        'wider': '0.05em',
        'caps': '0.1em',
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
        'dark-blue': {
          900: '#0a1628',
          800: '#0f1f35',
          700: '#152438',
          600: '#1a2a3a',
        },
      },
    },
  },
}

