# Microservices Architecture Guide

## Overview

Urban Manual uses a **modular microservices architecture** where advanced intelligence features are separated from the core Next.js application. This design provides flexibility, performance optimization, and independent scalability.

## Why These Services Are Separate

### Architectural Principles

1. **Technology Diversity**
   - **Rust modules** require native compilation and Cargo build tooling
   - **Python ML service** uses specialized ML libraries (LightFM, Prophet) incompatible with Node.js
   - **AI agents** are CPU-intensive and better suited for background processing
   - Next.js cannot directly run these languages/tools

2. **Performance Isolation**
   - ML inference and Rust operations are computationally expensive
   - Separating them prevents blocking the main Next.js event loop
   - Allows independent scaling based on usage patterns

3. **Optional Enhancement**
   - Core app functions fully without these services
   - Graceful degradation when services unavailable
   - Reduces deployment complexity for basic setups
   - Users can enable features incrementally

4. **Independent Deployment**
   - Each service can be deployed, scaled, and updated independently
   - Different resource requirements (CPU, memory, GPU)
   - Serverless functions vs. containerized services vs. CLI tools

5. **Build System Separation**
   - Next.js TypeScript build (`tsc`, `turbopack`)
   - Rust compilation (`cargo`, `maturin`)
   - Python packaging (`pip`, `poetry`)
   - Node.js CLI tools (`tsx`, `commander`)

### Services Excluded from TypeScript Build

See `tsconfig.json:47-50`:

```json
{
  "exclude": [
    "ai-agents",
    "rust-modules",
    "ml-service",
    "ios-app",
    "supabase/functions"
  ]
}
```

---

## Service Catalog

| Service | Language | Purpose | Status | Required |
|---------|----------|---------|--------|----------|
| **Main App** | Next.js/TypeScript | Core web application | Production | ✅ Yes |
| **ML Service** | Python/FastAPI | Recommendations & forecasting | Optional | ⚠️ No |
| **Rust Modules** | Rust | High-performance vector operations | Optional | ⚠️ No |
| **AI Agents** | TypeScript/LangGraph | Dev automation & code generation | Optional | ⚠️ No |
| **iOS App** | Swift | Native iOS application | Separate | ⚠️ No |
| **Supabase Functions** | TypeScript/Deno | Edge functions | Production | ✅ Yes |

---

## 1. ML Service (Python)

### What It Provides

- **Collaborative Filtering** - Personalized recommendations using LightFM
- **Demand Forecasting** - Time series prediction with Prophet
- **Trending Detection** - Real-time trending destination analysis
- **Peak Time Analysis** - Optimal booking time predictions

### Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (Port 3000)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   ML Service    │
│  (Port 8000)    │  ← FastAPI
│                 │
│  ┌───────────┐  │
│  │ LightFM   │  │  ← Collaborative filtering
│  │ Prophet   │  │  ← Time series forecasting
│  │ NumPy     │  │  ← Numerical operations
│  └───────────┘  │
└─────────────────┘
```

### How It Works Today

**Without ML Service:**
- API routes return fallback data
- Uses basic algorithmic recommendations
- No personalization or forecasting

**With ML Service:**
- Next.js proxies requests to Python service
- API routes at `/api/ml/*` forward to `ML_SERVICE_URL`
- Timeouts (3-5s) with graceful fallback

### Integration Points

| Next.js API Route | ML Service Endpoint | Fallback Behavior |
|-------------------|---------------------|-------------------|
| `/api/ml/recommend` | `POST /recommend` | Returns empty array |
| `/api/ml/forecast/demand` | `POST /forecast/demand` | Returns current stats |
| `/api/ml/forecast/trending` | `GET /forecast/trending` | Returns popular destinations |
| `/api/ml/forecast/peak-times` | `POST /forecast/peak-times` | Returns null |
| `/api/ml/status` | `GET /health` | Returns unavailable status |

### How to Enable

#### Prerequisites

- Python 3.11+
- pip or poetry
- 2GB+ RAM recommended

#### Local Development

```bash
# 1. Navigate to service directory
cd ml-service

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start service
uvicorn main:app --reload --port 8000

# Service now running at http://localhost:8000
```

#### Configure Next.js

```bash
# Add to .env.local
ML_SERVICE_URL=http://localhost:8000
```

#### Verify Integration

```bash
# Check service health
curl http://localhost:8000/health

# Test recommendation endpoint
curl -X POST http://localhost:3000/api/ml/recommend \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "limit": 5}'
```

#### Docker Deployment

```bash
# Build image
docker build -f ml-service/Dockerfile.production -t urban-ml-service .

# Run container
docker run -p 8000:8000 urban-ml-service

# Or use docker-compose
cd ml-service
docker-compose up
```

#### Production Deployment

**Option A: Separate Container**
```yaml
# docker-compose.yml
services:
  ml-service:
    image: urban-ml-service
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    deploy:
      resources:
        limits:
          memory: 2G
```

**Option B: Serverless (AWS Lambda, Google Cloud Run)**
```bash
# Deploy to Cloud Run
gcloud run deploy urban-ml-service \
  --source ml-service \
  --platform managed \
  --region us-central1 \
  --set-env-vars ML_SERVICE_URL=https://your-ml-service-url
```

**Set environment variable:**
```bash
ML_SERVICE_URL=https://ml-service.yourapp.com
```

### Using ML Components (Currently Unused)

The codebase has **pre-built ML-powered components** that are not currently used:

```tsx
// components/ForYouSectionML.tsx - Personalized recommendations
import { ForYouSectionML } from '@/components/ForYouSectionML'

function HomePage() {
  return (
    <div>
      {/* Uses ML service when available, graceful fallback */}
      <ForYouSectionML userId={user.id} />
    </div>
  )
}
```

```tsx
// components/TrendingSectionML.tsx - ML-powered trending
import { TrendingSectionML } from '@/components/TrendingSectionML'

function ExplorePage() {
  return <TrendingSectionML limit={10} />
}
```

```tsx
// hooks/useMLRecommendations.ts - Custom hooks
import { useMLRecommendations, useMLTrending } from '@/hooks/useMLRecommendations'

function MyComponent() {
  const { recommendations, loading, error } = useMLRecommendations(userId)
  const { trending } = useMLTrending()

  // Automatically falls back if ML service unavailable
}
```

### Cost Considerations

**Running ML Service:**
- **Local Development**: Free (uses local resources)
- **Container (1 CPU, 2GB RAM)**: ~$15-30/month
- **Serverless (Cloud Run)**: Pay per request (~$0.01 per 1000 requests)

**Without ML Service:**
- No additional costs
- Basic recommendations work fine for small-medium sites

---

## 2. Rust Modules

### What It Provides

- **Embedding Processor** - 50x faster cosine similarity calculations
- **Vector Search** - 20x faster k-NN search for semantic search

### Architecture

```
┌──────────────────┐
│   ML Service     │
│   (Python)       │
│                  │
│  ┌────────────┐  │
│  │ Rust Module│  │ ← Compiled to Python wheel
│  │   (.so)    │  │ ← Native binary
│  └────────────┘  │
└──────────────────┘
```

### Why Rust?

- **Performance**: Vector operations are 20-50x faster than Python/NumPy
- **Memory Efficiency**: Lower memory footprint for large embeddings
- **Concurrency**: Better parallelization for batch operations
- **Type Safety**: Compile-time guarantees prevent runtime errors

### How to Enable

#### Prerequisites

- Rust 1.70+ (`rustup`)
- Python 3.11+
- maturin (for Python bindings)

#### Build Modules

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install maturin
pip install maturin

# 3. Build embedding processor
cd rust-modules/embedding-processor
maturin develop --release

# 4. Build vector search
cd ../vector-search
maturin develop --release
```

#### Integrate with ML Service

```python
# ml-service/main.py

# Before (pure Python)
import numpy as np
similarities = np.dot(embeddings, query) / (np.linalg.norm(embeddings) * np.linalg.norm(query))

# After (Rust-accelerated)
import embedding_processor
similarities = embedding_processor.cosine_similarity(embeddings, query)  # 50x faster
```

#### Verify Installation

```bash
cd ml-service
source venv/bin/activate
python -c "import embedding_processor; print('Rust module loaded!')"
python -c "import vector_search; print('Vector search loaded!')"
```

#### Deployment

**Development:**
- Build locally, Python wheels installed in venv

**Production:**
- Pre-compile wheels for target platform (Linux x86_64)
- Include in Docker image during build:

```dockerfile
# ml-service/Dockerfile.production
FROM rust:1.70 as builder
WORKDIR /build
COPY rust-modules ./rust-modules
RUN cd rust-modules/embedding-processor && maturin build --release
RUN cd rust-modules/vector-search && maturin build --release

FROM python:3.11-slim
COPY --from=builder /build/rust-modules/target/wheels/*.whl /tmp/
RUN pip install /tmp/*.whl
```

### When to Enable

**Enable Rust modules if:**
- Handling >10,000 embeddings
- Performing real-time semantic search
- Processing large batches of recommendations
- Need sub-100ms response times

**Skip Rust modules if:**
- Small dataset (<1,000 items)
- Batch processing is acceptable
- Don't want compilation complexity

---

## 3. AI Agents (LangGraph)

### What It Provides

- **Migration Generator** - Automatic SQL migration generation from schema changes
- **Test Generator** - Unit/integration test suite generation
- **Code Review** (planned) - Automated PR reviews
- **Documentation** (planned) - Auto-generated docs from code
- **Refactoring** (planned) - Intelligent code refactoring

### Architecture

```
┌──────────────────┐
│  Developer CLI   │
│                  │
│  $ npm run      │
│    agent:migrate│
│                  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   AI Agents      │
│  (LangGraph)     │
│                  │
│  ┌────────────┐  │
│  │ OpenAI API │  │ ← GPT-4 for reasoning
│  │ Anthropic  │  │ ← Claude for code gen
│  └────────────┘  │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│   Codebase      │
│   (Filesystem)  │
└──────────────────┘
```

### Why Separate?

- **Different Runtime**: Runs as CLI tool, not web server
- **Heavy Processing**: LLM API calls can take 10-30s
- **Background Tasks**: Meant for dev automation, not user requests
- **API Costs**: Uses OpenAI/Anthropic APIs (cost per run)

### How to Enable

#### Prerequisites

- Node.js 18+
- OpenAI API key OR Anthropic API key
- Database access (for migration agent)

#### Setup

```bash
# 1. Navigate to agents directory
cd ai-agents

# 2. Install dependencies
npm install

# 3. Configure API keys
cp .env.example .env
# Edit .env and add:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-...
# DATABASE_URL=postgresql://...

# 4. Run agent
npm run agent:migrate -- --help
```

#### Available Commands

```bash
# Generate migration from schema changes
npm run agent:migrate -- \
  --from schema/old.sql \
  --to schema/new.sql \
  --output migrations/001_update.sql

# Generate tests for a module
npm run agent:test -- \
  --file services/recommendations.ts \
  --output tests/recommendations.test.ts \
  --framework jest
```

#### Integration with Development Workflow

**Option 1: Manual CLI usage**
```bash
# Developer runs when needed
npm run agent:migrate -- --auto-detect
```

**Option 2: Git hooks**
```bash
# .husky/pre-commit
#!/bin/sh
cd ai-agents
npm run agent:test -- --changed-files
```

**Option 3: CI/CD pipeline**
```yaml
# .github/workflows/ai-agents.yml
- name: Generate tests
  run: |
    cd ai-agents
    npm run agent:test -- --coverage-check
```

### Cost Considerations

**API Usage:**
- Migration generation: ~$0.01-0.05 per run (GPT-4)
- Test generation: ~$0.02-0.10 per file
- Monthly estimate for active dev: ~$5-20/month

**When to Enable:**
- Large team with frequent schema changes
- Want automated test generation
- Have budget for LLM API calls

**When to Skip:**
- Solo developer or small team
- Manual migrations preferred
- Want to minimize external dependencies

---

## Integration Decision Matrix

### Should You Enable These Services?

| Scenario | ML Service | Rust Modules | AI Agents |
|----------|------------|--------------|-----------|
| **MVP / Small Site** | ❌ No | ❌ No | ❌ No |
| **Growing Site (1K-10K users)** | ✅ Yes | ❌ No | ⚠️ Maybe |
| **Large Site (10K+ users)** | ✅ Yes | ✅ Yes | ✅ Yes |
| **E-commerce Focus** | ✅ Yes (personalization) | ⚠️ If slow | ❌ No |
| **Content Discovery Focus** | ✅ Yes (trending) | ✅ Yes (search) | ❌ No |
| **Active Development Team** | ⚠️ Maybe | ❌ No | ✅ Yes |
| **Solo Developer** | ❌ No | ❌ No | ⚠️ Maybe |
| **Serverless Deployment** | ✅ Yes (Cloud Run) | ❌ Complex | ❌ No |
| **Kubernetes Deployment** | ✅ Yes | ✅ Yes | ⚠️ As job |

---

## Performance Impact

### Without Optional Services

- **Bundle Size**: ~2MB (Next.js app only)
- **Cold Start**: ~500ms
- **API Response**: 50-200ms
- **Memory**: ~512MB
- **Cost**: $5-10/month (Vercel free tier)

### With All Services Enabled

- **Bundle Size**: ~2MB (Next.js) + 150MB (ML) + 50MB (Rust) + 30MB (AI)
- **Cold Start**: Next.js 500ms, ML 2-3s, Rust instant, AI varies
- **API Response**: 100-500ms (ML calls), 10-50ms (Rust), 10-30s (AI)
- **Memory**: 512MB (Next.js) + 2GB (ML) + minimal (Rust) + 1GB (AI)
- **Cost**: $50-150/month (containers + LLM API)

---

## Testing Service Integration

### Verify ML Service

```bash
# 1. Start ML service
cd ml-service && uvicorn main:app --reload

# 2. In another terminal, test endpoints
curl http://localhost:8000/health
# Expected: {"status": "healthy", "version": "1.0.0"}

# 3. Test from Next.js
curl http://localhost:3000/api/ml/status
# Expected: {"available": true, ...}
```

### Verify Rust Modules

```bash
cd ml-service
source venv/bin/activate
python << EOF
import embedding_processor
import numpy as np

vec1 = np.array([1.0, 2.0, 3.0])
vec2 = np.array([2.0, 3.0, 4.0])
similarity = embedding_processor.cosine_similarity(vec1, vec2)
print(f"Similarity: {similarity}")  # Should print ~0.974
EOF
```

### Verify AI Agents

```bash
cd ai-agents
npm run agent:migrate -- --help
# Should show usage instructions
```

---

## Common Issues

### ML Service

**Issue**: `ModuleNotFoundError: No module named 'lightfm'`
```bash
# Solution: Reinstall dependencies
pip install -r requirements.txt
```

**Issue**: `Connection refused to localhost:8000`
```bash
# Solution: Ensure ML service is running
ps aux | grep uvicorn
cd ml-service && uvicorn main:app --reload
```

### Rust Modules

**Issue**: `maturin: command not found`
```bash
# Solution: Install maturin
pip install maturin
```

**Issue**: `error: linker 'cc' not found`
```bash
# Solution: Install build tools
# Ubuntu/Debian
sudo apt-get install build-essential

# macOS
xcode-select --install
```

### AI Agents

**Issue**: `Error: OPENAI_API_KEY not set`
```bash
# Solution: Add API key to .env
cd ai-agents
echo "OPENAI_API_KEY=sk-your-key" >> .env
```

**Issue**: `Rate limit exceeded`
```bash
# Solution: Wait or upgrade API tier
# Or switch to Anthropic:
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

---

## Migration Path

### Starting Small (Recommended)

```
Week 1: Core App Only
  └─ Deploy Next.js to Vercel/Railway
  └─ Use basic recommendations
  └─ No additional services

Week 2-4: Add ML Service
  └─ Deploy ML service to Cloud Run
  └─ Enable recommendations endpoint
  └─ Monitor performance/cost

Week 5-8: Add Rust Modules (if needed)
  └─ Build Rust wheels
  └─ Update ML service Docker image
  └─ Benchmark performance improvement

Week 9+: Add AI Agents (optional)
  └─ Set up for dev team only
  └─ Integrate with CI/CD
  └─ Monitor API costs
```

### Going All-In

```
Deploy all services simultaneously:
1. Set up Kubernetes cluster
2. Deploy all services as separate pods
3. Configure service mesh (Istio/Linkerd)
4. Set up monitoring (Prometheus/Grafana)
5. Configure auto-scaling rules

Cost: ~$100-300/month
Complexity: High
Benefits: Full feature set, optimal performance
```

---

## Monitoring & Observability

### Service Health Checks

```bash
# Next.js
curl http://localhost:3000/api/health

# ML Service
curl http://localhost:8000/health

# Check integration
curl http://localhost:3000/api/ml/status
```

### Logging

Each service logs separately:

```bash
# Next.js logs
npm run dev  # stdout

# ML Service logs
# In ml-service/main.py - uses Python logging
tail -f ml-service/logs/app.log

# AI Agents logs
# In ai-agents/ - uses console.log
npm run agent:migrate -- --verbose
```

### Metrics to Track

| Service | Key Metrics | Alert Threshold |
|---------|-------------|-----------------|
| ML Service | Response time, cache hit rate, error rate | >5s response, >5% errors |
| Rust Modules | Processing time, memory usage | >1s for 10K vectors |
| AI Agents | API cost, generation success rate | >$50/day, <80% success |

---

## Security Considerations

### ML Service

- **Authentication**: Add API key validation in production
- **Rate Limiting**: Prevent abuse of expensive ML operations
- **Data Privacy**: User data stays in your database, not sent to external services

### AI Agents

- **API Keys**: Store in environment variables, never commit
- **Code Access**: Agents can read/write files - run in sandboxed environment
- **Output Validation**: Review generated code before committing

### Rust Modules

- **Memory Safety**: Rust provides memory safety guarantees
- **No Network Access**: Modules are pure computation, no external calls

---

## Conclusion

The microservices architecture allows Urban Manual to:

1. **Start Simple**: Deploy just the Next.js app
2. **Scale Gradually**: Add services as needed
3. **Optimize Costs**: Pay only for what you use
4. **Maintain Flexibility**: Each service evolves independently

### Quick Start Recommendations

**For Most Users:**
```bash
# Just deploy Next.js app
vercel deploy
# Everything works with fallback behavior
```

**For Power Users:**
```bash
# Add ML service for better recommendations
docker run -p 8000:8000 urban-ml-service
# Set ML_SERVICE_URL in production
```

**For Advanced Users:**
```bash
# Full stack with all services
docker-compose -f docker-compose.full.yml up
# Requires more resources but maximum features
```

### Need Help?

- ML Service docs: `/ml-service/README.md`
- Rust modules docs: `/rust-modules/README.md`
- AI agents docs: `/ai-agents/README.md`
- Deployment guide: `/DEPLOYMENT_RUST_AI.md`
- ML integration: `/ML_INTEGRATION.md`

---

**Last Updated**: 2025-11-06
**Architecture Version**: 1.0
