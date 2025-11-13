module.exports = {
  theme: {
    extend: {
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
        'um-bg': 'rgb(var(--um-color-bg) / <alpha-value>)',
        'um-surface': 'rgb(var(--um-color-surface) / <alpha-value>)',
        'um-surface-muted': 'rgb(var(--um-color-surface-muted) / <alpha-value>)',
        'um-foreground': 'rgb(var(--um-color-foreground) / <alpha-value>)',
        'um-muted': 'rgb(var(--um-color-muted) / <alpha-value>)',
        'um-border': 'rgb(var(--um-color-border) / <alpha-value>)',
        'um-pill': 'rgb(var(--um-color-pill) / <alpha-value>)',
        'um-pill-foreground': 'rgb(var(--um-color-pill-foreground) / <alpha-value>)',
        'um-inverse': 'rgb(var(--um-color-inverse) / <alpha-value>)',
      },
      borderRadius: {
        'um-sm': 'var(--um-radius-sm)',
        'um-md': 'var(--um-radius-md)',
        'um-lg': 'var(--um-radius-lg)',
        'um-full': 'var(--um-radius-full)',
      },
      spacing: {
        'um-xs': 'var(--um-space-xs)',
        'um-sm': 'var(--um-space-sm)',
        'um-md': 'var(--um-space-md)',
        'um-lg': 'var(--um-space-lg)',
        'um-xl': 'var(--um-space-xl)',
        'um-2xl': 'var(--um-space-2xl)',
        'um-section-y': 'var(--um-section-space-y)',
        'um-gap': 'var(--um-section-gap)',
      },
      fontSize: {
        'um-xs': ['var(--um-text-xs)', { lineHeight: '1.4' }],
        'um-sm': ['var(--um-text-sm)', { lineHeight: '1.45' }],
        'um-base': ['var(--um-text-base)', { lineHeight: '1.6' }],
        'um-lg': ['var(--um-text-lg)', { lineHeight: '1.4' }],
        'um-xl': ['var(--um-text-xl)', { lineHeight: '1.35' }],
        'um-2xl': ['var(--um-text-2xl)', { lineHeight: '1.25' }],
        'um-3xl': ['var(--um-text-3xl)', { lineHeight: '1.15' }],
        'um-4xl': ['var(--um-text-4xl)', { lineHeight: '1.1' }],
      },
      boxShadow: {
        'um-card': '0 28px 70px -40px rgba(15, 23, 42, 0.65)',
      },
    },
  },
}

