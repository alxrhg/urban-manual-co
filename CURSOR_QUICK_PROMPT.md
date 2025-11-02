# Quick Fix Prompt for Cursor

Copy this prompt into Cursor's chat:

---

Fix the critical security issues identified in CODE_REVIEW_REPORT.md. Start with these urgent fixes:

1. **Fix Admin Authentication** - Replace email header checks with proper Supabase Auth verification in:
   - `/app/api/is-admin/route.ts`
   - `/app/api/upload-image/route.ts`
   - `/app/api/enrich-google/route.ts`
   
   Use this pattern: Get authenticated user via `createServerClient()`, verify JWT token, then check if email is in admin list. Never trust headers alone.

2. **Fix Service Role Key Fallbacks** - Remove fallbacks to anon key in:
   - `/app/api/ai-chat/route.ts`
   - `/app/api/search/route.ts`
   - `/app/api/enrich-google/route.ts`
   - `/app/api/gemini-place-recommendations/route.ts`
   - `/app/api/gemini-recommendations/route.ts`
   
   Fail fast if `SUPABASE_SERVICE_ROLE_KEY` is missing - never fall back to anon key.

3. **Remove Placeholder Credentials** - Replace all placeholder fallbacks with proper validation that throws errors if env vars are missing.

4. **Secure Google Maps API Keys** - Move map embed logic to server-side proxy endpoint to avoid exposing API keys in client code.

After security fixes, proceed with:
- Replace `any` types with proper TypeScript interfaces
- Implement structured logging (replace 135+ console.log statements)
- Extract duplicated code (embedding generation, query parsing, category synonyms)
- Add rate limiting to API endpoints
- Standardize API response formats

Work systematically through each fix, test after each change, and maintain existing functionality.
