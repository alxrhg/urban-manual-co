# Quick Start: Enable Optional Services

> **TL;DR**: Urban Manual works fully without these services. Enable them for enhanced features.

## Service Overview

| Service | Time to Enable | Benefit | Cost |
|---------|---------------|---------|------|
| **ML Service** | 5 minutes | Personalized recommendations, forecasting | ~$15-30/month |
| **Rust Modules** | 10 minutes | 50x faster search | Free (build time) |
| **AI Agents** | 3 minutes | Auto-generate migrations, tests | ~$5-20/month (API) |

---

## ML Service (Recommendations & Forecasting)

### 1-Minute Local Setup

```bash
# Terminal 1: Start ML service
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Configure Next.js
echo "ML_SERVICE_URL=http://localhost:8000" >> .env.local
npm run dev
```

### 5-Minute Production Setup (Docker)

```bash
# Build and run
docker build -f ml-service/Dockerfile.production -t urban-ml-service .
docker run -d -p 8000:8000 \
  -e DATABASE_URL=$DATABASE_URL \
  --name ml-service \
  urban-ml-service

# Set in production environment
# ML_SERVICE_URL=http://ml-service:8000
```

### 10-Minute Cloud Deployment (Google Cloud Run)

```bash
gcloud run deploy urban-ml-service \
  --source ml-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=$DATABASE_URL

# Copy the service URL and add to Next.js environment:
# ML_SERVICE_URL=https://urban-ml-service-xxx.run.app
```

### Verify It's Working

```bash
# Check health
curl http://localhost:8000/health
# Response: {"status":"healthy","version":"1.0.0"}

# Test from Next.js
curl http://localhost:3000/api/ml/status
# Response: {"available":true,"service":"ml-service"}
```

### Use ML-Powered Components (Optional)

These exist but aren't used yet. To enable:

```tsx
// app/page.tsx
import { ForYouSectionML } from '@/components/ForYouSectionML'

export default function Home() {
  return (
    <div>
      {/* Replaces basic recommendations with ML */}
      <ForYouSectionML userId={user.id} />
    </div>
  )
}
```

```tsx
// app/explore/page.tsx
import { TrendingSectionML } from '@/components/TrendingSectionML'

export default function Explore() {
  return (
    <div>
      {/* Replaces basic trending with ML forecasting */}
      <TrendingSectionML limit={10} />
    </div>
  )
}
```

---

## Rust Modules (High-Performance Search)

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install maturin
pip install maturin
```

### Build & Install

```bash
# Build embedding processor
cd rust-modules/embedding-processor
maturin develop --release

# Build vector search
cd ../vector-search
maturin develop --release

# Verify
python -c "import embedding_processor; print('✓ Rust modules loaded')"
```

### Use in ML Service

The ML service will automatically use Rust modules if available:

```python
# ml-service/main.py
try:
    import embedding_processor
    USE_RUST = True
    print("🚀 Using Rust-accelerated operations (50x faster)")
except ImportError:
    USE_RUST = False
    print("⚠️  Using Python operations (slower)")
```

### Benchmarks

```bash
cd rust-modules/embedding-processor
cargo bench

# Expected results:
# Python NumPy:   ~500ms for 10K embeddings
# Rust module:    ~10ms for 10K embeddings (50x faster)
```

---

## AI Agents (Code Generation)

### Setup

```bash
cd ai-agents

# Install dependencies
npm install

# Configure API key (choose one)
echo "OPENAI_API_KEY=sk-..." >> .env
# OR
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Add database URL
echo "DATABASE_URL=postgresql://..." >> .env
```

### Generate Migration

```bash
# Auto-detect schema changes and generate migration
npm run agent:migrate -- --auto-detect

# Or specify files
npm run agent:migrate -- \
  --from schema/old.sql \
  --to schema/new.sql \
  --output migrations/001_add_bookings.sql
```

### Generate Tests

```bash
# Generate tests for a file
npm run agent:test -- \
  --file services/recommendations.ts \
  --output tests/recommendations.test.ts

# Generate tests for changed files
npm run agent:test -- --changed-files

# Specify test framework
npm run agent:test -- \
  --file services/auth.ts \
  --framework jest
```

### Add to CI/CD (Optional)

```yaml
# .github/workflows/tests.yml
jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate missing tests
        run: |
          cd ai-agents
          npm install
          npm run agent:test -- --coverage-check
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Cost Calculator

### Monthly Estimates

**Minimal Setup (Next.js only)**
- Hosting: $0-5 (Vercel free tier)
- Database: $0-5 (Supabase free tier)
- **Total: $0-10/month**

**With ML Service**
- Next.js: $0-5
- Database: $0-5
- ML Service Container (2GB RAM): $15-30
- **Total: $15-40/month**

**With All Services**
- Next.js: $0-5
- Database: $5-20
- ML Service: $15-30
- LLM APIs (AI Agents): $5-20
- **Total: $25-75/month**

### Traffic-Based Scaling

| Monthly Active Users | Recommended Setup | Est. Cost |
|---------------------|-------------------|-----------|
| 0-1K | Next.js only | $0-10 |
| 1K-10K | + ML Service | $15-40 |
| 10K-100K | + Rust modules | $50-150 |
| 100K+ | + Kubernetes + Caching | $200-500+ |

---

## Troubleshooting

### ML Service won't start

```bash
# Check Python version (needs 3.11+)
python --version

# Reinstall dependencies
cd ml-service
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Rust build fails

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential pkg-config libssl-dev

# macOS
xcode-select --install
brew install pkg-config openssl
```

### AI Agent API errors

```bash
# Check API key is set
cd ai-agents
cat .env | grep API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits
# OpenAI: https://platform.openai.com/account/rate-limits
# Anthropic: https://console.anthropic.com/settings/limits
```

### Next.js can't connect to ML service

```bash
# Check ML service is running
curl http://localhost:8000/health

# Check environment variable
echo $ML_SERVICE_URL

# Check Next.js can reach it
curl http://localhost:3000/api/ml/status

# Check Docker networking (if using Docker)
docker network inspect bridge
```

---

## Feature Flags

Toggle services without code changes:

```bash
# .env.local or production environment variables

# Enable/disable ML service
ML_SERVICE_URL=http://localhost:8000  # Enabled
# ML_SERVICE_URL=                      # Disabled (graceful fallback)

# Enable/disable specific ML features
ENABLE_ML_RECOMMENDATIONS=true
ENABLE_ML_FORECASTING=true
ENABLE_ML_TRENDING=true

# AI agent settings
AI_AGENT_PROVIDER=openai  # or 'anthropic'
AI_AGENT_MODEL=gpt-4     # or 'claude-3-opus'
```

---

## Health Checks

Add to your monitoring:

```bash
# Check all services
curl http://localhost:3000/api/health        # Next.js
curl http://localhost:8000/health            # ML Service
curl http://localhost:3000/api/ml/status     # ML integration

# Expected responses
# Next.js: {"status":"ok"}
# ML Service: {"status":"healthy","version":"1.0.0"}
# ML Status: {"available":true,"latency":150}
```

---

## Performance Testing

### Before enabling ML service

```bash
# Benchmark baseline
ab -n 100 -c 10 http://localhost:3000/api/personalization/recommend

# Expected: ~50-100ms per request
```

### After enabling ML service

```bash
# Benchmark with ML
ab -n 100 -c 10 http://localhost:3000/api/ml/recommend

# Expected: ~100-500ms per request (higher quality results)
```

### Rust module performance

```bash
cd rust-modules/embedding-processor
cargo bench

# Compare:
# Python: 500ms for 10K vectors
# Rust: 10ms for 10K vectors
```

---

## When Should You Enable Each Service?

### Enable ML Service When:
- ✅ You have >500 active users
- ✅ You want personalized recommendations
- ✅ You need demand forecasting
- ✅ You're okay with 100-500ms API latency
- ✅ Budget allows $15-30/month

### Enable Rust Modules When:
- ✅ ML service responses are too slow (>1s)
- ✅ You have >10K items in database
- ✅ You need real-time search (<100ms)
- ✅ You're comfortable with Rust toolchain

### Enable AI Agents When:
- ✅ You have frequent schema changes
- ✅ Your team wants automated test generation
- ✅ You have OpenAI/Anthropic API budget
- ✅ You want to speed up development workflow

---

## Next Steps

1. **Start with core app** - Deploy Next.js, verify everything works
2. **Add ML service** - Follow 5-minute setup above
3. **Monitor performance** - Check latency and user engagement
4. **Consider Rust** - If ML is slow, add Rust modules
5. **Optional: AI agents** - For development automation

### Related Documentation

- 📖 Full architecture explanation: [`MICROSERVICES_ARCHITECTURE.md`](./MICROSERVICES_ARCHITECTURE.md)
- 🚀 ML service details: [`ml-service/README.md`](./ml-service/README.md)
- ⚡ Rust modules details: [`rust-modules/README.md`](./rust-modules/README.md)
- 🤖 AI agents details: [`ai-agents/README.md`](./ai-agents/README.md)
- 🚢 Deployment guide: [`DEPLOYMENT_RUST_AI.md`](./DEPLOYMENT_RUST_AI.md)

---

**Need help?** Open an issue or check the full documentation.

**Last Updated**: 2025-11-06
