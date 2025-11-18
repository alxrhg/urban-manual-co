/**
 * Client-side flag to toggle ML-powered features off when ML service is unavailable.
 * Controlled via NEXT_PUBLIC_ENABLE_ML environment variable.
 */
export const isMlClientEnabled =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_ENABLE_ML === 'true';
