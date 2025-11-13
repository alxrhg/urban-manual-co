export const spacingTokens = {
  sectionY: 'py-[var(--um-section-space-y)]',
  inlinePadding: 'px-4 sm:px-6 lg:px-8',
  stack: 'space-y-[var(--um-section-gap)]',
  gap: 'gap-[var(--um-section-gap)]',
} as const;

export const colorTokens = {
  surface: 'bg-um-surface text-um-foreground',
  surfaceMuted: 'bg-um-surface-muted text-um-foreground',
  border: 'border border-um-border/80',
  textPrimary: 'text-um-foreground',
  textSecondary: 'text-um-muted',
  inverse: 'text-um-inverse',
} as const;

export const radiusTokens = {
  sm: 'rounded-[var(--um-radius-sm)]',
  md: 'rounded-[var(--um-radius-md)]',
  lg: 'rounded-[var(--um-radius-lg)]',
  full: 'rounded-full',
} as const;

export const typographyTokens = {
  sectionTitle: 'text-um-foreground font-semibold tracking-tight text-xl sm:text-2xl',
  sectionDescription: 'text-sm text-um-muted sm:text-base',
  cardTitle: 'text-sm font-medium leading-snug text-um-foreground',
  meta: 'text-xs text-um-muted',
} as const;

export const shadowTokens = {
  soft: 'shadow-[0_10px_45px_-40px_rgba(15,23,42,0.65)]',
  card: 'shadow-um-card',
} as const;
