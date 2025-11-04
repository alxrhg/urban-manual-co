# Supabase URL Configuration Fix

## Problem
After Apple sign-in, redirects to: `https://avdnefdfwvpjkuanhdwk.supabase.co/www.urbanmanual.co#access_token=e`

This happens because Supabase is prepending its domain to the redirect URL.

## Solution

### 1. Update Supabase Site URL ✅

**Location:** Supabase Dashboard → Authentication → URL Configuration

1. **Site URL**: Set to `https://www.urbanmanual.co`
   - This tells Supabase your app's canonical domain
   - Supabase uses this as the base for redirects

2. **Redirect URLs**: Add these exact URLs:
   ```
   https://www.urbanmanual.co/auth/callback
   https://www.urbanmanual.co/**
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```

### 2. Verify Code Configuration

The code has been updated to:
- Use PKCE flow (code exchange) instead of implicit flow (hash fragments)
- Pass absolute URLs to `redirectTo`
- Handle redirects correctly in the callback route

### 3. Test the Flow

After updating Supabase configuration:
1. Sign in with Apple
2. Should redirect to: `https://www.urbanmanual.co/auth/callback?code=...`
3. Callback route exchanges code for session
4. Redirects to: `https://www.urbanmanual.co/`

## Why This Happens

Supabase prepends its domain when:
- Site URL is not set correctly
- Redirect URL is not whitelisted
- Using implicit flow instead of PKCE

The fix ensures:
- Site URL is set to your domain
- Using PKCE flow (code-based, not hash-based)
- Absolute URLs are used for redirects

