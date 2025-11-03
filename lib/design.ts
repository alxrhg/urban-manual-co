const cityPalette: Record<string, { accent: string; tag: string; ribbon: string }> = {
  tokyo: { accent: '#e3b765', tag: '#fdecc8', ribbon: 'var(--city-tokyo)' },
  paris: { accent: '#c9a3ff', tag: '#f2e9ff', ribbon: 'var(--city-paris)' },
  london: { accent: '#a0c4ff', tag: '#e2ecff', ribbon: 'var(--city-london)' },
  'new-york': { accent: '#d6d3d1', tag: '#f4f4f5', ribbon: 'var(--city-new-york)' },
  singapore: { accent: '#8bd4aa', tag: '#ddf5e7', ribbon: 'var(--city-singapore)' },
  dubai: { accent: '#e3c299', tag: '#f7eada', ribbon: 'var(--city-dubai)' },
};

export function getCityTheme(slug?: string | null) {
  if (!slug) return { theme: 'default', accent: '#0f172a', tag: '#e2e8f0', ribbon: 'var(--city-default)' };
  const normalized = slug.toLowerCase();
  const palette = cityPalette[normalized] || cityPalette[normalized.replace(/\s+/g, '-')] || null;
  if (!palette) {
    return { theme: 'default', accent: '#0f172a', tag: '#e2e8f0', ribbon: 'var(--city-default)' };
  }
  return { theme: normalized.replace(/\s+/g, '-'), ...palette };
}
