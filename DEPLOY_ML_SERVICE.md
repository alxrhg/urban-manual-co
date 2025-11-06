# 🚀 Deploy ML Service to the Cloud

Complete guide to deploying your ML Service to Railway, Fly.io, or Render so you can develop locally without running Docker.

## 📋 Table of Contents

- [Why Deploy ML Service to Cloud?](#why-deploy-ml-service-to-cloud)
- [Option 1: Railway (Recommended)](#option-1-railway-recommended)
- [Option 2: Fly.io](#option-2-flyio)
- [Option 3: Render](#option-3-render)
- [Testing Your Deployment](#testing-your-deployment)
- [Connecting from Local Development](#connecting-from-local-development)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Why Deploy ML Service to Cloud?

### Benefits

✅ **Faster Local Development**
- No need to run Docker locally
- Less resource usage on your machine
- Faster startup times

✅ **Better Performance**
- Cloud servers are more powerful
- Always available
- Better for team collaboration

✅ **Easier Onboarding**
- New developers just need Next.js
- No Python/Docker setup required
- Works from any machine

### Cost

- **Railway:** Free tier with $5 credit/month
- **Fly.io:** Free tier with 3 VMs
- **Render:** Free tier (slower)

---

## 🚂 Option 1: Railway (Recommended)

Railway is the easiest and most reliable option.

### Step 1: Install Railway CLI

```bash
# macOS
brew install railway

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# Linux
curl -fsSL https://railway.app/install.sh | sh
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### Step 3: Deploy ML Service

```bash
# Navigate to ML service directory
cd ml-service

# Initialize Railway project
railway init

# Give it a name like "urban-manual-ml"

# Deploy!
railway up
```

### Step 4: Set Environment Variables

```bash
# Set Supabase credentials
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
railway variables set POSTGRES_URL="postgresql://..."

# Set service config
railway variables set ML_SERVICE_HOST="0.0.0.0"
railway variables set ML_SERVICE_PORT="8000"
railway variables set LOG_LEVEL="INFO"

# Set model config
railway variables set LIGHTFM_EPOCHS="50"
railway variables set LIGHTFM_THREADS="4"
railway variables set PROPHET_SEASONALITY_MODE="multiplicative"
railway variables set CACHE_TTL_HOURS="24"
```

### Step 5: Generate Public URL

```bash
# Generate a public domain
railway domain
```

Railway will give you a URL like: `https://urban-manual-ml-production.up.railway.app`

### Step 6: Update Local .env

```bash
# In your main .env file, set:
ML_SERVICE_URL=https://urban-manual-ml-production.up.railway.app
```

### Railway Dashboard Alternative

You can also deploy through the web dashboard:

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Select `ml-service` as root directory
6. Set environment variables in Settings → Variables
7. Deploy!

### Railway Configuration File

Create `ml-service/railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.environmentVariables]]
name = "ML_SERVICE_HOST"
value = "0.0.0.0"

[[deploy.environmentVariables]]
name = "PORT"
value = "8000"
```

---

## ✈️ Option 2: Fly.io

Fly.io offers great performance with edge deployment.

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login

```bash
flyctl auth login
```

### Step 3: Launch App

```bash
cd ml-service

# Initialize and deploy
flyctl launch

# Follow prompts:
# - App name: urban-manual-ml
# - Region: Choose closest to you
# - Don't deploy immediately yet (we need to set secrets)
```

### Step 4: Set Secrets

```bash
# Set environment variables (called "secrets" in Fly)
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  POSTGRES_URL="postgresql://..." \
  ML_SERVICE_HOST="0.0.0.0" \
  ML_SERVICE_PORT="8000" \
  LOG_LEVEL="INFO"
```

### Step 5: Deploy

```bash
flyctl deploy
```

### Step 6: Get URL

```bash
flyctl info
```

Your URL will be: `https://urban-manual-ml.fly.dev`

Update your local `.env`:
```bash
ML_SERVICE_URL=https://urban-manual-ml.fly.dev
```

### Fly.io Configuration

Create `ml-service/fly.toml`:

```toml
app = "urban-manual-ml"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  ML_SERVICE_HOST = "0.0.0.0"
  ML_SERVICE_PORT = "8000"
  LOG_LEVEL = "INFO"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

---

## 🎨 Option 3: Render

Render has a generous free tier but is slower.

### Step 1: Create Account

Go to [render.com](https://render.com) and sign up.

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** urban-manual-ml
   - **Root Directory:** ml-service
   - **Environment:** Docker
   - **Region:** Oregon (US West) - fastest
   - **Branch:** main or your branch
   - **Plan:** Free

### Step 3: Set Environment Variables

In the Render dashboard:

1. Go to Environment tab
2. Add variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   POSTGRES_URL=postgresql://...
   ML_SERVICE_HOST=0.0.0.0
   ML_SERVICE_PORT=8000
   LOG_LEVEL=INFO
   ```

### Step 4: Deploy

Click "Create Web Service" - it will automatically deploy!

### Step 5: Get URL

Your URL will be: `https://urban-manual-ml.onrender.com`

Update your local `.env`:
```bash
ML_SERVICE_URL=https://urban-manual-ml.onrender.com
```

### Render Configuration

Create `ml-service/render.yaml`:

```yaml
services:
  - type: web
    name: urban-manual-ml
    env: docker
    region: oregon
    plan: free
    branch: main
    dockerfilePath: ./Dockerfile
    dockerContext: ./
    healthCheckPath: /health
    envVars:
      - key: ML_SERVICE_HOST
        value: 0.0.0.0
      - key: ML_SERVICE_PORT
        value: 8000
      - key: LOG_LEVEL
        value: INFO
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: POSTGRES_URL
        sync: false
```

---

## ✅ Testing Your Deployment

### 1. Health Check

```bash
# Railway
curl https://urban-manual-ml-production.up.railway.app/health

# Fly.io
curl https://urban-manual-ml.fly.dev/health

# Render
curl https://urban-manual-ml.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Urban Manual ML Service",
  "version": "1.0.0"
}
```

### 2. API Documentation

Visit your service URL + `/docs`:
- Railway: `https://urban-manual-ml-production.up.railway.app/docs`
- Fly.io: `https://urban-manual-ml.fly.dev/docs`
- Render: `https://urban-manual-ml.onrender.com/docs`

### 3. Test Google Trends Endpoint

```bash
curl "https://your-service-url.com/api/trends/trending-searches?region=united_states"
```

### 4. Test from Next.js

Once your ML service is deployed and `ML_SERVICE_URL` is set in your `.env`:

```bash
# Start Next.js
npm run dev

# Test from your app
curl "http://localhost:3000/api/trending/google?type=trending-searches&region=united_states"
```

---

## 🔗 Connecting from Local Development

### Update Your .env File

```env
# Replace localhost with your cloud URL
ML_SERVICE_URL=https://urban-manual-ml-production.up.railway.app

# Or for Fly.io:
ML_SERVICE_URL=https://urban-manual-ml.fly.dev

# Or for Render:
ML_SERVICE_URL=https://urban-manual-ml.onrender.com
```

### Start Only Next.js Locally

```bash
# No need for Docker anymore!
npm run dev
```

Or in Cursor:
- Press `Cmd+Shift+B`
- Select "🌐 Start Next.js Only (Cloud ML)"

### That's it!

Your Next.js app will now use the cloud-hosted ML service.

---

## 📊 Monitoring & Logs

### Railway

```bash
# View logs
railway logs

# Or in dashboard: https://railway.app/dashboard
```

### Fly.io

```bash
# View logs
flyctl logs

# Monitor app
flyctl status

# Open dashboard
flyctl open
```

### Render

Go to your service dashboard:
- Logs tab - Real-time logs
- Metrics tab - Performance metrics
- Events tab - Deployment history

---

## 🔄 Updating Your Deployment

### Railway

```bash
cd ml-service
railway up
```

Or enable auto-deploy from GitHub:
1. Railway Dashboard → Settings → Source
2. Connect GitHub repo
3. Auto-deploys on push to main

### Fly.io

```bash
cd ml-service
flyctl deploy
```

### Render

Automatically deploys on git push to main branch!

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| **Railway** | $5 credit/month | $5+/month | Teams, fast deployment |
| **Fly.io** | 3 VMs free | $0.02/hour | Edge deployment, global |
| **Render** | 750 hours/month | $7+/month | Simple, auto-deploy |

### Recommendations

- **For Development:** Railway (easiest, fast)
- **For Production:** Fly.io (best performance)
- **For Budget:** Render (generous free tier)

---

## 🐛 Troubleshooting

### Problem: Service Won't Start

**Check logs:**
```bash
# Railway
railway logs

# Fly.io
flyctl logs

# Render
# Go to dashboard → Logs tab
```

**Common issues:**
- Missing environment variables
- Invalid `POSTGRES_URL`
- Port configuration (should be 8000)

### Problem: Health Check Failing

```bash
# Test directly
curl https://your-service-url.com/health

# Check if port is correct
curl https://your-service-url.com:8000/health
```

### Problem: Database Connection Error

**Check your POSTGRES_URL:**
- Should start with `postgresql://`
- Should be the direct connection (port 5432), not pooler (port 6543)
- Get it from Supabase Dashboard → Settings → Database → Connection String

### Problem: Slow Response Times

**Render free tier:**
- Spins down after 15 minutes of inactivity
- First request takes ~30 seconds to wake up
- Solution: Upgrade to paid plan or use Railway/Fly.io

**Railway/Fly.io:**
- Usually fast (<200ms)
- If slow, check logs for errors
- May need to upgrade plan for more resources

### Problem: 429 Rate Limit (Google Trends)

Google Trends has strict rate limits:
- Wait 5-10 minutes between requests
- Don't make too many requests in development
- Consider caching responses

### Problem: CORS Errors

Add your development domain to CORS config in `ml-service/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy after changes.

---

## 🔒 Security Best Practices

### 1. Use Secrets Management

✅ **Do:**
```bash
# Use platform's secrets feature
railway variables set POSTGRES_URL="..."
flyctl secrets set POSTGRES_URL="..."
```

❌ **Don't:**
- Commit secrets to git
- Use plaintext environment variables
- Share secrets in documentation

### 2. Restrict CORS Origins

Update `ml-service/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://your-app.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Enable HTTPS Only

All platforms enable HTTPS by default. Make sure your `ML_SERVICE_URL` uses `https://`.

### 4. Monitor Access Logs

Check logs regularly for suspicious activity:
```bash
railway logs | grep "429"  # Rate limit hits
railway logs | grep "error"  # Errors
```

---

## 📈 Next Steps

Once your ML service is deployed:

1. ✅ Update `.env` with cloud URL
2. ✅ Test health endpoint
3. ✅ Start Next.js locally (`npm run dev`)
4. ✅ Verify Google Trends integration works
5. ✅ Set up monitoring (optional)
6. ✅ Enable auto-deploy from GitHub (optional)

---

## 🎉 Success!

Your ML service is now running in the cloud!

**Benefits you now have:**
- ✅ No Docker needed locally
- ✅ Faster development setup
- ✅ Better performance
- ✅ Always available
- ✅ Easy team collaboration

**Just run:**
```bash
npm run dev
```

And you're coding! 🚀
