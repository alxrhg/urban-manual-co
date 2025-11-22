module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        // Lovably-inspired font (Scto Grotesk A - Inter is used as primary fallback)
        // Alternatives: Manrope, Work Sans, Space Grotesk (see docs/LOVABLY_FONT_ALTERNATIVES.md)
        'scto_grotesk_a': ['Scto Grotesk A', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
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

