# Sanity Studio Troubleshooting

## Network Error: "Request error while attempting to reach"

If you see an error like:
```
Request error while attempting to reach https://[project-id].api.sanity.io/v2021-06-07/users/me
```

### Possible Causes & Solutions

#### 1. **Project ID Not Set or Incorrect**

**Check:**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- The project ID should match your Sanity project ID (found in Sanity Dashboard → Project Settings)

**Fix:**
```bash
# In Vercel Dashboard, add:
NEXT_PUBLIC_SANITY_PROJECT_ID=your-actual-project-id
```

#### 2. **Project Doesn't Exist or Is Inaccessible**

**Check:**
- Visit https://sanity.io/manage
- Verify the project exists and you have access
- Check if the project is paused (free tier projects pause after inactivity)

**Fix:**
- If project is paused, restore it in Sanity Dashboard
- If project doesn't exist, create a new one or verify the project ID

#### 3. **API Version Mismatch**

**Check:**
- Current API version is set to `2021-06-07` (default for Sanity Studio)
- If you need a different version, set `NEXT_PUBLIC_SANITY_API_VERSION` in environment variables

**Fix:**
```bash
# In Vercel Dashboard, add (if needed):
NEXT_PUBLIC_SANITY_API_VERSION=2021-06-07
```

#### 4. **Authentication Issues**

**Check:**
- If using Sanity's built-in authentication, ensure users are invited to the project
- Check if `SANITY_API_TOKEN` is set (for write operations)

**Fix:**
- Go to Sanity Dashboard → Project Settings → API → Tokens
- Create a token with appropriate permissions
- Add to Vercel as `SANITY_API_TOKEN`

#### 5. **CORS or Network Issues**

**Check:**
- Verify your domain is allowed in Sanity CORS settings
- Check browser console for CORS errors

**Fix:**
- Go to Sanity Dashboard → Project Settings → API → CORS origins
- Add your Vercel domain: `https://www.urbanmanual.co`
- Add preview domains: `https://*.vercel.app`

#### 6. **Dataset Name Mismatch**

**Check:**
- Default dataset is `production`
- Verify the dataset exists in your Sanity project

**Fix:**
```bash
# In Vercel Dashboard, set if different:
NEXT_PUBLIC_SANITY_DATASET=production
```

## Quick Verification Steps

1. **Check Environment Variables in Vercel:**
   - `NEXT_PUBLIC_SANITY_PROJECT_ID` - Should be your project ID (e.g., `ryd11bal`)
   - `NEXT_PUBLIC_SANITY_DATASET` - Should be `production` (or your dataset name)
   - `NEXT_PUBLIC_SANITY_API_VERSION` - Optional, defaults to `2021-06-07`

2. **Verify Project in Sanity Dashboard:**
   - Visit https://sanity.io/manage
   - Find your project
   - Check project status (should be active)
   - Verify you have access

3. **Test API Access:**
   ```bash
   # Test if project is accessible
   curl "https://[your-project-id].api.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20%3D%3D%20%22destination%22%5D%5B0..10]"
   ```

4. **Check Browser Console:**
   - Open `/studio` in browser
   - Check Network tab for failed requests
   - Look for CORS errors or 401/403 responses

## Common Error Messages

### "Module not found: styled-components"
**Solution:** Already fixed - `styled-components` is installed

### "Request error while attempting to reach"
**Solution:** Check project ID, authentication, and network access

### "Invalid Sanity Project ID"
**Solution:** Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` is set correctly in Vercel

### "Sanity Studio Not Configured"
**Solution:** Set `NEXT_PUBLIC_SANITY_PROJECT_ID` in Vercel environment variables

## Getting Help

If issues persist:
1. Check Sanity status: https://status.sanity.io
2. Review Sanity logs in browser console
3. Verify Vercel Sanity integration is properly installed
4. Check Sanity Dashboard for project status

