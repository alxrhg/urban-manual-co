/**
 * Image Validation Utilities
 *
 * Validates uploaded images using magic bytes to prevent MIME type spoofing.
 * This protects against polyglot file attacks and malicious file uploads.
 */

// Magic byte signatures for common image formats
const IMAGE_SIGNATURES: { mime: string; signatures: number[][] }[] = [
  // JPEG: FFD8FF
  {
    mime: 'image/jpeg',
    signatures: [[0xff, 0xd8, 0xff]],
  },
  // PNG: 89504E47
  {
    mime: 'image/png',
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  // GIF: 47494638 (GIF87a or GIF89a)
  {
    mime: 'image/gif',
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
  },
  // WebP: 52494646....57454250
  {
    mime: 'image/webp',
    signatures: [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP check needs additional validation)
  },
  // BMP: 424D
  {
    mime: 'image/bmp',
    signatures: [[0x42, 0x4d]],
  },
  // ICO: 00000100
  {
    mime: 'image/x-icon',
    signatures: [[0x00, 0x00, 0x01, 0x00]],
  },
  // AVIF: ....66747970617669 (ftyp + avif)
  {
    mime: 'image/avif',
    signatures: [], // Complex format, handled separately
  },
  // HEIC: ....6674797068656963 (ftyp + heic)
  {
    mime: 'image/heic',
    signatures: [], // Complex format, handled separately
  },
];

// Allowed image extensions mapping
const ALLOWED_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  heic: 'image/heic',
};

export interface ImageValidationResult {
  valid: boolean;
  detectedMime?: string;
  error?: string;
}

/**
 * Check if bytes match a signature
 */
function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Check for WebP format (RIFF....WEBP)
 */
function isWebP(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // RIFF header
  if (!matchesSignature(bytes, [0x52, 0x49, 0x46, 0x46])) return false;
  // WEBP at offset 8
  return (
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

/**
 * Check for AVIF/HEIC format (ftyp box)
 */
function isFtyp(bytes: Uint8Array, brand: string): boolean {
  if (bytes.length < 12) return false;
  // ftyp at offset 4
  if (
    bytes[4] !== 0x66 ||
    bytes[5] !== 0x74 ||
    bytes[6] !== 0x79 ||
    bytes[7] !== 0x70
  ) {
    return false;
  }
  // Check brand at offset 8
  const brandBytes = new TextEncoder().encode(brand);
  return brandBytes.every((byte, index) => bytes[8 + index] === byte);
}

/**
 * Detect image type from magic bytes
 */
export function detectImageType(bytes: Uint8Array): string | null {
  // Check WebP specially
  if (isWebP(bytes)) {
    return 'image/webp';
  }

  // Check AVIF
  if (isFtyp(bytes, 'avif') || isFtyp(bytes, 'avis')) {
    return 'image/avif';
  }

  // Check HEIC
  if (isFtyp(bytes, 'heic') || isFtyp(bytes, 'heix') || isFtyp(bytes, 'mif1')) {
    return 'image/heic';
  }

  // Check other formats
  for (const format of IMAGE_SIGNATURES) {
    for (const signature of format.signatures) {
      if (matchesSignature(bytes, signature)) {
        return format.mime;
      }
    }
  }

  return null;
}

/**
 * Validate file extension
 */
export function validateExtension(filename: string): {
  valid: boolean;
  extension?: string;
  expectedMime?: string;
} {
  const parts = filename.toLowerCase().split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1] : '';

  if (!extension || !ALLOWED_EXTENSIONS[extension]) {
    return { valid: false };
  }

  return {
    valid: true,
    extension,
    expectedMime: ALLOWED_EXTENSIONS[extension],
  };
}

/**
 * Validate an uploaded image file
 *
 * Checks:
 * 1. File extension is allowed
 * 2. Magic bytes match a valid image format
 * 3. Detected MIME matches the extension (prevents extension spoofing)
 */
export async function validateImageFile(
  file: File
): Promise<ImageValidationResult> {
  // Check extension
  const extResult = validateExtension(file.name);
  if (!extResult.valid) {
    return {
      valid: false,
      error: 'Invalid file extension. Allowed: jpg, jpeg, png, gif, webp',
    };
  }

  // Read first 32 bytes for magic byte detection
  const buffer = await file.slice(0, 32).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Detect actual type from magic bytes
  const detectedMime = detectImageType(bytes);

  if (!detectedMime) {
    return {
      valid: false,
      error: 'File does not appear to be a valid image',
    };
  }

  // Check if detected MIME matches extension
  // Allow JPEG to match both jpg and jpeg extensions
  if (detectedMime !== extResult.expectedMime) {
    return {
      valid: false,
      detectedMime,
      error: `File content (${detectedMime}) does not match extension (.${extResult.extension})`,
    };
  }

  return {
    valid: true,
    detectedMime,
  };
}

/**
 * Get safe file extension from detected MIME type
 */
export function getSafeExtension(mime: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
    'image/avif': 'avif',
    'image/heic': 'heic',
  };
  return mimeToExt[mime] || 'bin';
}
