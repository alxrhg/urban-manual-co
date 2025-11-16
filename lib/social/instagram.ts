export interface InstagramProfile {
  handle: string; // handle without @
  displayHandle: string; // formatted with leading @
  url: string; // normalized https://www.instagram.com/{handle}/
  avatarUrl: string; // https://unavatar.io/instagram/{handle}
}

function normalizeHandle(value?: string | null): string | null {
  if (!value) return null;
  let handle = value.trim();
  if (!handle) return null;

  // Remove leading @ symbols
  handle = handle.replace(/^@+/, '');

  // Remove trailing slashes or query/hash
  handle = handle.split(/[/?#]/)[0];

  // Instagram allows letters, numbers, periods, and underscores
  handle = handle.replace(/[^0-9a-zA-Z._]/g, '');

  return handle || null;
}

function normalizeUrl(value?: string | null): string | null {
  if (!value) return null;
  let url = value.trim();
  if (!url) return null;

  try {
    // If it already has a protocol, the URL constructor will handle it
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    try {
      // Try adding https:// if missing
      const parsed = new URL(`https://${url.replace(/^\/\//, '')}`);
      return parsed.toString();
    } catch {
      return null;
    }
  }
}

function handleFromUrl(url?: string | null): string | null {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return null;

  try {
    const parsed = new URL(normalizedUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    return normalizeHandle(segments[0]);
  } catch {
    return null;
  }
}

export function buildInstagramUrl(handle: string): string {
  const sanitized = normalizeHandle(handle) ?? '';
  return sanitized ? `https://www.instagram.com/${sanitized}/` : 'https://www.instagram.com/';
}

export function buildInstagramAvatarUrl(handle: string): string {
  const sanitized = normalizeHandle(handle) ?? '';
  return sanitized ? `https://unavatar.io/instagram/${sanitized}` : 'https://unavatar.io/instagram';
}

export function resolveInstagramProfile({
  handle,
  url,
}: {
  handle?: string | null;
  url?: string | null;
}): InstagramProfile | null {
  const normalizedHandle = normalizeHandle(handle) ?? handleFromUrl(url);

  if (!normalizedHandle) {
    return null;
  }

  const instagramUrl = normalizeUrl(url) ?? buildInstagramUrl(normalizedHandle);

  return {
    handle: normalizedHandle,
    displayHandle: `@${normalizedHandle}`,
    url: instagramUrl,
    avatarUrl: buildInstagramAvatarUrl(normalizedHandle),
  };
}
