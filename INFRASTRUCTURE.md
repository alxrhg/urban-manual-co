# Infrastructure Documentation

## Overview

The Urban Manual is deployed using a modern, cloud-native infrastructure:

- **Frontend/Backend**: Vercel (Next.js serverless)
- **Database**: Supabase (PostgreSQL)
- **ML Service**: Containerized Python service (Railway/Fly.io recommended)
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics & Logs
- **Cache**: Upstash Redis
- **Search**: Google Discovery Engine (optional)

## Architecture Diagram

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Vercel CDN/Edge    │
│  (Global Network)   │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────┐
│  Next.js 16 Application      │
│  - App Router                │
│  - Server Components         │
│  - API Routes                │
│  - Edge Functions            │
└──────┬───────────────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│  Supabase   │    │  ML Service  │
│  - PostgreSQL│    │  - FastAPI   │
│  - Auth     │    │  - Prophet   │
│  - Storage  │    │  - LightFM   │
│  - Realtime │    │  - Docker    │
└─────────────┘    └──────────────┘
       │
       ▼
┌─────────────┐
│  Upstash    │
│  - Redis    │
│  - Vector   │
│  - QStash   │
└─────────────┘
```

## Deployment Environments

### Production
- **URL**: https://urbanmanual.com (or Vercel-assigned URL)
- **Branch**: `main`
- **Auto-deploy**: Yes
- **Environment**: Production
- **Monitoring**: Enabled

### Preview
- **URL**: Auto-generated per PR
- **Branch**: Any PR to `main`
- **Auto-deploy**: Yes
- **Environment**: Preview
- **Monitoring**: Enabled

### Development
- **URL**: Local (http://localhost:3000)
- **Branch**: Any
- **Environment**: Development

## CI/CD Pipeline

### GitHub Actions Workflows

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Triggers: Push/PR to main/develop
   - Jobs:
     - Lint code
     - Type checking
     - Run tests
     - Build application
     - Security scanning
   
2. **ML Service CI** (`.github/workflows/ml-service-ci.yml`)
   - Triggers: Changes to ml-service/
   - Jobs:
     - Lint Python code
     - Run tests
     - Build Docker image

3. **Dependabot** (`.github/dependabot.yml`)
   - Automatic dependency updates
   - Weekly schedule
   - Grouped updates for related packages

### Vercel Deployment

Automatic deployment triggers:
- Push to `main` → Production
- Pull Request → Preview deployment
- Manual deployment via Vercel dashboard

## Environment Variables

### Required Variables (All Environments)

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
POSTGRES_URL=postgresql://xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Payload CMS
PAYLOAD_SECRET=xxx (min 32 chars)

# Google Services
NEXT_PUBLIC_GOOGLE_API_KEY=xxx
GOOGLE_AI_API_KEY=xxx
```

### Optional Variables

```bash
# ML Service
ML_SERVICE_URL=https://ml-service.railway.app

# Upstash
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
UPSTASH_VECTOR_REST_URL=xxx
UPSTASH_VECTOR_REST_TOKEN=xxx

# Google Discovery Engine
GOOGLE_CLOUD_PROJECT_ID=xxx
DISCOVERY_ENGINE_DATA_STORE_ID=xxx

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=xxx
MAPKIT_TEAM_ID=xxx
MAPKIT_KEY_ID=xxx
MAPKIT_PRIVATE_KEY=xxx

# External APIs
OPENAI_API_KEY=xxx
TAVILY_API_KEY=xxx
EXA_API_KEY=xxx
```

## Container Deployment

### Docker Compose (Local Development)

```bash
# Start all services
docker-compose up

# Start in development mode with hot reload
docker-compose --profile dev up

# Build without cache
docker-compose build --no-cache

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Container Deployment

**Option 1: Railway**
```bash
# Deploy ML service
railway up --service ml-service

# Set environment variables in Railway dashboard
```

**Option 2: Fly.io**
```bash
# Deploy ML service
fly deploy --config ml-service/fly.toml
```

**Option 3: Google Cloud Run**
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/ml-service ml-service/

# Deploy
gcloud run deploy ml-service \
  --image gcr.io/PROJECT-ID/ml-service \
  --platform managed \
  --region us-central1
```

## Database Management

### Supabase Migrations

Location: `/supabase/migrations/`

```bash
# Apply migrations locally
supabase db push

# Create new migration
supabase db diff -f migration_name

# Reset database (development only)
supabase db reset
```

### Backup & Recovery

- **Automatic backups**: Enabled in Supabase (daily)
- **Point-in-time recovery**: Available on Pro plan
- **Manual backup**: Available via Supabase dashboard

## Monitoring & Observability

### Application Monitoring

1. **Vercel Analytics**
   - Real User Monitoring (RUM)
   - Web Vitals tracking
   - Visitor insights

2. **Vercel Logs**
   - Function logs (7 days retention on Pro)
   - Edge function logs
   - Build logs

3. **Health Checks**
   - Endpoint: `/api/health`
   - Checks environment variables
   - Returns 200 (healthy) or 503 (unhealthy)

### Performance Monitoring

- **Build times**: Tracked in Vercel dashboard
- **Function execution**: Cold starts and duration
- **Edge cache**: Hit rates and performance

### Error Tracking

- Built-in Next.js error handling
- Custom error boundaries
- API route error responses

## Security

### Security Headers

Configured in `next.config.ts`:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Permissions-Policy

### Secret Management

- **Development**: `.env.local` (gitignored)
- **Production**: Vercel Environment Variables
- **CI/CD**: GitHub Secrets

### Dependency Scanning

- **Dependabot**: Automated vulnerability alerts
- **npm audit**: Run in CI pipeline
- **TruffleHog**: Secret scanning in CI

## Scaling Strategy

### Horizontal Scaling

- **Vercel**: Automatic scaling (serverless)
- **Supabase**: Connection pooling enabled
- **ML Service**: Scale containers as needed

### Caching Strategy

1. **Edge caching**: Static assets (1 year)
2. **API caching**: Upstash Redis (configurable TTL)
3. **Database caching**: Supabase built-in caching

### Rate Limiting

- Implemented via Upstash Rate Limit
- Configurable per endpoint
- Fallback to in-memory for development

## Disaster Recovery

### Backup Strategy

1. **Database**: Daily automated backups (Supabase)
2. **Code**: Git repository (GitHub)
3. **Environment**: Documented in this file

### Recovery Procedures

1. **Application failure**:
   - Rollback via Vercel dashboard
   - Deploy previous commit

2. **Database corruption**:
   - Restore from Supabase backup
   - Point-in-time recovery if needed

3. **Complete outage**:
   - Redeploy from Git
   - Restore database
   - Configure environment variables

## Cost Optimization

### Current Costs (Estimated)

- **Vercel Pro**: ~$20/month
- **Supabase Pro**: ~$25/month
- **Upstash**: Free tier (sufficient for most usage)
- **ML Service**: ~$5-20/month (Railway/Fly.io)
- **Total**: ~$50-65/month

### Optimization Tips

1. Enable edge caching for static content
2. Use ISR for frequently accessed pages
3. Optimize images (already configured)
4. Monitor and limit API calls
5. Use connection pooling for database

## Troubleshooting

### Common Issues

1. **Build failures**
   - Check environment variables
   - Review build logs in Vercel
   - Ensure dependencies are installed

2. **Database connection issues**
   - Verify POSTGRES_URL is correct
   - Check connection pooling settings
   - Monitor connection count

3. **ML Service unreachable**
   - Verify ML_SERVICE_URL
   - Check ML service health endpoint
   - Review ML service logs

### Debug Tools

```bash
# Check health endpoint
curl https://urbanmanual.com/api/health

# View Vercel logs
vercel logs

# Check build output
vercel build
```

## Maintenance

### Regular Tasks

- **Weekly**: Review Dependabot PRs
- **Weekly**: Check Vercel analytics for anomalies
- **Monthly**: Review and update dependencies
- **Monthly**: Review security advisories
- **Quarterly**: Database optimization
- **Quarterly**: Cost review and optimization

### Update Procedures

1. **Dependencies**:
   - Review Dependabot PRs
   - Test in preview environment
   - Merge to main

2. **Infrastructure**:
   - Plan changes
   - Test in development
   - Deploy to production
   - Monitor for issues

## Support & Escalation

### Internal Team
- Platform Engineering: Platform team
- Database Issues: Backend team
- ML Service: Data Science team

### External Vendors
- Vercel: support@vercel.com (Pro plan support)
- Supabase: support@supabase.io
- Upstash: support@upstash.com

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Deploy to Vercel](./DEPLOY_TO_VERCEL.md)
- [Security Documentation](./SECURITY.md)
- [ML Service README](./ml-service/README.md)
- [Environment Setup](./.env.example)
