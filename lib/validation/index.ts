import { z, ZodError, type ZodSchema } from 'zod';
import { createValidationError } from '@/lib/errors';

const trimString = () => z.string().trim();

const SearchFiltersSchema = z
  .object({
    city: trimString().min(1).max(120),
    category: trimString().min(1).max(120),
    brand: trimString().min(1).max(120),
    michelinStar: z.number().int().min(0).max(3),
    rating: z.number().min(0).max(5),
    priceLevel: z.number().int().min(1).max(5),
    openNow: z.boolean(),
  })
  .partial()
  .strict();

export const SearchRequestSchema = z
  .object({
    query: trimString().min(2).max(200),
    filters: SearchFiltersSchema.optional().nullable(),
    userId: trimString().min(1).max(128).optional(),
    session_token: trimString().min(1).max(256).optional(),
  })
  .strict();

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const AutocompleteRequestSchema = z
  .object({
    query: trimString().min(2).max(120),
  })
  .strict();

export type AutocompleteRequest = z.infer<typeof AutocompleteRequestSchema>;

export function validateSchema<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  message = 'Invalid request body'
): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const flat = error.flatten();
      const detailsEntries = Object.entries(flat.fieldErrors).filter(([, errors]) => errors && errors.length);
      const details = detailsEntries.length
        ? Object.fromEntries(detailsEntries.map(([key, errors]) => [key, errors!]))
        : undefined;
      throw createValidationError(message, details);
    }
    throw error;
  }
}
