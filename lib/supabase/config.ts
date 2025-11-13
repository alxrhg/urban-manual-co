const URL_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const;
const ANON_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
] as const;
const SERVICE_ENV_KEYS = ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const MIN_KEY_LENGTH = 20;
const PLACEHOLDER_PATTERNS = [/placeholder/i, /example/i, /your[-_]?project/i];

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

export type SupabaseConfigErrorCode =
  | 'MISSING_URL'
  | 'INVALID_URL'
  | 'MISSING_ANON_KEY'
  | 'INVALID_ANON_KEY'
  | 'MISSING_SERVICE_ROLE_KEY'
  | 'INVALID_SERVICE_ROLE_KEY';

export class SupabaseConfigError extends Error {
  constructor(
    public readonly code: SupabaseConfigErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

type SupabaseConfigResult =
  | { ok: true; value: SupabaseConfig }
  | { ok: false; error: SupabaseConfigError };

let cachedResult: SupabaseConfigResult | null = null;
const loggedErrorKeys = new Set<string>();

export function getSupabaseConfigResult(): SupabaseConfigResult {
  if (!cachedResult) {
    cachedResult = resolveSupabaseConfig(process.env);
  }
  return cachedResult;
}

export function getSupabaseConfigOrThrow(options?: { requireServiceRole?: boolean }): SupabaseConfig {
  const result = getSupabaseConfigResult();
  if (!result.ok) {
    throw result.error;
  }

  if (options?.requireServiceRole && !result.value.serviceRoleKey) {
    throw new SupabaseConfigError(
      'MISSING_SERVICE_ROLE_KEY',
      `Supabase service role key is not configured. Set one of: ${SERVICE_ENV_KEYS.join(', ')}`,
      { envKeys: SERVICE_ENV_KEYS }
    );
  }

  return result.value;
}

export function logSupabaseConfigErrorOnce(source: string, error: SupabaseConfigError) {
  const key = `${source}:${error.code}`;
  if (loggedErrorKeys.has(key)) return;
  loggedErrorKeys.add(key);

  if (process.env.NODE_ENV === 'test') return;

  const metaDetails = error.meta ? `\nMeta: ${JSON.stringify(error.meta)}` : '';
  console.error(`[Supabase][${source}] ${error.message}${metaDetails}`);
}

export function resetSupabaseConfigCache() {
  cachedResult = null;
  loggedErrorKeys.clear();
}

function resolveSupabaseConfig(env: NodeJS.ProcessEnv): SupabaseConfigResult {
  const url = pickFirst(env, URL_ENV_KEYS);
  if (!url) {
    return failure(
      'MISSING_URL',
      `Supabase URL is not configured. Set one of: ${URL_ENV_KEYS.join(', ')}`,
      { envKeysTried: URL_ENV_KEYS }
    );
  }

  if (!isValidUrl(url) || looksLikePlaceholder(url)) {
    return failure(
      'INVALID_URL',
      'Supabase URL must be an http(s) URL and not a placeholder. Update your environment variables.',
      { valuePreview: url }
    );
  }

  const anonKey = pickFirst(env, ANON_ENV_KEYS);
  if (!anonKey) {
    return failure(
      'MISSING_ANON_KEY',
      `Supabase anon/publishable key is not configured. Set one of: ${ANON_ENV_KEYS.join(', ')}`,
      { envKeysTried: ANON_ENV_KEYS }
    );
  }

  if (!isPlausibleKey(anonKey)) {
    return failure(
      'INVALID_ANON_KEY',
      'Supabase anon/publishable key appears to be invalid. Copy a fresh key from Supabase project settings.',
      { keyLength: anonKey.length }
    );
  }

  const serviceRoleKey = pickFirst(env, SERVICE_ENV_KEYS);
  if (serviceRoleKey && !isPlausibleKey(serviceRoleKey)) {
    return failure(
      'INVALID_SERVICE_ROLE_KEY',
      'Supabase service role key appears to be invalid. Ensure you pasted the secret key correctly.',
      { keyLength: serviceRoleKey.length }
    );
  }

  return { ok: true, value: { url, anonKey, serviceRoleKey } };
}

function failure(code: SupabaseConfigErrorCode, message: string, meta?: Record<string, unknown>): SupabaseConfigResult {
  return { ok: false, error: new SupabaseConfigError(code, message, meta) };
}

function pickFirst(env: NodeJS.ProcessEnv, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value));
}

function isPlausibleKey(value: string): boolean {
  if (!value || value.length < MIN_KEY_LENGTH) return false;
  if (looksLikePlaceholder(value)) return false;
  return true;
}

export { resolveSupabaseConfig };
