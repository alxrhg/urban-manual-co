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
          xs: '375px',  // iPhone SE, iPhone 12 mini
          sm: '640px',
          md: '768px',  // iPad portrait
          lg: '1024px', // iPad landscape
          xl: '1280px',
        },
      },
      screens: {
        'xs': '375px',     // Small mobile (iPhone SE, iPhone 12 mini)
        'sm': '640px',     // Mobile landscape / small tablets
        'md': '768px',     // Tablets portrait (iPad)
        'lg': '1024px',    // Tablets landscape / small desktop
        'xl': '1280px',    // Desktop
        '2xl': '1536px',   // Large desktop
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

