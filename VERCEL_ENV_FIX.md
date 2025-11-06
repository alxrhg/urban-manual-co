# Vercel Environment Variable Fix

## Issue
The application was throwing an error: "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"

## Root Cause
In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are **inlined into the client-side bundle at build time**. This means:
- They must be available when the build runs
- If you add/change them after deployment, you must rebuild
- They cannot be changed at runtime on the client-side

## Solution Applied

### Code Fix
Updated `lib/supabase.ts` to only throw errors for missing environment variables on the **server-side** in production. Client-side code now uses placeholder values if env vars are missing (which should only happen during development).

### Required Steps in Vercel

1. **Verify Environment Variables are Set**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Ensure these are set for **Production** environment:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Trigger a New Deployment**
   - After adding/modifying environment variables, you MUST rebuild
   - Option 1: Go to Deployments → click "..." on latest deployment → "Redeploy"
   - Option 2: Push a new commit to trigger automatic deployment
   - Option 3: Use Vercel CLI: `vercel --prod`

3. **Verify the Fix**
   - After deployment completes, check your application
   - The environment variables should now be available in the browser bundle

## Prevention

To avoid this issue in the future:
- Always set required environment variables BEFORE first deployment
- Remember that `NEXT_PUBLIC_*` variables require a rebuild to take effect
- Use the provided `.env.example` file as a template
- Test locally with `.env.local` before deploying

## Additional Notes

If you still see the error after rebuilding:
1. Check the Vercel build logs to ensure env vars were available during build
2. Verify the variable names match exactly (case-sensitive)
3. Ensure there are no typos in the variable names
4. Check that variables are set for the correct environment (Production/Preview/Development)
