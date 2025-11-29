/**
 * Sanitization Utilities
 *
 * Comprehensive input sanitization for security.
 * Uses DOMPurify for HTML and custom validators for other inputs.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration presets for different sanitization contexts
 */
export const SanitizePresets: Record<string, DOMPurify.Config> = {
  /** Rich text with formatting allowed */
  richText: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  },

  /** Basic text only (no links) */
  basicText: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  },

  /** Plain text (strip all HTML) */
  plainText: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  },

  /** User-generated content (moderate restrictions) */
  userContent: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code',
    ],
    ALLOWED_ATTR: ['href', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  },
};

type SanitizePreset = keyof typeof SanitizePresets;

/**
 * Sanitize HTML with preset or custom configuration
 *
 * @example
 * ```ts
 * // Use preset
 * const safe = sanitizeHtml('<p>Hello</p>', 'richText');
 *
 * // Use custom config
 * const safe = sanitizeHtml('<p>Hello</p>', {
 *   ALLOWED_TAGS: ['p', 'a'],
 * });
 * ```
 */
export function sanitizeHtml(
  html: string,
  preset: SanitizePreset | DOMPurify.Config = 'richText'
): string {
  if (!html) return '';

  const config = typeof preset === 'string' ? SanitizePresets[preset] : preset;
  return DOMPurify.sanitize(html, config);
}

/**
 * Convert HTML to plain text (strip all tags)
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, SanitizePresets.plainText).trim();
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Ensure it's a valid URL
  try {
    const parsed = new URL(url, 'https://example.com');
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If it's a relative URL, it's probably safe
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '';
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  return filename
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove leading dots (hidden files)
    .replace(/^\.+/, '')
    // Limit characters to safe set
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Prevent empty result
    || 'unnamed';
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const trimmed = email.trim().toLowerCase();

  // Basic email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmed)) {
    return '';
  }

  // Additional safety: limit length and characters
  if (trimmed.length > 254) {
    return '';
  }

  return trimmed;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    // Trim whitespace
    .trim()
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, 200);
}

/**
 * Sanitize user input for SQL-like queries (for Supabase text search)
 */
export function sanitizeForTextSearch(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // Escape special characters for ts_query
    .replace(/[&|!():*]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Convert spaces to | for OR search
    .split(' ')
    .filter(Boolean)
    .join(' | ');
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T>(
  input: string,
  validator?: (parsed: unknown) => parsed is T
): T | null {
  if (!input) return null;

  try {
    const parsed = JSON.parse(input);

    if (validator && !validator(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    default?: number;
    integer?: boolean;
  } = {}
): number | undefined {
  const { min, max, default: defaultValue, integer = false } = options;

  const num = typeof input === 'number' ? input : Number(input);

  if (isNaN(num)) {
    return defaultValue;
  }

  let result = integer ? Math.floor(num) : num;

  if (min !== undefined && result < min) {
    result = min;
  }

  if (max !== undefined && result > max) {
    result = max;
  }

  return result;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  input: unknown,
  options: {
    maxLength?: number;
    maxItems?: number;
    transform?: (s: string) => string;
  } = {}
): string[] {
  const { maxLength = 200, maxItems = 100, transform } = options;

  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === 'string')
    .slice(0, maxItems)
    .map((s) => {
      const trimmed = s.trim().slice(0, maxLength);
      return transform ? transform(trimmed) : trimmed;
    })
    .filter(Boolean);
}

/**
 * Create a sanitizer with default options
 */
export function createSanitizer<T>(
  sanitize: (input: unknown) => T,
  defaultValue: T
) {
  return (input: unknown): T => {
    try {
      const result = sanitize(input);
      return result ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };
}

/**
 * Escape HTML entities for safe text display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => map[entity]);
}
