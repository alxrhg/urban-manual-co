export function toKebabCase(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatCityName(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map(segment => segment
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
    )
    .join(' ');
}

export function buildDestinationSlug(city: string, name: string): string {
  const cityPart = toKebabCase(city);
  const namePart = toKebabCase(name);
  if (cityPart && namePart) {
    return `${cityPart}-${namePart}`;
  }
  return toKebabCase(name || city);
}

export function toSentenceCase(value: string): string {
  if (!value) return '';
  const cleaned = value.replace(/-/g, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
