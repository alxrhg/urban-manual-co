/**
 * Error Sanitization Utility
 *
 * Ensures no raw technical error messages are exposed to users.
 * Part of the "Zero Jank" policy - users should always see helpful,
 * designed error messages instead of raw technical details.
 */

import { ErrorCode } from './types';

/**
 * User-friendly error messages for each error code.
 * These are safe to display to end users.
 */
export const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 'Please sign in to continue.',
  [ErrorCode.FORBIDDEN]: 'You don\'t have permission to access this.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',

  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.INVALID_INPUT]: 'Some information doesn\'t look right. Please check and try again.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',

  // Not Found
  [ErrorCode.NOT_FOUND]: 'We couldn\'t find what you\'re looking for.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'This item doesn\'t exist or may have been removed.',

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'You\'re doing that too fast. Please wait a moment.',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please try again in a few minutes.',

  // Server Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again.',
  [ErrorCode.DATABASE_ERROR]: 'We\'re having trouble loading your data. Please try again.',
  [ErrorCode.EXTERNAL_API_ERROR]: 'A service we rely on isn\'t responding. Please try again.',

  // Business Logic
  [ErrorCode.DUPLICATE_RESOURCE]: 'This already exists.',
  [ErrorCode.OPERATION_FAILED]: 'We couldn\'t complete that action. Please try again.',
};

/**
 * Patterns that indicate sensitive information that should never be shown to users.
 */
const SENSITIVE_PATTERNS = [
  // SQL/Database errors
  /pgrst\d+/i,
  /postgres/i,
  /supabase/i,
  /sql/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /violates.*constraint/i,
  /duplicate key/i,

  // Stack traces
  /at\s+\w+\s+\(/,
  /^\s+at\s+/m,
  /\.tsx?:\d+:\d+/,
  /\.jsx?:\d+:\d+/,
  /node_modules/,

  // Internal paths
  /\/home\//i,
  /\/app\//i,
  /\/lib\//i,
  /\/src\//i,
  /\/var\//i,

  // API/Service errors
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /bearer/i,
  /authorization/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,

  // Generic technical terms
  /undefined is not/i,
  /cannot read prop/i,
  /cannot access/i,
  /is not a function/i,
  /is not defined/i,
  /unexpected.*end of/i,
  /syntax error/i,
  /type.*error/i,
];

/**
 * Check if an error message contains sensitive/technical information
 */
export function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Get a user-friendly message for an error code
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  return USER_FRIENDLY_MESSAGES[code] || USER_FRIENDLY_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR];
}

/**
 * Sanitize an error for display to users.
 * This is the main function to use when showing errors in the UI.
 *
 * @param error - The error to sanitize (can be Error, string, or unknown)
 * @param fallbackMessage - Optional custom fallback message
 * @returns A safe, user-friendly error message
 *
 * @example
 * // In a catch block:
 * catch (error) {
 *   toast.error(sanitizeError(error));
 * }
 *
 * @example
 * // With custom fallback:
 * catch (error) {
 *   toast.error(sanitizeError(error, 'Unable to save your changes'));
 * }
 */
export function sanitizeError(
  error: unknown,
  fallbackMessage: string = 'Something went wrong. Please try again.'
): string {
  // Handle null/undefined
  if (error == null) {
    return fallbackMessage;
  }

  // Handle errors with error codes (CustomError)
  if (typeof error === 'object' && 'code' in error) {
    const code = (error as { code: ErrorCode }).code;
    if (code && USER_FRIENDLY_MESSAGES[code]) {
      return USER_FRIENDLY_MESSAGES[code];
    }
  }

  // Extract message from error object
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  } else {
    return fallbackMessage;
  }

  // Check if the message contains sensitive information
  if (containsSensitiveInfo(message)) {
    return fallbackMessage;
  }

  // If the message is too long or looks technical, use fallback
  if (message.length > 200 || message.includes('{') || message.includes('\\n')) {
    return fallbackMessage;
  }

  // Return the message if it seems safe
  return message;
}

/**
 * Sanitize error for API responses.
 * Use this when returning errors from API routes to ensure
 * sensitive information isn't leaked in responses.
 */
export function sanitizeApiError(
  error: unknown,
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
): { message: string; code: ErrorCode } {
  return {
    message: sanitizeError(error, getUserFriendlyMessage(code)),
    code,
  };
}

/**
 * Context-aware error messages for common operations.
 * Use these for more specific error feedback.
 */
export const ErrorMessages = {
  // Data operations
  load: {
    generic: 'Unable to load data. Please try again.',
    destinations: 'Unable to load destinations. Please try again.',
    profile: 'Unable to load your profile. Please try again.',
    trip: 'Unable to load trip details. Please try again.',
  },

  // Save operations
  save: {
    generic: 'Unable to save changes. Please try again.',
    destination: 'Unable to save this place. Please try again.',
    profile: 'Unable to save your profile. Please try again.',
    trip: 'Unable to save trip. Please try again.',
    collection: 'Unable to save collection. Please try again.',
  },

  // Delete operations
  delete: {
    generic: 'Unable to delete. Please try again.',
    destination: 'Unable to remove this place. Please try again.',
    trip: 'Unable to delete trip. Please try again.',
    collection: 'Unable to delete collection. Please try again.',
    account: 'Unable to delete account. Please try again.',
  },

  // Upload operations
  upload: {
    generic: 'Upload failed. Please try again.',
    image: 'Image upload failed. Please try a different image.',
    tooLarge: 'File is too large. Please choose a smaller file.',
    invalidType: 'Invalid file type. Please choose a supported format.',
  },

  // Search operations
  search: {
    generic: 'Search failed. Please try again.',
    noResults: 'No results found. Try a different search term.',
  },

  // Authentication
  auth: {
    generic: 'Authentication failed. Please try again.',
    signIn: 'Unable to sign in. Please check your credentials.',
    signOut: 'Unable to sign out. Please try again.',
    expired: 'Your session has expired. Please sign in again.',
  },

  // Network
  network: {
    generic: 'Connection error. Please check your internet.',
    timeout: 'Request timed out. Please try again.',
    offline: 'You appear to be offline. Please check your connection.',
  },
} as const;

/**
 * Get a contextual error message for a specific operation.
 *
 * @example
 * catch (error) {
 *   toast.error(getContextualError('save', 'destination'));
 * }
 */
export function getContextualError(
  operation: keyof typeof ErrorMessages,
  context?: string
): string {
  const messages = ErrorMessages[operation];
  if (context && context in messages) {
    return messages[context as keyof typeof messages];
  }
  return messages.generic;
}
