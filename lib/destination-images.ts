import { Destination } from '@/types/destination';

const VALID_IMAGE_PREFIXES = ['http://', 'https://', '/', 'data:', 'blob:'];

export const isValidImageUrl = (url?: string | null): url is string => {
  if (!url) return false;

  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 5) return false;

  return VALID_IMAGE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
};

export const getSafeImageUrl = (url?: string | null): string | null => {
  if (!isValidImageUrl(url)) return null;
  return url.trim();
};

export const getDestinationImageUrl = (destination?: Destination | null): string | null => {
  if (!destination) return null;

  const candidates: Array<string | null | undefined> = [
    destination.image_thumbnail,
    destination.image,
    destination.image_original,
    destination.primary_photo_url,
  ];

  if (Array.isArray(destination.photos_json)) {
    const photoUrl = destination.photos_json.find(
      (photo): photo is { url: string } => Boolean(photo && typeof photo.url === 'string')
    )?.url;

    candidates.push(photoUrl);
  }

  for (const candidate of candidates) {
    if (isValidImageUrl(candidate)) {
      return candidate.trim();
    }
  }

  return null;
};
