# Production Deployment Checklist

Use this checklist to verify your Urban Manual deployment is production-ready.

---

## 1. Environment Configuration

### Required Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- [ ] `NEXT_PUBLIC_SITE_URL` - Production URL (https://www.urbanmanual.co)

### Error Tracking (Sentry)

- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for client-side
- [ ] `SENTRY_DSN` - Sentry DSN for server-side
- [ ] `SENTRY_AUTH_TOKEN` - For source map uploads
- [ ] Verify Sentry project exists at https://sentry.io

### Analytics

- [ ] `NEXT_PUBLIC_STATSIG_CLIENT_KEY` - Statsig client key
- [ ] Google Analytics configured (GA4: G-ZLGK6QXD88)
- [ ] Vercel Analytics enabled in project settings

### AI Services

- [ ] `GEMINI_API_KEY` - Google Gemini API
- [ ] `OPENAI_API_KEY` - OpenAI API (for embeddings)
- [ ] `GOOGLE_AI_API_KEY` - Google AI API

### Maps

- [ ] `NEXT_PUBLIC_GOOGLE_API_KEY` - Google Maps API
- [ ] `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` - Mapbox (optional)

### Caching & Rate Limiting

- [ ] `UPSTASH_REDIS_REST_URL` - Upstash Redis
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- [ ] `UPSTASH_VECTOR_REST_URL` - Upstash Vector (semantic search)
- [ ] `UPSTASH_VECTOR_REST_TOKEN` - Upstash Vector token

---

## 2. Vercel Configuration

### Project Settings

- [ ] Production branch set to `main`
- [ ] Environment variables added to Production environment
- [ ] Build command: `next build`
- [ ] Install command: `npm install`
- [ ] Root directory: `/`

### Domain Configuration

- [ ] Custom domain added: `urbanmanual.co` and `www.urbanmanual.co`
- [ ] SSL certificate auto-generated
- [ ] Redirect www to non-www (or vice versa) configured
- [ ] DNS records configured:
  - `A` record pointing to Vercel
  - `CNAME` for www subdomain

### Performance

- [ ] Edge Functions enabled (automatic with Next.js)
- [ ] Image Optimization enabled
- [ ] Cron jobs verified in `vercel.json`

---

## 3. Security

### Headers (Verified in next.config.ts)

- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Strict-Transport-Security` (HSTS)
- [x] Content Security Policy (CSP)
- [x] `Referrer-Policy: strict-origin-when-cross-origin`

### Authentication

- [ ] Supabase Auth configured
- [ ] Google OAuth credentials (production)
- [ ] Apple Sign-In credentials (production)
- [ ] Admin routes protected via middleware

### Data Protection

- [ ] Service role key never exposed to client
- [ ] API routes validate authentication
- [ ] Rate limiting configured for public endpoints
- [ ] Input sanitization via DOMPurify

---

## 4. Error Handling

### Error Boundaries

- [x] Root error boundary: `app/error.tsx`
- [x] Global error boundary: `app/global-error.tsx`
- [x] 404 page: `app/not-found.tsx`
- [x] Offline page: `app/~offline/page.tsx`

### Sentry Configuration

- [x] Client-side tracking: `sentry.client.config.ts`
- [x] Server-side tracking: `sentry.server.config.ts`
- [x] Edge tracking: `sentry.edge.config.ts`
- [x] Sample rates optimized for production (10%)
- [x] Noisy errors filtered (ResizeObserver, chunk loading)

---

## 5. SEO & Performance

### Meta Tags (Verified in app/layout.tsx)

- [x] Title and description
- [x] OpenGraph tags
- [x] Twitter Card tags
- [x] Favicon and app icons
- [x] manifest.json for PWA

### SEO Files

- [x] `robots.txt` - Search engine crawling rules
- [x] `sitemap.ts` - Dynamic sitemap generation
- [ ] Verify sitemap at https://www.urbanmanual.co/sitemap.xml

### Performance

- [x] Image optimization enabled (AVIF, WebP)
- [x] Font preloading configured
- [x] CSS optimization enabled
- [x] JavaScript bundle optimization
- [ ] Run Lighthouse audit (target: 90+ performance)
- [ ] Verify Core Web Vitals in Vercel dashboard

---

## 6. Monitoring

### Error Tracking

- [ ] Test Sentry integration (throw test error)
- [ ] Set up Sentry alerts for critical errors
- [ ] Configure on-call notifications

### Analytics

- [ ] Verify Vercel Analytics receiving data
- [ ] Verify Google Analytics tracking
- [ ] Set up key event tracking

### Uptime

- [ ] Configure uptime monitoring (UptimeRobot, Better Uptime, etc.)
- [ ] Set up status page (optional)

---

## 7. Pre-Launch Tests

### Functionality

- [ ] User registration and login
- [ ] Destination browsing and search
- [ ] Map functionality
- [ ] Trip planning features
- [ ] AI chat/recommendations

### Cross-Browser Testing

- [ ] Chrome (desktop/mobile)
- [ ] Safari (desktop/iOS)
- [ ] Firefox
- [ ] Edge

### Mobile Testing

- [ ] iPhone (various sizes)
- [ ] Android devices
- [ ] Tablet layouts

### Performance Testing

```bash
# Run Lighthouse CI
npx lighthouse https://www.urbanmanual.co --output=json --output-path=./lighthouse-report.json

# Or use PageSpeed Insights
# https://pagespeed.web.dev/
```

---

## 8. Post-Deployment

### Verify

- [ ] Site loads at production URL
- [ ] SSL certificate valid
- [ ] All environment variables working
- [ ] Cron jobs running (check Vercel logs)
- [ ] Error tracking receiving events

### Monitor

- [ ] Watch Sentry for new errors (first 24h)
- [ ] Check Vercel Analytics for traffic
- [ ] Review server logs for issues

### Document

- [ ] Update team on deployment
- [ ] Document any configuration changes
- [ ] Update runbook if needed

---

## Quick Commands

```bash
# Build locally to catch errors
npm run build

# Run linting
npm run lint

# Run tests
npm run test:unit

# Check TypeScript
npx tsc --noEmit
```

---

## Troubleshooting

### Build Failures

1. Check for TypeScript errors: `npx tsc --noEmit`
2. Check for lint errors: `npm run lint`
3. Verify all environment variables are set
4. Check Vercel build logs for specific errors

### 500 Errors in Production

1. Check Sentry for error details
2. Review Vercel function logs
3. Verify database connectivity
4. Check API rate limits

### Slow Performance

1. Run Lighthouse audit
2. Check image sizes and optimization
3. Review bundle analyzer: `ANALYZE=true npm run build`
4. Check database query performance

---

## Support

- GitHub Issues: https://github.com/alxrhg/urban-manual-co/issues
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
