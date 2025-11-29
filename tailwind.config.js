/**
 * Urban Manual Tailwind Configuration
 * Extended with design tokens from lib/theme.ts
 */
module.exports = {
  theme: {
    extend: {
      // =================================================================
      // TYPOGRAPHY
      // =================================================================
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
      },

      // =================================================================
      // BORDER RADIUS - Semantic Classes
      // =================================================================
      borderRadius: {
        // Base scale
        'none': '0',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
        // Semantic tokens (use these!)
        'button': '12px',
        'button-pill': '9999px',
        'input': '12px',
        'card': '12px',
        'card-lg': '16px',
        'drawer': '16px',
        'drawer-mobile': '28px',
        'modal': '16px',
        'badge': '9999px',
        'avatar': '9999px',
        'tag': '8px',
        'tooltip': '8px',
      },

      // =================================================================
      // SHADOWS - 4-Level System
      // =================================================================
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        // Semantic shadows
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'drawer': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'none': 'none',
      },

      // =================================================================
      // SPACING - Semantic Tokens
      // =================================================================
      spacing: {
        // Component spacing
        'component-gap': '16px',
        'component-padding': '16px',
        'component-margin': '24px',
        // Section spacing
        'section-gap': '48px',
        'section-padding': '32px',
        'section-margin': '64px',
        // Card spacing
        'card-padding': '16px',
        'card-padding-lg': '24px',
        'card-gap': '12px',
        // Page spacing
        'page-gutter-mobile': '24px',
        'page-gutter-desktop': '40px',
        // Stack (vertical)
        'stack-xs': '4px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '24px',
        'stack-xl': '32px',
        // Inline (horizontal)
        'inline-xs': '4px',
        'inline-sm': '8px',
        'inline-md': '12px',
        'inline-lg': '16px',
        'inline-xl': '24px',
      },

      // =================================================================
      // ANIMATION - Motion Design System
      // =================================================================
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0.0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-fast': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-up-fast': 'slideUp 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'scale-in-spring': 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'stagger-1': 'fadeIn 0.5s ease-out 0.05s forwards',
        'stagger-2': 'fadeIn 0.5s ease-out 0.1s forwards',
        'stagger-3': 'fadeIn 0.5s ease-out 0.15s forwards',
        'stagger-4': 'fadeIn 0.5s ease-out 0.2s forwards',
        'stagger-5': 'fadeIn 0.5s ease-out 0.25s forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
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
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
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
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      // =================================================================
      // COLORS - Adaptive Palette
      // =================================================================
      colors: {
        // Light mode adaptive grays (warmer)
        'um-gray': {
          50: '#FAFAFA',
          100: '#F5F5F4',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        // Dark mode adaptive grays (cooler) - used via dark: prefix
        'um-slate': {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#0C0C0D',
        },
        // Legacy support
        'dark-blue': {
          900: '#0a1628',
          800: '#0f1f35',
          700: '#152438',
          600: '#1a2a3a',
        },
      },

      // =================================================================
      // Z-INDEX
      // =================================================================
      zIndex: {
        'hide': '-1',
        'base': '0',
        'raised': '1',
        'dropdown': '10',
        'sticky': '20',
        'header': '30',
        'overlay': '40',
        'modal': '50',
        'drawer': '50',
        'popover': '60',
        'tooltip': '70',
        'toast': '80',
        'max': '9999',
      },

      // =================================================================
      // SIZING
      // =================================================================
      maxWidth: {
        'um': 'var(--um-content-max)',
        'page': '1280px',
      },
      padding: {
        'um': 'var(--um-content-padding)',
      },
      height: {
        // Form heights
        'form-sm': '32px',
        'form-md': '40px',
        'form-lg': '48px',
        // Icon sizes
        'icon-xs': '12px',
        'icon-sm': '16px',
        'icon-md': '20px',
        'icon-lg': '24px',
        'icon-xl': '28px',
        'icon-2xl': '32px',
      },
      width: {
        // Icon sizes
        'icon-xs': '12px',
        'icon-sm': '16px',
        'icon-md': '20px',
        'icon-lg': '24px',
        'icon-xl': '28px',
        'icon-2xl': '32px',
      },

      // =================================================================
      // CONTAINER
      // =================================================================
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          md: '2rem',
          lg: '2.5rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
    },
  },
}

