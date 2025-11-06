# 🎯 Cursor IDE Quick Start

Quick reference for running Urban Manual in Cursor IDE.

## ⚡ Quick Start

### Option 1: Cloud ML (Recommended - Fastest!)

**No Docker needed! Deploy ML service once, develop anywhere.**

1. **Deploy ML service** (5 minutes, one-time)
   ```bash
   cd ml-service
   ./deploy-railway.sh
   # Copy the URL you get
   ```

2. **Configure local environment**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # ML_SERVICE_URL=https://your-railway-url.com
   ```

3. **Start developing**
   - Press `Cmd+Shift+B` → **"☁️ Start Next.js (Cloud ML)"**
   - Or just: `npm run dev`

Done! 🎉 See [CLOUD_ML_QUICKSTART.md](./CLOUD_ML_QUICKSTART.md) for details.

### Option 2: Full Local (Docker)

**Run everything locally with Docker.**

1. **Set up environment**
   ```bash
   cp .env.example .env
   cp ml-service/.env.example ml-service/.env
   # Edit .env files with your credentials
   ```

2. **Start services**
   - Press `Cmd+Shift+B` → **"🚀 Start All Services (Docker)"**

3. **Access services**
   - Next.js: http://localhost:3000
   - ML Service: http://localhost:8000/docs

Done! 🎉

---

## 🔥 Common Tasks

### Starting Services

| Task | Shortcut | Description |
|------|----------|-------------|
| **☁️ Cloud ML** | `Cmd+Shift+B` → "☁️ Start Next.js (Cloud ML)" | Recommended: Use cloud ML |
| **All Services** | `Cmd+Shift+B` → "🚀 Start All Services" | Docker Compose (Next.js + ML) |
| **Next.js Only** | `Cmd+Shift+B` → "🌐 Start Next.js Only" | Frontend only (local) |
| **ML Service** | `Cmd+Shift+B` → "🤖 Start ML Service" | Python FastAPI service |

### Stopping Services

| Task | Shortcut | Description |
|------|----------|-------------|
| **Stop All** | `Cmd+Shift+B` → 2 | Stop Docker containers |
| **Stop Terminal** | `Ctrl+C` | In active terminal |

### Debugging

| Task | Shortcut | Description |
|------|----------|-------------|
| **Debug Next.js** | `F5` → Select "Next.js: Debug Server" | Server debugging |
| **Debug ML Service** | `F5` → Select "ML Service: Debug Python" | Python debugging |
| **Full Stack Debug** | `F5` → Select "Full Stack Debug" | Both services |

### Useful Commands

| Task | Shortcut | Description |
|------|----------|-------------|
| **View Logs** | `Cmd+Shift+B` → 20 | Stream Docker logs |
| **Health Check** | `Cmd+Shift+B` → 10 | Test ML service |
| **Open Docs** | `Cmd+Shift+B` → 11 | API documentation |
| **Install Deps** | `Cmd+Shift+B` → 13 | Install all dependencies |

---

## 📁 Project Structure

```
urban-manual/
├── app/                        # Next.js App Router
│   ├── api/                   # API routes
│   │   └── trending/google/   # 🆕 Google Trends endpoint
│   └── page.tsx               # Home page
├── components/                 # React components
│   ├── GoogleTrendsSection.tsx # 🆕 Trends UI
│   └── TrendingSection.tsx     # Internal trends
├── hooks/                      # React hooks
│   └── useGoogleTrends.ts     # 🆕 Trends data hook
├── ml-service/                 # Python ML Service
│   ├── app/
│   │   ├── api/
│   │   │   ├── forecast.py
│   │   │   ├── recommendations.py
│   │   │   └── google_trends.py # 🆕 Trends API
│   │   └── main.py
│   ├── requirements.txt        # 🆕 Added pytrends
│   └── docker-compose.yml
├── ai-agents/                  # AI automation agents
├── .vscode/
│   ├── tasks.json             # 🆕 Task definitions
│   └── launch.json            # 🆕 Debug configs
├── docker-compose.dev.yml     # 🆕 Full stack Docker
├── Dockerfile.dev             # 🆕 Next.js Docker
├── start-dev.sh               # 🆕 CLI launcher
├── LOCAL_SETUP.md             # 🆕 Complete setup guide
└── CURSOR_QUICK_START.md      # This file
```

---

## 🐳 Docker vs Local Development

### Docker (Recommended)
✅ **Pros:**
- Everything just works™
- Consistent environment
- No Python/Node version conflicts
- Easy to start/stop

❌ **Cons:**
- Slower hot reload
- Uses more resources

**When to use:** First time setup, production-like environment

### Local Development
✅ **Pros:**
- Faster hot reload
- Better IDE integration
- Easier debugging

❌ **Cons:**
- Need to install Python 3.11+
- Need to manage virtual environments
- More setup steps

**When to use:** Active development, debugging

---

## 🔧 Environment Variables

### Critical Variables

**Main App (.env):**
```env
NEXT_PUBLIC_SUPABASE_URL=       # Get from Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Get from Supabase
ML_SERVICE_URL=http://localhost:8000  # Or Docker: http://ml-service:8000
GOOGLE_AI_API_KEY=              # Google Gemini API
NEXT_PUBLIC_GOOGLE_API_KEY=     # Google Maps API
```

**ML Service (ml-service/.env):**
```env
SUPABASE_URL=                   # Get from Supabase
POSTGRES_URL=                   # Direct PostgreSQL URL
```

### Getting API Keys

1. **Supabase:** https://app.supabase.com/
   - Settings → API → Copy keys

2. **Google:** https://console.cloud.google.com/
   - Enable: Maps, Generative AI APIs
   - Create API keys

3. **Upstash Redis (optional):** https://console.upstash.com/
   - For rate limiting

See `LOCAL_SETUP.md` for detailed instructions.

---

## 🧪 Testing

### Test ML Service Health

```bash
# In Cursor terminal
curl http://localhost:8000/health
```

### Test Google Trends

```bash
curl "http://localhost:8000/api/trends/trending-searches?region=united_states"
```

### Test Next.js

1. Open http://localhost:3000
2. Scroll to "Trending Google Searches"
3. Change regions
4. Verify trends appear

### Run Test Suite

- Press `Cmd+Shift+B` → Select "🧪 Run Intelligence Tests"

---

## 🐛 Common Issues

### Port Already in Use

**Problem:** `Error: Port 3000/8000 already in use`

**Solution:**
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or stop Docker services
docker-compose -f docker-compose.dev.yml down
```

### Docker Build Failed

**Problem:** `ERROR: failed to solve`

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Environment Variables Not Loading

**Problem:** `TypeError: Cannot read property 'SUPABASE_URL'`

**Solution:**
1. Check `.env` exists: `ls -la .env`
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. For Docker: Rebuild containers

### ML Service Connection Failed

**Problem:** `Failed to fetch from ML service`

**Solution:**
1. Check ML service is running: `curl http://localhost:8000/health`
2. Check `ML_SERVICE_URL` in `.env`
3. View logs: `docker-compose -f docker-compose.dev.yml logs ml-service`

### Google Trends Rate Limit

**Problem:** `429 Too Many Requests`

**Solution:**
- Wait 5-10 minutes
- Google Trends has strict rate limits
- Reduce request frequency

---

## 📚 Keyboard Shortcuts

### Cursor IDE

| Action | Shortcut |
|--------|----------|
| Command Palette | `Cmd+Shift+P` / `Ctrl+Shift+P` |
| Run Task | `Cmd+Shift+B` / `Ctrl+Shift+B` |
| Start Debugging | `F5` |
| Open Terminal | ``Ctrl+` `` |
| Split Terminal | `Cmd+\` / `Ctrl+\` |
| Kill Terminal | `Ctrl+C` |
| New Terminal | `Ctrl+Shift+` ` |

### Custom Tasks (via `Cmd+Shift+B`)

1. 🚀 Start All Services
2. 🛑 Stop All Services
3. 🌐 Start Next.js Only
4. 🤖 Start ML Service Only
10. 📊 Check ML Service Health
11. 📖 View ML Service API Docs
12. 🌍 Open Next.js App
20. 📝 View Docker Logs

---

## 🎨 VS Code Extensions (Recommended)

Install these for better development experience:

1. **Docker** - Microsoft
2. **Python** - Microsoft
3. **Pylance** - Microsoft
4. **ESLint** - Microsoft
5. **Tailwind CSS IntelliSense** - Tailwind Labs
6. **Pretty TypeScript Errors** - yoavbls
7. **GitLens** - GitKraken
8. **Thunder Client** - Thunder Client (API testing)

---

## 💡 Pro Tips

### 1. Use Terminal Splits

```bash
# Split terminal: Cmd+\ (Mac) or Ctrl+\ (Windows/Linux)
# Terminal 1: Next.js logs
# Terminal 2: ML Service logs
# Terminal 3: Commands
```

### 2. Watch Logs in Real-Time

```bash
# Docker logs
docker-compose -f docker-compose.dev.yml logs -f

# Filter by service
docker-compose -f docker-compose.dev.yml logs -f ml-service
```

### 3. Quick API Testing

Use Thunder Client extension (built into Cursor):
1. Press `Cmd+Shift+P`
2. Type "Thunder Client"
3. Create requests for:
   - `GET http://localhost:8000/health`
   - `GET http://localhost:8000/api/trends/trending-searches?region=united_states`
   - `GET http://localhost:3000/api/trending/google?type=trending-searches`

### 4. Hot Reload Issues?

If changes aren't reflecting:
```bash
# Next.js
rm -rf .next && npm run dev

# ML Service (Docker)
docker-compose -f docker-compose.dev.yml restart ml-service
```

### 5. Debug with Breakpoints

1. Set breakpoint: Click left of line number
2. Press `F5` → Select debug configuration
3. Interact with app to trigger breakpoint
4. Inspect variables in Debug sidebar

---

## 📖 Documentation Links

- **Next.js:** https://nextjs.org/docs
- **FastAPI:** https://fastapi.tiangolo.com/
- **Supabase:** https://supabase.com/docs
- **Google Trends API:** https://pypi.org/project/pytrends/
- **Docker Compose:** https://docs.docker.com/compose/

---

## 🚀 Ready to Code!

You're all set! Here's what to do next:

1. ✅ Start services: `Cmd+Shift+B` → "Start All Services"
2. ✅ Open app: http://localhost:3000
3. ✅ Check API docs: http://localhost:8000/docs
4. ✅ Start coding!

**Need help?** Open `LOCAL_SETUP.md` for detailed troubleshooting.

---

**Happy coding! 🎉**
