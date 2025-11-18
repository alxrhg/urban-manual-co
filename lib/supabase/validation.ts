/**
 * Supabase Configuration Validation
 * 
 * Strict validation for Supabase environment variables to prevent
 * shipping invalid configurations to production.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate Supabase URL format
 * Must be a valid HTTPS URL pointing to a Supabase project
 */
export function validateSupabaseUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const trimmedUrl = url ? url.trim() : '';

  if (!trimmedUrl) {
    errors.push('Supabase URL is required');
    return { valid: false, errors };
  }

  // Check for placeholder values
  if (trimmedUrl.includes('placeholder') || trimmedUrl.includes('invalid') || trimmedUrl.includes('example')) {
    errors.push('Supabase URL contains placeholder value');
    return { valid: false, errors };
  }

  // Must be HTTPS (except localhost in development)
  if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://localhost')) {
    errors.push('Supabase URL must use HTTPS (or http://localhost for local development)');
  }

  // Must be a valid URL format
  try {
    const urlObj = new URL(trimmedUrl);
    if (!urlObj.hostname) {
      errors.push('Supabase URL must have a valid hostname');
    }
    
    // Check for Supabase domain pattern (warn but don't fail for custom domains)
    // Allow any valid domain - custom domains or different Supabase setups are valid
    // This is just a warning, not a hard requirement
  } catch (e) {
    errors.push(`Supabase URL is not a valid URL format: "${trimmedUrl}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Supabase anon/publishable key
 * Checks for placeholder values and basic validity
 */
export function validateSupabaseAnonKey(key: string): ValidationResult {
  const errors: string[] = [];
  const trimmedKey = key ? key.trim() : '';

  if (!trimmedKey) {
    errors.push('Supabase anon/publishable key is required');
    return { valid: false, errors };
  }

  // Check for placeholder values
  if (trimmedKey.includes('placeholder') || trimmedKey.includes('invalid') || trimmedKey.includes('example')) {
    errors.push('Supabase anon key contains placeholder value');
    return { valid: false, errors };
  }

  // Basic length check - keys should be at least 20 characters
  // (some valid keys might be shorter than 100, so we're more lenient)
  if (trimmedKey.length < 20) {
    errors.push('Supabase anon key appears too short (expected at least 20 characters)');
  }

  // Note: We don't enforce JWT format (eyJ prefix) as some valid Supabase setups
  // might use different key formats. The key just needs to be non-empty and not a placeholder.

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Supabase service role/secret key
 * Checks for placeholder values and basic validity
 */
export function validateSupabaseServiceRoleKey(key: string): ValidationResult {
  const errors: string[] = [];
  const trimmedKey = key ? key.trim() : '';

  if (!trimmedKey) {
    errors.push('Supabase service role key is required');
    return { valid: false, errors };
  }

  // Check for placeholder values
  if (trimmedKey.includes('placeholder') || trimmedKey.includes('invalid') || trimmedKey.includes('example')) {
    errors.push('Supabase service role key contains placeholder value');
    return { valid: false, errors };
  }

  const isNewSecretKey = trimmedKey.startsWith('sb_secret_');
  const isLegacyServiceRoleKey = trimmedKey.startsWith('eyJ');

  if (!isNewSecretKey && !isLegacyServiceRoleKey) {
    errors.push('Supabase service role key must start with "sb_secret_" or be a JWT (starting with "eyJ")');
  }

  if (isLegacyServiceRoleKey && trimmedKey.length < 50) {
    errors.push('Supabase legacy service role key appears too short (expected at least 50 characters)');
  }

  if (isNewSecretKey && trimmedKey.length < 60) { // New keys are longer
    errors.push('Supabase service role key appears too short for its format');
  }
  
  // Note: We don't enforce JWT format (eyJ prefix) as some valid Supabase setups
  // might use different key formats. The key just needs to be non-empty and not a placeholder.

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete Supabase configuration
 */
export function validateSupabaseConfig(
  url: string,
  anonKey: string,
  serviceRoleKey?: string
): ValidationResult {
  const errors: string[] = [];

  const urlValidation = validateSupabaseUrl(url);
  if (!urlValidation.valid) {
    errors.push(...urlValidation.errors);
  }

  const anonKeyValidation = validateSupabaseAnonKey(anonKey);
  if (!anonKeyValidation.valid) {
    errors.push(...anonKeyValidation.errors);
  }

  if (serviceRoleKey) {
    const serviceKeyValidation = validateSupabaseServiceRoleKey(serviceRoleKey);
    if (!serviceKeyValidation.valid) {
      errors.push(...serviceKeyValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  
  return `Supabase Configuration Errors:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
    `Required Environment Variables:\n` +
    `  - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)\n` +
    `  - NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY or PUBLISHABLE_KEY)\n` +
    `  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) - for server-side operations\n`;
}
