## 2024-05-23 - Public Service Role Endpoints MUST Have Rate Limiting

**Vulnerability:** The `/api/intelligence/suggest-next` endpoint uses `createServiceRoleClient` (bypassing RLS) but lacked any rate limiting or authentication checks. This allowed unauthenticated users to trigger unlimited database queries with admin privileges.
**Learning:** Endpoints that bypass RLS (even for benign features like "suggest next") are effectively open pipes to your database resources. They must be treated as critical security boundaries.
**Prevention:**
1.  **Identify:** Scan for `createServiceRoleClient` usage in `app/api/`.
2.  **Verify:** Check if the endpoint handles `request.auth` or similar.
3.  **Protect:** If public, MANDATORY `enforceRateLimit` (IP-based). If private, MANDATORY auth check + user-based rate limit.
