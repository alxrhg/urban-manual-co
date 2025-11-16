# Professional-Grade Infrastructure Plan
**Date:** November 16, 2025  
**Context:** Building most efficient, professional-grade infrastructure  
**Scope:** Production-ready architecture with industry best practices

---

## Executive Summary

This plan elevates the structural reorganization to **professional, enterprise-grade standards** with:
- Scalable monorepo architecture
- Production-grade CI/CD pipeline
- Comprehensive monitoring and observability
- Security-first design
- Performance optimization
- Developer experience excellence

---

## Part 1: Professional Architecture

### 1.1 Monorepo Structure (Turborepo/Nx)

**Goal:** Maximum efficiency, code reuse, atomic changes

```
urban-manual/
├── apps/
│   ├── web/                          # Main Next.js application
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   ├── features/             # Feature modules
│   │   │   ├── shared/               # Shared code
│   │   │   └── config/
│   │   ├── public/
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── admin/                        # Admin dashboard (separate app)
│   │   └── src/
│   │
│   └── mobile/                       # Mobile app (Capacitor/React Native)
│       └── src/
│
├── packages/
│   ├── ui/                          # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── themes/
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── database/                    # Database client & schemas
│   │   ├── src/
│   │   │   ├── client/
│   │   │   ├── schemas/
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   ├── api-client/                  # Type-safe API client
│   │   ├── src/
│   │   │   ├── generated/          # OpenAPI/tRPC generated
│   │   │   └── client.ts
│   │   └── package.json
│   │
│   ├── utils/                       # Shared utilities
│   │   └── src/
│   │
│   ├── types/                       # Shared TypeScript types
│   │   └── src/
│   │
│   ├── config/                      # Shared configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   │
│   └── analytics/                   # Analytics abstraction
│       └── src/
│
├── services/
│   ├── ml-service/                  # Python ML service
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── worker/                      # Background jobs (BullMQ)
│       ├── src/
│       └── Dockerfile
│
├── infra/                           # Infrastructure as Code
│   ├── terraform/
│   │   ├── modules/
│   │   ├── environments/
│   │   │   ├── production/
│   │   │   ├── staging/
│   │   │   └── development/
│   │   └── main.tf
│   │
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   │
│   └── docker/
│       ├── web.Dockerfile
│       ├── ml.Dockerfile
│       └── worker.Dockerfile
│
├── docs/
│   ├── architecture/
│   │   ├── adr/                     # Architecture Decision Records
│   │   ├── diagrams/
│   │   └── overview.md
│   ├── api/
│   │   ├── openapi.yaml
│   │   └── graphql.schema
│   ├── deployment/
│   └── development/
│
├── scripts/
│   ├── setup/
│   ├── build/
│   ├── deployment/
│   └── maintenance/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-production.yml
│   │   ├── cd-staging.yml
│   │   └── security-scan.yml
│   └── CODEOWNERS
│
├── turbo.json                       # Turborepo config
├── package.json                     # Root package.json
└── pnpm-workspace.yaml             # PNPM workspace
```

**Key Benefits:**
- ✅ Shared code between apps (no duplication)
- ✅ Atomic changes across packages
- ✅ Incremental builds (only changed packages)
- ✅ Type safety across boundaries
- ✅ Parallel execution (faster CI/CD)

---

### 1.2 Feature-Based Architecture (Within Apps)

```typescript
// apps/web/src/features/destinations/

destinations/
├── index.ts                         # Public API
├── types/
│   ├── destination.types.ts
│   ├── filter.types.ts
│   └── index.ts
├── api/
│   ├── queries.ts                   # React Query queries
│   ├── mutations.ts                 # React Query mutations
│   └── endpoints.ts                 # API endpoints
├── components/
│   ├── DestinationCard/
│   │   ├── DestinationCard.tsx
│   │   ├── DestinationCard.test.tsx
│   │   ├── DestinationCard.stories.tsx
│   │   └── index.ts
│   ├── DestinationGrid/
│   └── index.ts
├── hooks/
│   ├── useDestination.ts
│   ├── useDestinations.ts
│   ├── useDestinationFilters.ts
│   └── index.ts
├── services/
│   ├── destination.service.ts
│   └── index.ts
├── store/
│   ├── destination.slice.ts         # Redux/Zustand
│   └── index.ts
├── utils/
│   ├── destination-utils.ts
│   └── index.ts
├── constants/
│   └── destination.constants.ts
└── README.md                        # Feature documentation
```

**Export Pattern (Barrel Files):**
```typescript
// features/destinations/index.ts
export { DestinationCard, DestinationGrid } from './components';
export { useDestination, useDestinations } from './hooks';
export { destinationService } from './services';
export type { Destination, DestinationFilter } from './types';
```

---

## Part 2: Production-Grade CI/CD

### 2.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      affected: ${{ steps.affected.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Detect affected packages
        id: affected
        run: |
          echo "packages=$(pnpm turbo run build --dry-run=json | jq -c '.packages')" >> $GITHUB_OUTPUT

  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint
      - run: pnpm turbo run typecheck

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test -- --shard=${{ matrix.shard }}/4
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: apps/*/dist

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps
      - run: pnpm turbo run e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
      - name: SAST with Semgrep
        uses: returntocorp/semgrep-action@v1
      - name: Dependency audit
        run: pnpm audit --audit-level=high

  performance:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/destination/example
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

### 2.2 Deployment Pipeline

```yaml
# .github/workflows/cd-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Run smoke tests
        run: pnpm run test:smoke
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      
      - name: Create Sentry release
        uses: getsentry/action-release@v1
        with:
          environment: production
```

---

## Part 3: Monitoring & Observability

### 3.1 Application Performance Monitoring (APM)

**Setup Sentry:**
```typescript
// apps/web/src/config/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Profiling
  profilesSampleRate: 0.1,
  
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/urbanmanual\.com/],
    }),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

---

### 3.2 Logging Infrastructure

**Structured Logging with Pino:**
```typescript
// packages/utils/src/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token'],
    remove: true,
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export { logger };

// Usage
logger.info({ userId: '123', action: 'login' }, 'User logged in');
logger.error({ err, userId: '123' }, 'Failed to process payment');
```

---

### 3.3 Metrics & Analytics

**OpenTelemetry Setup:**
```typescript
// apps/web/src/config/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const sdk = new NodeSDK({
  metricReader: new PrometheusExporter({
    port: 9464,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
```

---

## Part 4: Security Best Practices

### 4.1 Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];
```

---

### 4.2 Rate Limiting

```typescript
// apps/web/src/middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'ratelimit',
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    });
  }

  return NextResponse.next();
}
```

---

## Part 5: Performance Optimization

### 5.1 Build Optimization

**Turbo Configuration:**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "cache": true
    },
    "lint": {
      "cache": true,
      "outputs": []
    },
    "test": {
      "cache": true,
      "outputs": ["coverage/**"],
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "remoteCache": {
    "signature": true
  }
}
```

---

### 5.2 Runtime Performance

**Next.js Config Optimization:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Enable SWC minification
  swcMinify: true,
  
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      );
    }
    
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};
```

---

## Part 6: Developer Experience

### 6.1 Development Tools

**Pre-commit Hooks (Husky + Lint-staged):**
```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
pnpm turbo run typecheck --filter=...{HEAD}
pnpm turbo run test --filter=...{HEAD} -- --passWithNoTests
```

---

### 6.2 VSCode Configuration

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "eslint.workingDirectories": [
    { "mode": "auto" }
  ],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Part 7: Testing Strategy

### 7.1 Test Pyramid

```
        /\
       /  \
      / E2E \
     /--------\
    /Integration\
   /--------------\
  /   Unit Tests   \
 /------------------\
```

**Coverage Targets:**
- Unit Tests: 80%+
- Integration Tests: 60%+
- E2E Tests: Critical paths

---

### 7.2 Testing Infrastructure

```typescript
// packages/test-utils/src/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

---

## Part 8: Documentation Standards

### 8.1 Architecture Decision Records (ADR)

```markdown
# ADR-001: Adopt Monorepo with Turborepo

## Status
Accepted

## Context
Need to share code between web, admin, and mobile apps efficiently.

## Decision
Adopt monorepo structure using Turborepo and PNPM workspaces.

## Consequences
### Positive
- Shared code without duplication
- Atomic changes across packages
- Faster CI/CD with caching

### Negative
- Initial setup complexity
- Learning curve for team

## Alternatives Considered
- Multiple repos with npm packages
- Git submodules
```

---

### 8.2 API Documentation

```yaml
# docs/api/openapi.yaml
openapi: 3.0.0
info:
  title: Urban Manual API
  version: 1.0.0
  description: Professional travel guide API

servers:
  - url: https://api.urbanmanual.com/v1
    description: Production
  - url: https://staging-api.urbanmanual.com/v1
    description: Staging

paths:
  /destinations:
    get:
      summary: List destinations
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DestinationList'
```

---

## Part 9: Migration Timeline

### Week 1: Infrastructure Setup
**Days 1-2:** Monorepo scaffolding
- Install Turborepo
- Set up PNPM workspaces
- Create packages structure
- Configure Turbo pipeline

**Days 3-4:** CI/CD Pipeline
- GitHub Actions workflows
- Security scanning
- Performance monitoring setup

**Day 5:** Documentation framework
- ADR template
- API documentation
- Development guides

---

### Week 2: Code Migration
**Days 1-3:** Package extraction
- Extract shared UI components
- Extract database client
- Extract utilities

**Days 4-5:** Feature reorganization
- Migrate to feature-based structure
- Update imports
- Validate builds

---

### Week 3: Testing & Optimization
**Days 1-2:** Testing infrastructure
- Set up test utilities
- Migrate existing tests
- Add E2E tests

**Days 3-4:** Performance optimization
- Bundle analysis
- Code splitting
- Image optimization

**Day 5:** Final validation
- Full test suite
- Performance benchmarks
- Security audit

---

## Success Metrics

### Build Performance
- ✅ CI pipeline < 5 minutes (cached)
- ✅ Local build < 2 minutes (cached)
- ✅ Hot reload < 1 second

### Code Quality
- ✅ Test coverage > 80%
- ✅ TypeScript strict mode
- ✅ Zero ESLint errors
- ✅ Lighthouse score > 95

### Developer Experience
- ✅ Onboarding < 1 hour
- ✅ Clear documentation
- ✅ Automated workflows
- ✅ Fast feedback loops

### Production Metrics
- ✅ 99.9% uptime
- ✅ < 2s page load (P95)
- ✅ < 100ms API response (P95)
- ✅ Zero critical security issues

---

## Conclusion

This professional-grade infrastructure provides:

1. **Scalability:** Monorepo supports multiple apps/services
2. **Reliability:** Comprehensive testing and monitoring
3. **Security:** Industry-standard security practices
4. **Performance:** Optimized builds and runtime
5. **Maintainability:** Clear structure and documentation
6. **Developer Experience:** Fast, automated workflows

**Next Steps:**
1. Review and approve this plan
2. Set up infrastructure (Week 1)
3. Migrate code (Week 2)
4. Optimize and validate (Week 3)

**Estimated Timeline:** 3 weeks for complete migration to professional-grade infrastructure

---

**Status:** Ready for implementation  
**Created:** November 16, 2025  
**Owner:** Engineering Team
