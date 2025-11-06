# 🚀 Local Development Setup Guide

Complete guide to running Urban Manual locally with all services (Next.js, ML Service, Google Trends).

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [Running Services](#running-services)
- [Cursor IDE Integration](#cursor-ide-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Optional (for manual Python setup)

- **Python** 3.11+ ([Download](https://www.python.org/))
- **pip** or **uv** package manager

### Recommended Tools

- **Cursor IDE** or **VS Code** with Docker extension
- **Postman** or **Insomnia** for API testing

---

## ⚡ Quick Start (Docker)

### Option 1: Full Stack with Docker Compose (Recommended)

```bash
# 1. Clone the repository (if not already done)
git clone <your-repo-url>
cd urban-manual

# 2. Copy environment files
cp .env.example .env
cp ml-service/.env.example ml-service/.env

# 3. Edit .env files with your credentials
# See "Environment Variables" section below for details
nano .env
nano ml-service/.env

# 4. Start all services
docker-compose -f docker-compose.dev.yml up --build

# Services will be available at:
# - Next.js App: http://localhost:3000
# - ML Service API: http://localhost:8000
# - ML Service Docs: http://localhost:8000/docs
```

**That's it!** 🎉 All services are now running.

### Option 2: Using Cursor IDE

If you're using Cursor IDE:

1. Open the project in Cursor
2. Press `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux)
3. Select **"🚀 Start All Services (Docker)"**
4. Watch the integrated terminal for startup logs

---

## 🛠️ Manual Setup

If you prefer to run services individually without Docker:

### 1. Install Dependencies

```bash
# Install Next.js dependencies
npm install

# Install ML Service dependencies
cd ml-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Install AI Agents dependencies (optional)
cd ai-agents
npm install
cd ..
```

### 2. Set Up Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp ml-service/.env.example ml-service/.env
cp ai-agents/.env.example ai-agents/.env

# Edit with your credentials
nano .env
nano ml-service/.env
nano ai-agents/.env
```

### 3. Start Services Manually

**Terminal 1 - ML Service:**
```bash
cd ml-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Next.js:**
```bash
npm run dev
```

**Terminal 3 - AI Agents (optional):**
```bash
cd ai-agents
npm run dev
```

---

## 🔐 Environment Variables

### Main Application (`.env`)

Create a `.env` file in the root directory:

```env
# ===== SUPABASE CONFIGURATION =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# PostgreSQL Connection (Supabase Pooler)
POSTGRES_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# ===== PAYLOAD CMS =====
# Generate a secure random string (minimum 32 characters)
PAYLOAD_SECRET=your-random-secret-key-min-32-chars-long-here

# ===== GOOGLE SERVICES =====
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-maps-api-key
GOOGLE_AI_API_KEY=your-google-gemini-api-key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json

# ===== ML SERVICE =====
# For Docker: http://ml-service:8000
# For local dev: http://localhost:8000
ML_SERVICE_URL=http://localhost:8000

# ===== UPSTASH REDIS (Rate Limiting) =====
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# ===== AI PROVIDERS (Optional) =====
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

### ML Service (`.env`)

Create `ml-service/.env`:

```env
# ===== SUPABASE CONFIGURATION =====
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# PostgreSQL Direct Connection
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# ===== SERVICE CONFIGURATION =====
ML_SERVICE_PORT=8000
ML_SERVICE_HOST=0.0.0.0
LOG_LEVEL=INFO

# ===== MODEL CONFIGURATION =====
LIGHTFM_EPOCHS=50
LIGHTFM_THREADS=4
PROPHET_SEASONALITY_MODE=multiplicative
CACHE_TTL_HOURS=24

# ===== RATE LIMITING =====
MAX_REQUESTS_PER_MINUTE=60
```

### AI Agents (`.env`) - Optional

Create `ai-agents/.env`:

```env
# ===== AI PROVIDER CONFIGURATION =====
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# ===== DATABASE CONFIGURATION =====
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# ===== AGENT CONFIGURATION =====
AGENT_VERBOSE=true
AGENT_TEMPERATURE=0.7
AGENT_MAX_ITERATIONS=10
```

### 🔑 Getting API Keys

#### Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select existing
3. Go to **Settings → API**
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Settings → Database**
6. Copy Connection String → `POSTGRES_URL`

#### Google Services
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable APIs:
   - Maps JavaScript API
   - Generative Language API (Gemini)
   - Cloud Discovery Engine API
3. Create API Key → `GOOGLE_AI_API_KEY` and `NEXT_PUBLIC_GOOGLE_API_KEY`
4. Create Service Account → Download JSON → `GOOGLE_APPLICATION_CREDENTIALS`

#### Upstash Redis
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create Redis Database
3. Copy REST URL → `UPSTASH_REDIS_REST_URL`
4. Copy REST Token → `UPSTASH_REDIS_REST_TOKEN`

#### OpenAI (Optional)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API Key → `OPENAI_API_KEY`

#### Anthropic Claude (Optional)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API Key → `ANTHROPIC_API_KEY`

---

## 🎯 Running Services

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up --build

# Start in detached mode (background)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v
```

### Using npm Scripts

```bash
# Next.js development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Test intelligence endpoints
npm run test:intelligence

# Data enrichment scripts
npm run enrich:google
npm run fetch:all-place-data
npm run enrich:all-places-data

# Database migrations
npm run migrate:026

# Sync to Asimov
npm run sync:asimov
```

### ML Service Commands

```bash
cd ml-service

# With Docker
docker-compose up --build

# With Python (manual)
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Install new dependency
pip install <package-name>
pip freeze > requirements.txt
```

### AI Agents Commands

```bash
cd ai-agents

# Start agent server
npm run dev

# Generate migration
npm run migrate

# Generate tests
npm run test-gen

# Code review
npm run review

# Generate documentation
npm run docs

# Refactor code
npm run refactor
```

---

## 🖥️ Cursor IDE Integration

The project includes pre-configured Cursor/VS Code tasks for easy development.

### Using Tasks

1. Press `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux)
2. Select a task:
   - **🚀 Start All Services (Docker)** - Full stack with Docker
   - **🌐 Start Next.js Only** - Frontend only
   - **🤖 Start ML Service Only** - ML service with Docker
   - **🐍 Start ML Service (Python Local)** - ML service without Docker
   - **🛑 Stop All Services** - Stop Docker containers

### Available Tasks

| Task | Description |
|------|-------------|
| 🚀 Start All Services | Start Next.js + ML Service via Docker |
| 🛑 Stop All Services | Stop all Docker containers |
| 🌐 Start Next.js Only | Run Next.js in development mode |
| 🤖 Start ML Service | Run ML service in Docker |
| 🐍 Start ML Service (Python) | Run ML service with local Python |
| 🧪 Run Intelligence Tests | Test intelligence endpoints |
| 🔧 Build Next.js | Production build |
| 🧹 Lint Code | Run ESLint |
| 📊 Check ML Service Health | Health check API call |
| 📖 View ML Service API Docs | Open Swagger docs |
| 🌍 Open Next.js App | Open in browser |
| 🔄 Install Dependencies | Install all dependencies |
| 📦 Install Google Trends | Install pytrends package |
| 🗄️ Run Database Migration | Execute database migration |
| 🤖 Start AI Agents | Start AI agent server |
| 📝 View Docker Logs | Stream Docker logs |
| 🧹 Clean Docker Volumes | Remove all Docker volumes |

### Quick Commands

```bash
# In Cursor Terminal
# Press Cmd+Shift+P → "Run Task" → Select from list above
```

---

## ✅ Testing

### Test ML Service

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs

# Test Google Trends endpoint
curl "http://localhost:8000/api/trends/trending-searches?region=united_states"

# Test recommendations
curl -X POST http://localhost:8000/api/recommend/collaborative \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-123", "limit": 10}'
```

### Test Next.js

```bash
# Open in browser
open http://localhost:3000

# Run intelligence tests
npm run test:intelligence

# Build test
npm run build
```

### Test Google Trends Integration

1. Open Next.js app: http://localhost:3000
2. Scroll down to **"Trending Google Searches"** section
3. Select different regions
4. Verify trending searches appear

Or test API directly:

```bash
# Test via Next.js API
curl "http://localhost:3000/api/trending/google?type=trending-searches&region=united_states"

# Test interest over time
curl "http://localhost:3000/api/trending/google?type=interest-over-time&keywords=travel,tourism&timeframe=today%203-m"
```

---

## 🐛 Troubleshooting

### Docker Issues

**Problem: Port already in use**
```bash
# Find process using port 3000 or 8000
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different ports in docker-compose.dev.yml
```

**Problem: Docker build fails**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache
```

**Problem: Permission denied**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

### ML Service Issues

**Problem: pytrends not installed**
```bash
cd ml-service
pip install pytrends==4.9.2

# Or reinstall all dependencies
pip install -r requirements.txt
```

**Problem: Database connection failed**
```bash
# Check environment variables
cat ml-service/.env | grep POSTGRES_URL

# Test connection
python3 -c "import psycopg2; psycopg2.connect('your-postgres-url')"
```

**Problem: Import errors**
```bash
# Ensure you're in virtual environment
cd ml-service
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Next.js Issues

**Problem: Module not found**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

**Problem: Environment variables not loading**
```bash
# Check .env file exists
ls -la .env

# Restart development server
# Kill with Ctrl+C, then:
npm run dev
```

**Problem: ML Service connection failed**
```bash
# Check ML_SERVICE_URL in .env
cat .env | grep ML_SERVICE_URL

# Test ML service is running
curl http://localhost:8000/health
```

### Google Trends Issues

**Problem: 429 Too Many Requests**
- Google Trends has rate limits
- Wait a few minutes between requests
- Consider implementing request throttling

**Problem: Region not available**
- Not all regions support all trend types
- Try different region codes (see component code)
- Check ML service logs for detailed errors

**Problem: Empty trends data**
```bash
# Test ML service directly
curl "http://localhost:8000/api/trends/trending-searches?region=united_states"

# Check logs
docker-compose -f docker-compose.dev.yml logs ml-service
```

### Database Issues

**Problem: Migrations not applied**
1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Copy migration from `migrations/` folder
4. Run query

**Problem: Missing tables**
- Run migrations in order (see `migrations/README.md`)
- Start with `saved_visited_places.sql`

### General Debugging

**View all logs:**
```bash
# Docker logs
docker-compose -f docker-compose.dev.yml logs -f

# Next.js console
# Open browser console at http://localhost:3000

# ML service logs
docker logs urban-manual-ml-service -f
```

**Check service status:**
```bash
# Docker containers
docker ps

# Ports in use
lsof -i :3000
lsof -i :8000

# Network connectivity
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Google Trends API (pytrends)](https://pypi.org/project/pytrends/)

---

## 🎉 Success!

If everything is working, you should see:

- ✅ Next.js app at http://localhost:3000
- ✅ ML Service API at http://localhost:8000
- ✅ ML Service Docs at http://localhost:8000/docs
- ✅ Google Trends section on homepage
- ✅ All services healthy in Docker logs

**Happy coding! 🚀**
