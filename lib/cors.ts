const PRODUCTION_ORIGINS = [
  'https://www.urbanmanual.co',
  'https://urbanmanual.co',
  'https://www.urbanmanual.com',
  'https://urbanmanual.com',
];

const STAGING_ORIGINS = [
  'https://staging.urbanmanual.co',
  'https://staging.urbanmanual.com',
];

const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
];

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Referer',
].join(', ');

const EXPOSED_HEADERS = [
  'Content-Length',
  'Content-Type',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
].join(', ');

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].join(', ');

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

const PREVIEW_PATTERNS = [
  /^https:\/\/urbanmanual(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/urban-manual(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/urbanmanual-next(?:-[a-z0-9-]+)?\.vercel\.app$/i,
];

const ADDITIONAL_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const STATIC_ORIGINS = new Map(
  [...PRODUCTION_ORIGINS, ...STAGING_ORIGINS, ...LOCAL_ORIGINS, ...ADDITIONAL_ORIGINS].map((origin) => [
    origin.toLowerCase(),
    origin,
  ]),
);

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  const normalized = origin.toLowerCase();
  if (STATIC_ORIGINS.has(normalized)) {
    return STATIC_ORIGINS.get(normalized)!;
  }

  if (PREVIEW_PATTERNS.some((pattern) => pattern.test(origin))) {
    return origin;
  }

  return null;
}

function setCorsHeaders(response: Response, request: Request, allowedOrigin: string) {
  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', requestedHeaders || DEFAULT_ALLOWED_HEADERS);
  response.headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  response.headers.set('Vary', 'Origin');
}

export function applyCors(request: Request, response: Response): Response {
  const allowedOrigin = getAllowedOrigin(request.headers.get('origin'));
  if (!allowedOrigin) {
    return response;
  }

  setCorsHeaders(response, request, allowedOrigin);
  return response;
}

export function corsOptionsResponse(request: Request): Response {
  const allowedOrigin = getAllowedOrigin(request.headers.get('origin'));
  if (!allowedOrigin) {
    return new Response('Origin not allowed', { status: 403 });
  }

  const response = new Response(null, { status: 204 });
  setCorsHeaders(response, request, allowedOrigin);
  response.headers.set('Access-Control-Max-Age', MAX_AGE_SECONDS.toString());
  return response;
}

export function isOriginAllowed(origin: string | null): boolean {
  return Boolean(getAllowedOrigin(origin));
}

export const corsPolicy = {
  allowedMethods: ALLOWED_METHODS,
  exposedHeaders: EXPOSED_HEADERS,
  maxAgeSeconds: MAX_AGE_SECONDS,
  staticOrigins: Array.from(STATIC_ORIGINS.values()),
  previewPatterns: PREVIEW_PATTERNS.map((pattern) => pattern.toString()),
};
