export function deterministicRandomFromString(value: string): number {
  if (!value) {
    return 0;
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  const normalized = (Math.abs(hash) % 1000) / 1000;
  return normalized;
}

function toSeedPart(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

export function pickDeterministicItem<T>(items: readonly T[], seedParts: unknown[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const seed = seedParts
    .map(toSeedPart)
    .filter(Boolean)
    .join('|');

  const normalized = deterministicRandomFromString(seed || 'default');
  const index = Math.min(items.length - 1, Math.floor(normalized * items.length));

  return items[index] ?? items[0];
}
