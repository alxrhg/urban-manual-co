# 🚀 Deploy to Production

Complete guide to deploying your Urban Manual application to production with Google Trends integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Deploy ML Service](#step-1-deploy-ml-service)
- [Step 2: Deploy Next.js to Vercel](#step-2-deploy-nextjs-to-vercel)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Configure Custom Domain](#step-4-configure-custom-domain)
- [Step 5: Verify Deployment](#step-5-verify-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Your production setup will look like this:

```
User's Browser
      ↓
Your Custom Domain (yourdomain.com)
      ↓
Vercel CDN (Next.js App)
      ↓
      ├→ Supabase (Database & Auth)
      ├→ Railway/Fly.io (ML Service)
      ├→ Google APIs (Maps, Gemini, Trends)
      └→ Upstash Redis (Rate Limiting)
```

**Deployment Timeline:** 15-30 minutes

---

## ✅ Prerequisites

Before deploying, ensure you have:

- ✅ GitHub repository with your code
- ✅ Supabase project (database)
- ✅ Google API keys (Maps, Gemini)
- ✅ Vercel account (free tier works)
- ✅ Railway/Fly.io account (free tier works)

**Optional but recommended:**
- Upstash Redis account
- Custom domain name

---

## 🚂 Step 1: Deploy ML Service

Deploy your ML service first, as the Next.js app depends on it.

### Option A: Railway (Recommended)

**1. Install Railway CLI:**
```bash
brew install railway  # macOS
# OR
curl -fsSL https://railway.app/install.sh | sh  # Linux
```

**2. Login:**
```bash
railway login
```

**3. Deploy ML Service:**
```bash
cd ml-service
./deploy-railway.sh
```

**4. Set Production Environment Variables:**
```bash
railway variables set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  POSTGRES_URL="postgresql://..." \
  ML_SERVICE_HOST="0.0.0.0" \
  ML_SERVICE_PORT="8000" \
  LOG_LEVEL="INFO"
```

**5. Generate Domain:**
```bash
railway domain
```

You'll get a URL like: `https://urban-manual-ml-production.up.railway.app`

**6. Verify:**
```bash
curl https://your-railway-url.com/health
```

### Option B: Fly.io

```bash
cd ml-service
flyctl auth login
flyctl launch
flyctl secrets set SUPABASE_URL="..." POSTGRES_URL="..."
flyctl deploy
```

### Option C: Render

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Root directory: `ml-service`
5. Environment: Docker
6. Add environment variables
7. Deploy

**Save your ML Service URL - you'll need it for Vercel!**

---

## ▲ Step 2: Deploy Next.js to Vercel

Vercel is made by the Next.js team and is the best hosting option.

### 2.1: Install Vercel CLI

```bash
npm i -g vercel
```

### 2.2: Login to Vercel

```bash
vercel login
```

### 2.3: Deploy

```bash
# From repository root
vercel

# Follow prompts:
# - Link to existing project? No (first time) or Yes (updating)
# - What's your project name? urban-manual
# - In which directory is your code? ./
# - Auto-detected Next.js, continue? Yes
# - Override settings? No
```

This creates a preview deployment.

### 2.4: Deploy to Production

```bash
vercel --prod
```

You'll get a URL like: `https://urban-manual.vercel.app`

### Alternative: Deploy via Vercel Dashboard

**1. Go to [vercel.com](https://vercel.com)**

**2. Click "Add New" → "Project"**

**3. Import your GitHub repository**

**4. Configure:**
- **Framework Preset:** Next.js
- **Root Directory:** ./
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

**5. Click "Deploy"**

Your site will be live at: `https://your-project.vercel.app`

---

## 🔐 Step 3: Configure Environment Variables

### 3.1: In Vercel Dashboard

Go to your project → Settings → Environment Variables

Add these variables:

#### Supabase (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
POSTGRES_URL=postgresql://postgres...
```

#### Payload CMS (Required)
```bash
PAYLOAD_SECRET=your-random-32-char-secret
```

#### Google Services (Required)
```bash
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-maps-key
GOOGLE_AI_API_KEY=your-google-gemini-key
```

#### ML Service (Required)
```bash
ML_SERVICE_URL=https://urban-manual-ml-production.up.railway.app
```

#### Google Cloud (Optional)
```bash
GOOGLE_APPLICATION_CREDENTIALS=/var/task/credentials.json
```

If using Google Cloud credentials:
1. Upload `credentials.json` to your repo (in `.gitignore`!)
2. Or use Vercel Secrets (better)

#### Upstash Redis (Recommended)
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

Get from: https://console.upstash.com

#### AI APIs (Optional)
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3.2: Environment Variable Scopes

Set variables for all three environments:
- ✅ **Production** - Live site
- ✅ **Preview** - PR deployments
- ✅ **Development** - Local `vercel dev`

### 3.3: Sensitive Variables

For sensitive data, use Vercel's Secret feature:

```bash
# Create secret
vercel secrets add my-secret-name "secret-value"

# Reference in environment variable
# In Vercel dashboard, set value to: @my-secret-name
```

---

## 🌐 Step 4: Configure Custom Domain

### 4.1: Add Domain to Vercel

**In Vercel Dashboard:**
1. Go to your project → Settings → Domains
2. Add your domain (e.g., `urbanmanual.com`)
3. Vercel will provide DNS records

### 4.2: Configure DNS

**Add these records to your domain registrar:**

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Or use Vercel nameservers:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### 4.3: Wait for DNS Propagation

DNS changes take 1-48 hours. Check status:
```bash
dig yourdomain.com
```

### 4.4: Enable HTTPS

Vercel automatically provisions SSL certificates from Let's Encrypt.

**Verify:**
- Go to Settings → Domains
- Look for green "SSL Certificate" badge

---

## ✅ Step 5: Verify Deployment

### 5.1: Check ML Service

```bash
# Health check
curl https://your-ml-service-url.com/health

# API docs
open https://your-ml-service-url.com/docs

# Test Google Trends
curl "https://your-ml-service-url.com/api/trends/trending-searches?region=united_states"
```

### 5.2: Check Next.js App

**Visit your site:**
```bash
open https://your-domain.com
```

**Test key features:**
1. ✅ Homepage loads
2. ✅ Search works
3. ✅ Trending section appears
4. ✅ Google Trends section appears
5. ✅ Destination pages load
6. ✅ Authentication works
7. ✅ User profiles work

### 5.3: Check Google Trends Integration

**On your live site:**
1. Scroll to "Trending Google Searches" section
2. Should show trending searches
3. Try changing regions
4. Verify data updates

**Or test API directly:**
```bash
curl "https://your-domain.com/api/trending/google?type=trending-searches&region=united_states"
```

### 5.4: Check Console for Errors

**In browser:**
1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### 5.5: Test Performance

**Run Lighthouse audit:**
1. Open DevTools
2. Lighthouse tab
3. Generate report
4. Aim for:
   - Performance: 80+
   - Accessibility: 90+
   - SEO: 90+

---

## 📊 Monitoring & Maintenance

### Vercel Analytics

**Enable in Vercel Dashboard:**
1. Go to your project → Analytics
2. Turn on "Web Analytics"
3. View real-time traffic and performance

### ML Service Monitoring

**Railway:**
```bash
railway logs -f
```

**Fly.io:**
```bash
flyctl logs
```

**Render:**
- Dashboard → Logs tab

### Uptime Monitoring

Use a service like:
- **UptimeRobot** (free) - https://uptimerobot.com
- **Pingdom** (paid) - https://pingdom.com
- **Better Stack** (free tier) - https://betterstack.com

Monitor:
- `https://your-domain.com` (Next.js)
- `https://your-ml-service-url.com/health` (ML Service)

### Error Tracking

**Option 1: Vercel Log Drain**
- Vercel Dashboard → Integrations → Log Drains
- Send logs to services like:
  - Datadog
  - LogFlare
  - Axiom

**Option 2: Sentry**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Performance Monitoring

**Vercel Speed Insights:**
```bash
npm install @vercel/speed-insights
```

Add to `app/layout.tsx`:
```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 🔄 Continuous Deployment

### Automatic Deployments

**Vercel automatically deploys when you push to GitHub:**

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

Vercel will:
1. Build your app
2. Run tests (if configured)
3. Deploy to production
4. Comment on GitHub with preview URL

### Preview Deployments

**Every pull request gets a preview:**
1. Create PR on GitHub
2. Vercel builds and deploys
3. Preview URL posted in PR comments
4. Test before merging

### Branch Deployments

**Deploy specific branches:**
- `main` → Production
- `staging` → Staging environment
- `feature/*` → Preview deployments

Configure in: Vercel Dashboard → Settings → Git

---

## 🔒 Security Best Practices

### 1. Secure Environment Variables

✅ **Do:**
- Use Vercel Secrets for sensitive data
- Rotate keys regularly
- Use different keys for dev/staging/prod

❌ **Don't:**
- Commit secrets to git
- Share secrets in screenshots
- Use same keys across environments

### 2. CORS Configuration

**Update ML service CORS in `ml-service/app/main.py`:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "https://urban-manual.vercel.app",  # Vercel preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy ML service after changes.

### 3. Rate Limiting

**Already configured with Upstash Redis!**

If not using Redis, the app falls back to memory-based rate limiting.

### 4. API Key Restrictions

**Google API Keys:**
1. Go to Google Cloud Console
2. Credentials → Select your key
3. Application restrictions:
   - HTTP referrers: `yourdomain.com/*`
4. API restrictions:
   - Only allow: Maps JavaScript API, Generative Language API

### 5. Database Security

**Supabase:**
1. Enable RLS (Row Level Security)
2. Review security policies
3. Use service role key only in backend
4. Never expose service role key to frontend

---

## 🐛 Troubleshooting

### Deployment Failed

**Check build logs:**
```bash
vercel logs
```

**Common issues:**
- Missing environment variables
- TypeScript errors
- Build timeout (upgrade Vercel plan)

### ML Service Not Responding

```bash
# Check logs
railway logs  # Railway
flyctl logs   # Fly.io

# Check health
curl https://your-ml-service-url.com/health
```

**Common issues:**
- Environment variables not set
- Database connection failed
- Cold start (Render free tier)

### Google Trends 429 Error

**Too many requests:**
- Google Trends has strict rate limits
- Add caching layer
- Reduce request frequency
- Consider upgrading plan

### Site is Slow

**Check performance:**
1. Run Lighthouse audit
2. Check Vercel Analytics
3. Review function logs
4. Consider caching strategy

**Optimizations:**
- Enable Next.js image optimization
- Use Vercel Edge Functions for API routes
- Add Redis caching
- Optimize database queries

### CORS Errors

**Update ML service CORS:**
```python
# ml-service/app/main.py
allow_origins=["https://yourdomain.com"]
```

Redeploy ML service.

### Environment Variables Not Working

**In Vercel:**
1. Settings → Environment Variables
2. Check spelling and scope
3. Redeploy after adding variables:
   ```bash
   vercel --prod
   ```

---

## 📈 Scaling for Production

### When to Upgrade

**Free tier limits:**
- Vercel: 100GB bandwidth/month
- Railway: $5 credit (~500 hours)
- Supabase: 500MB database, 2GB bandwidth

**Upgrade when:**
- Traffic > 10,000 visits/month
- Database > 500MB
- ML requests > 1000/day

### Recommended Paid Plans

**Vercel Pro ($20/month):**
- Unlimited bandwidth
- Password protection
- Advanced analytics

**Railway Starter ($5/month):**
- More compute hours
- Better performance
- Priority support

**Supabase Pro ($25/month):**
- 8GB database
- 50GB bandwidth
- Daily backups

### Performance Optimization

**1. Enable caching:**
```typescript
// app/api/trending/google/route.ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
  },
});
```

**2. Use Edge Runtime:**
```typescript
// app/api/route.ts
export const runtime = 'edge';
```

**3. Optimize images:**
```tsx
<Image
  src="/image.jpg"
  width={800}
  height={600}
  quality={85}
  priority={false}
/>
```

**4. Add Redis caching:**
Already configured with Upstash Redis for rate limiting!

---

## 🎉 Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations applied
- [ ] Google API keys configured
- [ ] Build succeeds locally (`npm run build`)

### ML Service Deployment
- [ ] Deployed to Railway/Fly.io/Render
- [ ] Environment variables set
- [ ] Health check passing
- [ ] API docs accessible
- [ ] Google Trends endpoint working

### Next.js Deployment
- [ ] Deployed to Vercel
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Preview deployment tested

### Post-Deployment Verification
- [ ] Homepage loads
- [ ] Search works
- [ ] Trending section appears
- [ ] Google Trends section appears
- [ ] Authentication works
- [ ] No console errors
- [ ] Lighthouse score > 80

### Monitoring Setup
- [ ] Vercel Analytics enabled
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) setup
- [ ] Logs accessible

---

## 🚀 Quick Deploy Commands

```bash
# 1. Deploy ML Service
cd ml-service
./deploy-railway.sh
# Copy URL

# 2. Add ML Service URL to .env
cd ..
echo "ML_SERVICE_URL=https://your-railway-url.com" >> .env

# 3. Deploy to Vercel
vercel --prod

# 4. Set environment variables in Vercel Dashboard

# 5. Verify
curl https://your-domain.com/api/trending/google?type=trending-searches
```

---

## 📚 Additional Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Railway Docs:** https://docs.railway.app
- **Fly.io Docs:** https://fly.io/docs
- **Supabase Docs:** https://supabase.com/docs

---

## 🎯 Success!

Your app is now live! 🎉

**What you have:**
- ✅ Next.js app on Vercel with CDN
- ✅ ML Service on Railway/Fly.io
- ✅ Google Trends integration
- ✅ Custom domain with HTTPS
- ✅ Automatic deployments from GitHub
- ✅ Monitoring and analytics

**Share your site:**
```
🌐 https://yourdomain.com
```

**Next steps:**
1. Monitor performance with Vercel Analytics
2. Check ML service logs regularly
3. Test Google Trends rate limits
4. Plan for scaling as traffic grows

**Need help?** Check the troubleshooting section or create an issue on GitHub.

---

**Happy launching! 🚀**
