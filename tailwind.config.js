module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        border: "var(--border)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        info: "var(--info)",
        'dark-blue': {
          900: '#0a1628',
          800: '#0f1f35',
          700: '#152438',
          600: '#1a2a3a',
        },
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        '2xl': "var(--space-2xl)",
      },
      maxWidth: {
        'um': 'var(--um-content-max)',
      },
      padding: {
        'um': 'var(--um-content-padding)',
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        card: "var(--radius-md)",
        pill: "var(--radius-full)",
        full: "var(--radius-full)",
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: '1rem' }],
        sm: ["var(--text-sm)", { lineHeight: '1.25rem' }],
        base: ["var(--text-base)", { lineHeight: '1.5rem' }],
        lg: ["var(--text-lg)", { lineHeight: '1.75rem' }],
        xl: ["var(--text-xl)", { lineHeight: '1.75rem' }],
        '2xl': ["var(--text-2xl)", { lineHeight: '2rem' }],
        '3xl': ["var(--text-3xl)", { lineHeight: '2.25rem' }],
        '4xl': ["var(--text-4xl)", { lineHeight: '2.5rem' }],
      },
      fontWeight: {
        normal: "var(--font-normal)",
        medium: "var(--font-medium)",
        semibold: "var(--font-semibold)",
        bold: "var(--font-bold)",
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
    },
  },
}

