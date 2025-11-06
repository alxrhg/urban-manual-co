# ☁️ Cloud ML Service - Quick Start

**TL;DR:** Deploy your ML service to the cloud in 5 minutes so you can develop locally without Docker.

## 🚀 Why Use Cloud ML?

Instead of running Docker locally, deploy your ML service once to the cloud:

✅ **Faster local dev** - Just run `npm run dev`
✅ **No Docker needed** - Less resource usage
✅ **Better performance** - Cloud servers are faster
✅ **Team friendly** - Everyone uses the same ML service

## ⚡ Quick Deploy (5 minutes)

### Option 1: Railway (Easiest)

```bash
# 1. Install Railway CLI
brew install railway  # macOS
# OR
curl -fsSL https://railway.app/install.sh | sh  # Linux

# 2. Login
railway login

# 3. Deploy
cd ml-service
./deploy-railway.sh

# 4. Copy the URL you get and add to your .env:
# ML_SERVICE_URL=https://your-url.railway.app

# 5. Start Next.js
cd ..
npm run dev
```

Done! 🎉

### Option 2: One-Click Deploy Buttons

Click to deploy instantly:

**Railway:**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

**Render:**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Then set environment variables in the dashboard (see below).

### Option 3: Manual Deploy

See [DEPLOY_ML_SERVICE.md](./DEPLOY_ML_SERVICE.md) for detailed instructions.

---

## 🔐 Required Environment Variables

After deploying, set these in your cloud platform:

### Essential
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
POSTGRES_URL=postgresql://postgres...
```

### Optional (have defaults)
```bash
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8000
LOG_LEVEL=INFO
```

**Get these from:**
- Supabase Dashboard → Settings → API
- Supabase Dashboard → Settings → Database

---

## ✅ Test Your Deployment

```bash
# Health check
curl https://your-ml-service-url.com/health

# Should return:
# {"status":"healthy","service":"Urban Manual ML Service"}

# Test Google Trends
curl "https://your-ml-service-url.com/api/trends/trending-searches?region=united_states"
```

---

## 🔗 Connect to Local Development

### 1. Update your `.env` file

```bash
# Replace localhost with your cloud URL
ML_SERVICE_URL=https://your-ml-service-url.com
```

### 2. Start Next.js

```bash
npm run dev
```

Or in Cursor: `Cmd+Shift+B` → **"☁️ Start Next.js (Cloud ML)"**

### 3. Test it works

Open http://localhost:3000 and scroll to "Trending Google Searches" section.

---

## 🎯 Platform Comparison

| Platform | Speed | Free Tier | Setup Time |
|----------|-------|-----------|------------|
| **Railway** | ⚡⚡⚡ | $5 credit/mo | 2 min |
| **Fly.io** | ⚡⚡⚡ | 3 VMs free | 3 min |
| **Render** | ⚡ | 750 hrs/mo | 5 min |

**Recommendation:** Railway for easiest setup and best performance.

---

## 📊 Cursor Tasks

Once deployed, use these Cursor tasks:

- `Cmd+Shift+B` → **"☁️ Start Next.js (Cloud ML)"** - Start with cloud check
- `Cmd+Shift+B` → **"Check Cloud ML Service"** - Test if ML service is responding

---

## 🐛 Troubleshooting

### ML Service not responding

```bash
# Check if it's deployed
curl https://your-ml-service-url.com/health

# If it fails, check:
# 1. Did you set environment variables?
# 2. Is the URL correct in .env?
# 3. View logs in platform dashboard
```

### Connection errors from Next.js

```bash
# Check ML_SERVICE_URL in .env
cat .env | grep ML_SERVICE_URL

# Should be: ML_SERVICE_URL=https://...
# NOT: ML_SERVICE_URL=http://localhost:8000
```

### Render free tier slow

Free tier spins down after 15 minutes. First request takes ~30s.

**Solutions:**
- Upgrade to paid plan ($7/month)
- Use Railway/Fly.io instead
- Keep it warm with a cron job

---

## 💰 Costs

### Free Tier Limits

- **Railway:** $5 credit/month (~500 hours)
- **Fly.io:** 3 shared VMs, 160GB data transfer
- **Render:** 750 hours/month (enough for 24/7)

### When you'll need to upgrade

- High traffic (>1000 requests/day)
- Multiple developers using same service
- Production deployment

Estimated cost: **$5-20/month**

---

## 🎉 Next Steps

1. ✅ Deploy ML service (5 min)
2. ✅ Update `.env` with cloud URL
3. ✅ Run `npm run dev`
4. ✅ Start building! 🚀

**Need detailed instructions?** See [DEPLOY_ML_SERVICE.md](./DEPLOY_ML_SERVICE.md)

**Having issues?** Check the troubleshooting section above or ask for help!

---

**Happy coding! ☁️**
