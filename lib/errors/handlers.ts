/**
 * Error handling utilities
 *
 * Security: Error details are sanitized in production to prevent
 * information leakage. Full details are only shown in development.
 */

import { NextResponse } from 'next/server';
import { ErrorCode, CustomError } from './types';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Error messages that are safe to show to users (partial - not all codes need custom messages)
const SAFE_ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.VALIDATION_ERROR]: 'Invalid input provided',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.SESSION_EXPIRED]: 'Session expired. Please log in again.',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
  [ErrorCode.EXTERNAL_API_ERROR]: 'An external service error occurred',
  [ErrorCode.DUPLICATE_RESOURCE]: 'Resource already exists',
  [ErrorCode.OPERATION_FAILED]: 'Operation failed. Please try again.',
};

// Patterns that indicate sensitive information
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /supabase/i,
  /postgres/i,
  /sql/i,
  /connection/i,
  /database/i,
  /\.env/i,
];

/**
 * Sanitize error message to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  if (!IS_PRODUCTION) return message;

  // Check if message contains sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return 'An error occurred. Please try again.';
    }
  }

  return message;
}

/**
 * Sanitize error details to remove sensitive information
 */
function sanitizeErrorDetails(details: any): any {
  if (!IS_PRODUCTION || !details) return details;

  // In production, only include safe details
  if (typeof details === 'object') {
    const safeDetails: Record<string, any> = {};

    // Only include specific safe fields
    const safeFields = ['field', 'fields', 'validation', 'required', 'format'];

    for (const field of safeFields) {
      if (field in details) {
        safeDetails[field] = details[field];
      }
    }

    // Return null if no safe fields found
    return Object.keys(safeDetails).length > 0 ? safeDetails : undefined;
  }

  return undefined;
}

interface StandardResponse<TData> {
  success: boolean;
  data: TData | null;
  meta: Record<string, any> | null;
  errors: Array<{
    message: string;
    code: ErrorCode;
    details?: any;
  }>;
}

type SuccessMeta = Record<string, any> | null;

export function createSuccessResponse<TData>(
  data: TData,
  meta: SuccessMeta = null,
  status: number = 200
): NextResponse<StandardResponse<TData>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      errors: [],
    },
    { status }
  );
}

/**
 * Create a standardized error response
 *
 * Security: In production, error messages and details are sanitized
 * to prevent leaking sensitive information.
 */
export function createErrorResponse(
  error: Error | CustomError | unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<StandardResponse<null>> {
  // Handle CustomError
  if (error instanceof CustomError) {
    const safeMessage = IS_PRODUCTION
      ? SAFE_ERROR_MESSAGES[error.code] || sanitizeErrorMessage(error.message)
      : error.message;

    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: null,
        errors: [
          {
            message: safeMessage,
            code: error.code,
            details: sanitizeErrorDetails(error.details),
          },
        ],
      },
      { status: error.statusCode }
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    const safeMessage = IS_PRODUCTION
      ? 'An unexpected error occurred'
      : sanitizeErrorMessage(error.message) || defaultMessage;

    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: null,
        errors: [
          {
            message: safeMessage,
            code: ErrorCode.INTERNAL_SERVER_ERROR,
          },
        ],
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: null,
      errors: [
        {
          message: IS_PRODUCTION ? 'An unexpected error occurred' : defaultMessage,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        },
      ],
    },
    { status: 500 }
  );
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any): CustomError {
  // Handle specific Supabase error codes
  if (error.code === '23505') {
    return new CustomError(
      ErrorCode.DUPLICATE_RESOURCE,
      'A resource with this identifier already exists',
      409,
      { originalError: error.message }
    );
  }

  if (error.code === 'PGRST116') {
    return new CustomError(
      ErrorCode.NOT_FOUND,
      'Resource not found',
      404,
      { originalError: error.message }
    );
  }

  if (error.code === 'PGRST301' || error.message?.includes('RLS')) {
    return new CustomError(
      ErrorCode.FORBIDDEN,
      'Permission denied. Please check your account permissions.',
      403,
      { originalError: error.message }
    );
  }

  // Default Supabase error
  return new CustomError(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed',
    500,
    { originalError: error.message }
  );
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, string[]>
): CustomError {
  return new CustomError(
    ErrorCode.VALIDATION_ERROR,
    message,
    400,
    details
  );
}

/**
 * Create not found error
 */
export function createNotFoundError(resource: string = 'Resource'): CustomError {
  return new CustomError(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    404
  );
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): CustomError {
  return new CustomError(
    ErrorCode.UNAUTHORIZED,
    message,
    401
  );
}

/**
 * Create rate limit error
 */
export function createRateLimitError(
  message: string = 'Rate limit exceeded. Please try again later.'
): CustomError {
  return new CustomError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    429
  );
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): string {
  if (error instanceof CustomError) {
    return `[${error.code}] ${error.message}${error.details ? ` - ${JSON.stringify(error.details)}` : ''}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

