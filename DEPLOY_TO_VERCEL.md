# Deploy to Vercel

## Quick Deploy via Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Sign in with your GitHub account

2. **Import Repository**
   - Select "Import Git Repository"
   - Choose `avmlo/urban-manual`
   - Or paste: `https://github.com/avmlo/urban-manual.git`

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `.` (project root)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables**
   Go to Project Settings > Environment Variables and add:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_API_KEY=your_google_api_key
   ```
   
   Optional:
   ```
   DATABASE_URL=your_database_url
   POSTGRES_URL=your_postgres_url
   PAYLOAD_SECRET=your_payload_secret
   ADMIN_EMAILS=admin@example.com,another@example.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `your-project.vercel.app`

## Deploy via CLI

If you have Node.js and Vercel CLI installed:

```bash
# Install Vercel CLI globally (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time will configure project)
vercel

# Deploy to production
vercel --prod
```

## Post-Deployment

1. **Verify Environment Variables**
   - Visit `/api/health` on your deployed site
   - Should show all checks passing

2. **Test Key Features**
   - Homepage loads
   - Search works
   - Destination pages load
   - Authentication works

3. **Set up Custom Domain** (optional)
   - Go to Project Settings > Domains
   - Add your custom domain

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` has correct build script

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify environment variables are accessible
- Check browser console for client-side errors

### Environment Variables Not Working
- Ensure `NEXT_PUBLIC_` prefix for client-side variables
- Redeploy after adding new environment variables
- Check for typos in variable names

