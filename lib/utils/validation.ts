import { NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { createValidationError } from '@/lib/errors';

interface LimitSchemaOptions {
  min?: number;
  max?: number;
  defaultValue?: number;
  label?: string;
}

export function createLimitSchema(options: LimitSchemaOptions = {}) {
  const { min = 1, max = 100, defaultValue = 20, label = 'limit' } = options;
  const labelText = label.charAt(0).toUpperCase() + label.slice(1);

  return z
    .coerce.number({ invalid_type_error: `${labelText} must be a number` })
    .int(`${labelText} must be an integer`)
    .min(min, `${labelText} must be at least ${min}`)
    .max(max, `${labelText} must be at most ${max}`)
    .default(defaultValue);
}

/**
 * Common reusable schemas
 */
export const coordinatesSchema = z.object({
  lat: z
    .coerce.number({ invalid_type_error: 'Latitude must be a number' })
    .min(-90, 'Latitude must be greater than or equal to -90')
    .max(90, 'Latitude must be less than or equal to 90'),
  lng: z
    .coerce.number({ invalid_type_error: 'Longitude must be a number' })
    .min(-180, 'Longitude must be greater than or equal to -180')
    .max(180, 'Longitude must be less than or equal to 180'),
});

export const paginationSchema = z.object({
  limit: createLimitSchema(),
  offset: z
    .coerce.number({ invalid_type_error: 'Offset must be a number' })
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0),
});

export const filtersSchema = z.object({
  city: z
    .string({ invalid_type_error: 'City must be a string' })
    .trim()
    .min(1, 'City cannot be empty')
    .max(120, 'City must be shorter than 120 characters')
    .optional(),
  categories: z
    .array(z.string().trim().min(1, 'Category name cannot be empty'))
    .max(10, 'You can filter by up to 10 categories at a time')
    .optional(),
  tags: z
    .array(z.string().trim().min(1, 'Tag cannot be empty'))
    .max(15, 'You can filter by up to 15 tags at a time')
    .optional(),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FiltersInput = z.infer<typeof filtersSchema>;

/**
 * Convert a Zod error into a map of field errors
 */
export function formatValidationErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join('.') || 'root';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(issue.message);
    return acc;
  }, {});
}

type SearchParamsSource = NextRequest | URL | URLSearchParams | string;

function toSearchParams(source: SearchParamsSource): URLSearchParams {
  if (typeof source === 'string') {
    return new URL(source).searchParams;
  }

  if (source instanceof URL) {
    return source.searchParams;
  }

  if (source instanceof URLSearchParams) {
    return source;
  }

  return source.nextUrl.searchParams;
}

interface ParseOptions {
  errorMessage?: string;
}

export function parseSearchParams<T extends z.ZodTypeAny>(
  source: SearchParamsSource,
  schema: T,
  options: ParseOptions = {}
): z.infer<T> {
  const params = Object.fromEntries(toSearchParams(source).entries());
  const parsed = schema.safeParse(params);

  if (!parsed.success) {
    throw createValidationError(
      options.errorMessage ?? 'Invalid query parameters',
      formatValidationErrors(parsed.error)
    );
  }

  return parsed.data;
}

interface ParseBodyOptions extends ParseOptions {
  allowEmpty?: boolean;
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest | Request,
  schema: T,
  options: ParseBodyOptions = {}
): Promise<z.infer<T>> {
  const { allowEmpty = true } = options;
  let rawText: string;

  try {
    rawText = await request.text();
  } catch (error) {
    throw createValidationError(options.errorMessage ?? 'Unable to read request body');
  }

  const textToParse = rawText.trim();

  if (!textToParse && !allowEmpty) {
    throw createValidationError(options.errorMessage ?? 'Request body is required');
  }

  let payload: unknown = {};

  if (textToParse.length > 0) {
    try {
      payload = JSON.parse(textToParse);
    } catch (error) {
      throw createValidationError(options.errorMessage ?? 'Invalid JSON body');
    }
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw createValidationError(
      options.errorMessage ?? 'Invalid request body',
      formatValidationErrors(parsed.error)
    );
  }

  return parsed.data;
}

