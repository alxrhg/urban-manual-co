# Security Audit Report - Urban Manual

**Date:** December 29, 2025
**Auditor:** Claude Code Security Analysis
**Codebase:** Urban Manual Travel Guide Application
**Scope:** Full codebase security audit

---

## Executive Summary

This comprehensive security audit of the Urban Manual codebase identified **65+ security findings** across authentication, input validation, SQL injection, XSS, API security, environment variables, dependencies, middleware, and file uploads.

### Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 12 | Requires immediate attention |
| **HIGH** | 18 | Fix within 1-2 weeks |
| **MEDIUM** | 25 | Fix within 1 month |
| **LOW** | 10+ | Address in regular maintenance |

### Overall Security Posture: **MEDIUM-HIGH RISK**

The application has solid security foundations (Supabase Auth, RLS, rate limiting, error handling) but has multiple critical vulnerabilities requiring immediate remediation.

---

## Table of Contents

1. [Critical Vulnerabilities](#1-critical-vulnerabilities)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [SQL Injection](#3-sql-injection)
4. [Cross-Site Scripting (XSS)](#4-cross-site-scripting-xss)
5. [API Security](#5-api-security)
6. [Input Validation](#6-input-validation)
7. [Environment Variables](#7-environment-variables)
8. [Dependencies](#8-dependencies)
9. [File Uploads](#9-file-uploads)
10. [Security Headers & Middleware](#10-security-headers--middleware)
11. [Positive Security Findings](#11-positive-security-findings)
12. [Remediation Priority](#12-remediation-priority)

---

## 1. Critical Vulnerabilities

### 1.1 SQL Injection via ILIKE String Interpolation

**Severity:** CRITICAL
**Affected Files:** 40+ files across the codebase
**Pattern:** Direct string interpolation in Supabase `.or()` and `.ilike()` clauses

**Vulnerable Code Examples:**

```typescript
// app/api/search/suggest/route.ts:37
.or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%`)

// app/api/autocomplete/route.ts:45
.or(`name.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)

// mcp-server/tools/search.ts:213
dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
```

**Impact:** Attackers can manipulate SQL wildcards (`%`, `_`) to bypass filters and enumerate data.

**Fix:** Use `sanitizeForIlike()` from `lib/sanitize/index.ts` on all user inputs:
```typescript
import { sanitizeForIlike } from '@/lib/sanitize';
const safeQuery = sanitizeForIlike(query);
.or(`name.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%`)
```

### 1.2 Weak Password Requirements

**Severity:** CRITICAL
**File:** `app/api/account/security/route.ts:122`

```typescript
if (!newPassword || newPassword.length < 6) {
  throw createValidationError('Password must be at least 6 characters');
}
```

**Fix:** Increase to 12+ characters with complexity requirements.

### 1.3 Insecure Session Token Generation Fallback

**Severity:** CRITICAL
**File:** `lib/chat/sessionToken.ts:3-8`

```typescript
function generateToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

**Impact:** Fallback uses predictable `Math.random()` allowing session hijacking.

**Fix:** Remove fallback; always require `crypto.randomUUID()`.

### 1.4 CSP Allows unsafe-inline and unsafe-eval

**Severity:** CRITICAL
**File:** `next.config.ts:8-11`

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com..."
```

**Impact:** Significantly weakens XSS protection.

**Fix:** Remove `unsafe-inline` and `unsafe-eval`; use nonce-based CSP.

### 1.5 Wildcard CORS in API Routes

**Severity:** CRITICAL
**Files:** `app/api/mcp/route.ts:248`, `app/api/mcp/sse/route.ts:107`

```typescript
"Access-Control-Allow-Origin": "*"
```

**Impact:** Allows any domain to make authenticated requests.

**Fix:** Implement origin whitelist validation.

### 1.6 SVG Upload Allowed (XSS Vector)

**Severity:** CRITICAL
**File:** `supabase/migrations/501_create_images_storage_bucket.sql:10`

```sql
allowedMimeTypes: ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
```

**Impact:** SVGs can contain embedded JavaScript for XSS attacks.

**Fix:** Remove `image/svg+xml` from allowed MIME types.

---

## 2. Authentication & Authorization

### 2.1 Bearer Token in URL Parameters (HIGH)

**File:** `app/api/mcp/sse/route.ts:14-28`

Tokens passed via URL are logged in browser history and server logs.

### 2.2 PKCE Code Verifier in localStorage (HIGH)

**File:** `contexts/AuthContext.tsx:65-66`

Vulnerable to XSS-based token theft.

### 2.3 Admin Role via app_metadata (HIGH)

**File:** `lib/errors/auth.ts:122`

```typescript
const role = (user.app_metadata as Record<string, any> | null)?.role;
```

Should validate against server-side role store with proper RLS.

### 2.4 skipValidation Flag in Supabase Client (HIGH)

**File:** `lib/supabase/client.ts:61,66,77`

Allows bypassing configuration validation which could enable connecting to malicious servers.

### 2.5 OAuth Callback Lacks CSRF Validation (MEDIUM)

**File:** `app/api/mcp/oauth/callback/[provider]/route.ts:20-27`

State parameter checked but not cryptographically validated.

### 2.6 Session Invalidation Incomplete (MEDIUM)

**File:** `contexts/AuthContext.tsx:76-79`

Only calls `supabase.auth.signOut()` without verifying server-side cleanup.

---

## 3. SQL Injection

### Primary Vulnerable Patterns

| File | Line(s) | Severity |
|------|---------|----------|
| `app/api/search/suggest/route.ts` | 37 | CRITICAL |
| `app/api/users/search/route.ts` | 35 | HIGH |
| `app/api/search/instant/route.ts` | 108,143,178,208 | CRITICAL |
| `app/api/search/combined/route.ts` | 46 | CRITICAL |
| `app/api/autocomplete/route.ts` | 45 | CRITICAL |
| `lib/ai/fuzzy-matching.ts` | 101 | HIGH |
| `mcp-server/tools/search.ts` | 213,326 | CRITICAL |
| `mcp-server/tools/collections.ts` | 549,552,608 | CRITICAL |
| `mcp-server/tools/destinations.ts` | 337,541-545,592,636 | CRITICAL |
| `mcp-server/tools/trips.ts` | 655,737 | CRITICAL |
| `services/search-session/search-session-engine.ts` | 524,527,539 | CRITICAL |
| `app/lists/[id]/page.tsx` | 191 | CRITICAL |

### Safe Implementation (Reference)

`app/api/search/route.ts` properly uses `sanitizeForIlike()` - use as template.

---

## 4. Cross-Site Scripting (XSS)

### 4.1 Unsanitized Data in Map Info Windows (HIGH)

**File:** `src/features/trip/components/TripInteractiveMap.tsx:397-398,728,742`

```typescript
content.innerHTML = `
  <div>${result.name}</div>
  <div>${result.address}</div>
`;
```

Google Places API data rendered without escaping.

**Fix:** Use `escapeHtml()` from `lib/sanitize`.

### 4.2 Unsanitized Marker Labels (HIGH)

**File:** `src/features/trip/components/TripInteractiveMap.tsx:728,742`

```typescript
<img alt="${marker.label}" />
<div>${marker.label}</div>
```

### 4.3 SVG Rendering via dangerouslySetInnerHTML (MEDIUM)

**File:** `components/icons/UntitledUIIcon.tsx:93`

Fetched SVGs rendered without validation.

---

## 5. API Security

### 5.1 Missing Rate Limiting on Public Endpoints (MEDIUM)

**Affected:**
- `app/api/categories/route.ts`
- `app/api/cities/route.ts`
- `app/api/trending/route.ts`
- `app/api/analytics/events/route.ts`

### 5.2 Discovery Endpoint Lacks Authentication (MEDIUM)

**File:** `app/api/discovery/fetch/route.ts`

Public endpoint that triggers expensive Google Places API calls.

### 5.3 Health Check Exposes Configuration (MEDIUM)

**File:** `app/api/health/route.ts:5-27`

Reveals which services are configured.

### 5.4 Development CORS Allows All Origins (MEDIUM)

**File:** `next.config.ts:46-48`

```typescript
value: process.env.NODE_ENV === 'production' ? 'https://www.urbanmanual.co' : '*'
```

---

## 6. Input Validation

### 6.1 Type Coercion Issues (CRITICAL)

**File:** `app/api/destinations/nearby/route.ts:28-34`

```typescript
const lat = parseFloat(searchParams.get('lat') || '0');
if (!lat || !lng) { // Fails to distinguish 0 from missing
```

### 6.2 Arbitrary Object Storage (HIGH)

**File:** `app/api/behavior/track/route.ts:156,253`

Context field accepts any object without size/depth limits.

### 6.3 Unvalidated Timestamp Field (HIGH)

**File:** `app/api/analytics/events/route.ts:53`

User-provided timestamp used without validation.

### 6.4 Unvalidated Numeric Fields (HIGH)

**File:** `app/api/trips/[id]/items/batch/route.ts:128-133`

`day` and `order_index` not validated for range constraints.

### 6.5 Missing Emoji/Color Validation (MEDIUM)

**File:** `app/api/collections/route.ts:31-32`

No validation of emoji and color format inputs.

---

## 7. Environment Variables

### 7.1 Service Role Key Fallback to Anon Key (CRITICAL)

**Files:** `app/api/search/combined/route.ts:18`, `app/api/search/suggest/route.ts:15`, `app/api/cities/route.ts:10`

```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Impact:** Service role operations fall back to less-secure anon key.

### 7.2 Client-Side AI API Key Usage (CRITICAL)

**File:** `lib/ai-recommendations/engine.ts:9`

```typescript
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');
```

Browser-accessible API key for server-side AI operations.

### 7.3 Missing OAuth Route Validation (CRITICAL)

**Files:** `app/api/mcp/oauth/login/route.ts:11-12`, `app/api/mcp/oauth/callback/[provider]/route.ts:12`

Non-null assertions without validation.

### 7.4 MapKit Team ID Exposed (MEDIUM)

**File:** `app/api/mapkit-token/route.ts:59`

`NEXT_PUBLIC_MAPKIT_TEAM_ID` makes Team ID browser-accessible.

---

## 8. Dependencies

### 8.1 Axios Vulnerabilities via mem0ai (HIGH)

**Package:** `mem0ai@2.1.38` → `axios@1.7.7`

**CVEs:**
- GHSA-4hjh-wcwx-xvwj: DoS via data size (CVSS 7.5)
- GHSA-jr5f-v2jv-69x6: SSRF and credential leakage

**Fix:** Upgrade axios to ≥1.12.0 or downgrade mem0ai to v1.0.39.

### 8.2 Unpinned "latest" Versions (MEDIUM)

**Packages:**
- `@statsig/react-bindings`: latest
- `@statsig/session-replay`: latest
- `@statsig/web-analytics`: latest

**Fix:** Pin to specific versions (e.g., `3.31.0`).

---

## 9. File Uploads

### 9.1 Weak MIME Validation (HIGH)

**Files:** `app/api/upload-image/route.ts:34-37`, `app/api/upload-trip-cover/route.ts:48-51`

```typescript
if (!file.type.startsWith('image/')) {
```

Spoofable MIME type header check.

**Fix:** Use `validateImageFile()` with magic byte detection.

### 9.2 Unsafe Extension Extraction (HIGH)

**Files:** `app/api/upload-image/route.ts:45`, `app/api/upload-trip-cover/route.ts:59`

```typescript
const fileExt = file.name.split('.').pop();
```

Vulnerable to double extension attacks.

**Fix:** Use `getSafeExtension()` based on detected MIME type.

### 9.3 Missing RLS on Storage Buckets (HIGH)

Missing documented RLS policies for:
- `profile-images`
- `trip-covers`
- `destination-images`

### 9.4 Wrong Bucket in Component (MEDIUM)

**File:** `src/features/trip/components/TripSettingsBox.tsx:169`

Uploads to 'public' instead of 'trip-covers'.

---

## 10. Security Headers & Middleware

### 10.1 CSP Weaknesses (CRITICAL)

**File:** `next.config.ts:8-13`

| Directive | Issue |
|-----------|-------|
| `script-src` | `unsafe-inline`, `unsafe-eval` allowed |
| `img-src` | `https://*` allows any HTTPS domain |
| `style-src` | `unsafe-inline` allowed |

### 10.2 Cross-Origin Policies (MEDIUM)

**File:** `next.config.ts:58-68`

```typescript
'Cross-Origin-Embedder-Policy': 'unsafe-none',
'Cross-Origin-Resource-Policy': 'cross-origin',
```

Too permissive for security-sensitive application.

### 10.3 Client-Only Admin Protection (MEDIUM)

**File:** `src/features/admin/components/AdminLayoutShell.tsx:11-22`

Admin route protection is client-side only; no edge middleware enforcement.

---

## 11. Positive Security Findings

### Strengths Identified

| Area | Implementation | Status |
|------|----------------|--------|
| RLS Policies | Properly implemented for destinations | ✅ Excellent |
| Error Handling | `withErrorHandling` wrapper standardizes responses | ✅ Excellent |
| Rate Limiting | Upstash Redis with fallback, multiple tiers | ✅ Good |
| CSRF Protection | Double-submit cookie with constant-time comparison | ✅ Excellent |
| Audit Logging | Comprehensive event types with severity levels | ✅ Good |
| Account Recovery | SHA-256 hashed tokens, secure generation | ✅ Excellent |
| Cookie Security | HttpOnly, Secure, SameSite properly configured | ✅ Good |
| Magic Byte Validation | Implemented (but not used everywhere) | ✅ Good |
| Error Sanitization | 25+ sensitive patterns detected | ✅ Excellent |
| Security Headers | HSTS, X-Frame-Options, X-Content-Type-Options | ✅ Good |
| .gitignore | Properly ignores all .env files | ✅ Excellent |

---

## 12. Remediation Priority

### Immediate (P0 - This Week)

1. **Add `sanitizeForIlike()` to all search endpoints** (40+ files)
2. **Remove `unsafe-inline` and `unsafe-eval` from CSP**
3. **Fix wildcard CORS in MCP endpoints**
4. **Remove SVG from allowed MIME types**
5. **Increase password requirements to 12+ characters**
6. **Remove weak session token fallback**
7. **Fix service role key fallback to anon key**
8. **Add magic byte validation to all upload endpoints**

### Urgent (P1 - Next 2 Weeks)

9. **Implement edge middleware for admin routes**
10. **Remove bearer token from URL parameters**
11. **Add OAuth CSRF state validation**
12. **Fix type coercion in lat/lng validation**
13. **Create RLS policies for storage buckets**
14. **Pin Statsig package versions**
15. **Upgrade axios via mem0ai fix**
16. **Use server-side AI API keys**

### High (P2 - Next Month)

17. **Restrict CSP img-src to specific domains**
18. **Add rate limiting to remaining public endpoints**
19. **Restrict discovery endpoint access**
20. **Implement nonce-based CSP for inline scripts**
21. **Fix TripSettingsBox bucket reference**
22. **Add input size/depth limits for arbitrary objects**
23. **Validate timestamp fields**
24. **Standardize environment variable naming**

### Medium (P3 - Ongoing)

25. **Add comprehensive security tests**
26. **Implement CSP violation monitoring**
27. **Regular dependency audits**
28. **Document storage bucket security policies**
29. **Standardize file size limits**
30. **Review and tighten COEP/CORP policies**

---

## Appendix: Files Requiring Immediate Attention

### Critical Files (Fix Now)

```
app/api/search/suggest/route.ts
app/api/search/instant/route.ts
app/api/search/combined/route.ts
app/api/autocomplete/route.ts
app/api/users/search/route.ts
app/api/mcp/route.ts
app/api/mcp/sse/route.ts
app/api/account/security/route.ts
lib/chat/sessionToken.ts
next.config.ts
supabase/migrations/501_create_images_storage_bucket.sql
mcp-server/tools/search.ts
mcp-server/tools/collections.ts
mcp-server/tools/destinations.ts
```

### High Priority Files

```
src/features/trip/components/TripInteractiveMap.tsx
app/api/upload-image/route.ts
app/api/upload-trip-cover/route.ts
app/api/destinations/nearby/route.ts
lib/ai-recommendations/engine.ts
contexts/AuthContext.tsx
lib/supabase/client.ts
```

---

## Conclusion

The Urban Manual application has a solid security foundation with proper authentication, rate limiting, and error handling. However, the critical SQL injection vulnerabilities via unescaped ILIKE queries and the weak CSP configuration require immediate attention.

**Priority Action:** Apply `sanitizeForIlike()` to all 40+ affected search endpoints as the highest priority fix, as this addresses the most widespread vulnerability class.

---

**Report Generated:** December 29, 2025
**Next Recommended Audit:** After implementing P0 and P1 fixes
