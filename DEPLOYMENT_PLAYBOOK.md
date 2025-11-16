# Deployment Playbook

## Quick Reference

### Emergency Rollback
```bash
# Via Vercel CLI
vercel rollback <deployment-url>

# Via Dashboard
# 1. Go to Deployments tab
# 2. Find the last stable deployment
# 3. Click "Promote to Production"
```

### Health Check
```bash
# Production
curl https://urbanmanual.com/api/health

# Preview (replace with your URL)
curl https://your-preview-url.vercel.app/api/health
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass locally (`npm run test:unit`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] No security vulnerabilities (`npm audit`)

### Environment Variables
- [ ] All required env vars set in Vercel dashboard
- [ ] Secrets rotated if needed
- [ ] Database connection string is correct
- [ ] API keys are valid and have sufficient quota

### Database
- [ ] Migrations tested locally
- [ ] Backup created (if making schema changes)
- [ ] Migration scripts ready (if needed)

### Dependencies
- [ ] All dependencies up to date (or intentionally pinned)
- [ ] No breaking changes in updates
- [ ] Lock file (`package-lock.json`) committed

---

## Deployment Procedures

### 1. Standard Deployment (via Git)

**For Production:**
```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Merge your feature branch
git merge feature/your-branch

# 3. Push to trigger deployment
git push origin main

# 4. Monitor deployment
vercel --logs
```

**For Preview:**
```bash
# Create PR - Vercel automatically creates preview deployment
# Check the deployment URL in PR comments
```

### 2. Manual Deployment (via CLI)

```bash
# Production
vercel --prod

# Preview
vercel

# With specific environment
vercel --prod --env CUSTOM_VAR=value
```

### 3. ML Service Deployment

**Railway:**
```bash
# Deploy to Railway
cd ml-service
railway up

# Set environment variables
railway variables set SUPABASE_URL=xxx
railway variables set SUPABASE_SERVICE_ROLE_KEY=xxx

# Check logs
railway logs
```

**Fly.io:**
```bash
# Deploy to Fly.io
cd ml-service
fly deploy

# Set secrets
fly secrets set SUPABASE_URL=xxx
fly secrets set SUPABASE_SERVICE_ROLE_KEY=xxx

# Check logs
fly logs
```

**Docker (manual):**
```bash
# Build image
docker build -t urban-manual-ml:latest ml-service/

# Run container
docker run -d \
  -p 8000:8000 \
  -e SUPABASE_URL=xxx \
  -e SUPABASE_SERVICE_ROLE_KEY=xxx \
  --name urban-manual-ml \
  urban-manual-ml:latest

# Check health
curl http://localhost:8000/health
```

### 4. Database Migration Deployment

```bash
# 1. Create migration locally
supabase migration new migration_name

# 2. Test migration locally
supabase db reset
supabase db push

# 3. Create backup (Production)
# Go to Supabase Dashboard > Database > Backups > Create Backup

# 4. Apply migration to production
# Option A: Via Supabase Dashboard
#   - Go to SQL Editor
#   - Copy migration SQL
#   - Run query

# Option B: Via CLI (if using Supabase CLI)
supabase db push --db-url "postgresql://..."

# 5. Verify migration
psql $POSTGRES_URL -c "SELECT * FROM migrations ORDER BY created_at DESC LIMIT 5;"
```

---

## Post-Deployment Verification

### Automated Checks
```bash
# Run smoke tests
npm run test:smoke

# Check health endpoint
curl https://urbanmanual.com/api/health

# Verify ML service
curl https://your-ml-service.railway.app/health
```

### Manual Checks
- [ ] Homepage loads correctly
- [ ] User login works
- [ ] Search functionality works
- [ ] AI chat responds
- [ ] Images load correctly
- [ ] Map functionality works
- [ ] No console errors
- [ ] Mobile view works
- [ ] Dark mode works

### Monitoring
- [ ] Check Vercel Analytics for traffic spike/drop
- [ ] Review function execution times
- [ ] Check error rate in Vercel dashboard
- [ ] Monitor database connections in Supabase
- [ ] Review ML service logs (if deployed)

---

## Environment-Specific Procedures

### Production Deployment

**Timing:**
- Best: Low-traffic hours (2-5 AM local time)
- Avoid: Peak hours, weekends, holidays

**Process:**
1. Announce maintenance window (if needed)
2. Create database backup
3. Deploy code changes
4. Run post-deployment verification
5. Monitor for 30 minutes
6. Announce completion

### Preview Deployment

**Automatic:**
- Every PR gets automatic preview deployment
- Preview URL posted as PR comment
- Updates on every push to PR branch

**Manual Testing:**
1. Check preview URL in PR comments
2. Test all changed functionality
3. Verify no regressions
4. Get approval before merging

---

## Rollback Procedures

### Vercel Rollback

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments"
4. Find the last known good deployment
5. Click "..." menu → "Promote to Production"

**Via CLI:**
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>

# Promote specific deployment
vercel promote <deployment-url>
```

### Database Rollback

**Minor Schema Changes:**
```bash
# Run down migration
supabase migration down

# Or run reverse SQL manually
psql $POSTGRES_URL < rollback.sql
```

**Major Issues:**
```bash
# Restore from backup
# 1. Go to Supabase Dashboard
# 2. Database → Backups
# 3. Select backup
# 4. Click "Restore"

# Or via CLI (if available)
supabase db restore backup_id
```

### ML Service Rollback

**Railway:**
```bash
# Via Dashboard
# 1. Go to Deployments
# 2. Select previous deployment
# 3. Click "Rollback"

# Or redeploy previous version
railway up --previous
```

**Fly.io:**
```bash
# List releases
fly releases

# Rollback to previous release
fly releases rollback <version>
```

---

## Troubleshooting Guide

### Build Failures

**Symptom:** Build fails in Vercel
**Possible Causes:**
- Missing environment variables
- Dependency conflicts
- TypeScript errors
- Out of memory

**Solutions:**
```bash
# Check build logs in Vercel dashboard
vercel logs

# Test build locally
npm run build

# Clear cache and rebuild
vercel --force

# Check environment variables
vercel env ls
```

### Runtime Errors

**Symptom:** Application crashes after deployment
**Possible Causes:**
- Database connection issues
- Missing API keys
- Breaking changes in dependencies

**Solutions:**
```bash
# Check function logs
vercel logs --follow

# Test health endpoint
curl https://urbanmanual.com/api/health

# Verify environment variables
vercel env pull .env.production
```

### Database Issues

**Symptom:** Database connection errors
**Possible Causes:**
- Connection pool exhausted
- Wrong connection string
- Network issues
- Migration failures

**Solutions:**
```bash
# Check connection string
echo $POSTGRES_URL

# Test connection
psql $POSTGRES_URL -c "SELECT 1;"

# Check connection pool
# Go to Supabase Dashboard → Database → Connections

# Restart pooler
# Contact Supabase support if needed
```

### ML Service Issues

**Symptom:** ML service unreachable
**Possible Causes:**
- Service not deployed
- Wrong ML_SERVICE_URL
- Service crashed

**Solutions:**
```bash
# Check ML service health
curl https://your-ml-service.railway.app/health

# Check logs (Railway)
railway logs

# Check logs (Fly.io)
fly logs

# Restart service (Railway)
railway restart

# Restart service (Fly.io)
fly restart
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

**Vercel:**
- Function execution time (< 10s ideal)
- Error rate (< 1% target)
- Build time (< 5 min ideal)
- Bandwidth usage

**Supabase:**
- Database CPU (< 80%)
- Active connections (< 80% of max)
- Query performance
- Storage usage

**ML Service:**
- Response time (< 2s ideal)
- CPU usage (< 80%)
- Memory usage (< 80%)
- Error rate (< 1% target)

### Alert Thresholds

```yaml
critical:
  - Error rate > 5%
  - Function timeout > 50%
  - Database CPU > 95%
  - ML service down > 5 min

warning:
  - Error rate > 2%
  - Function time > 15s
  - Database CPU > 80%
  - ML service response > 5s
```

---

## Security Considerations

### Pre-Deployment Security Checks
- [ ] No secrets in code
- [ ] All dependencies scanned for vulnerabilities
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Database RLS policies reviewed

### Post-Deployment Security Checks
- [ ] SSL/TLS working correctly
- [ ] Security headers present
- [ ] No exposed admin endpoints
- [ ] Rate limiting functioning
- [ ] Logs not exposing sensitive data

---

## Disaster Recovery

### Scenario: Complete Site Outage

**Immediate Actions (5 min):**
1. Check Vercel status page
2. Check Supabase status page
3. Verify DNS resolution
4. Check health endpoint

**If Vercel Issue (10 min):**
1. Rollback to last known good deployment
2. Contact Vercel support (Pro plan)
3. Monitor status page for updates

**If Database Issue (15 min):**
1. Check Supabase dashboard
2. Verify connection string
3. Contact Supabase support
4. Consider read-only mode if needed

**If Application Issue (20 min):**
1. Rollback deployment
2. Review error logs
3. Fix issue
4. Redeploy with fix

### Scenario: Data Loss

**Immediate Actions:**
1. Stop all writes to database
2. Create snapshot of current state
3. Notify stakeholders

**Recovery Steps:**
1. Identify last known good backup
2. Review backup data integrity
3. Plan restoration window
4. Restore from backup
5. Verify data integrity
6. Resume normal operations
7. Conduct post-mortem

---

## Communication Templates

### Pre-Deployment Announcement
```
🚀 Deployment Notice

We will be deploying updates to Urban Manual on [DATE] at [TIME] [TIMEZONE].

Expected duration: [X] minutes
Expected downtime: None (rolling deployment)

Changes:
- [Feature/fix 1]
- [Feature/fix 2]

We will notify you when deployment is complete.
```

### Incident Notification
```
⚠️ Incident Notice

We are experiencing issues with [SERVICE] starting at [TIME].

Impact: [DESCRIPTION]
Status: [Investigating/Identified/Fixing/Resolved]

We are working to resolve this as quickly as possible.
Updates will be posted every 15 minutes.
```

### Post-Deployment Success
```
✅ Deployment Complete

The deployment scheduled for [TIME] has been completed successfully.

Changes deployed:
- [Feature/fix 1]
- [Feature/fix 2]

All systems are operating normally.
```

---

## Contacts & Escalation

### Internal Team
- **Platform Lead:** [Name/Contact]
- **Database Admin:** [Name/Contact]
- **Security Lead:** [Name/Contact]
- **On-Call Engineer:** [Rotation schedule]

### External Support
- **Vercel Support:** support@vercel.com (Pro plan)
- **Supabase Support:** support@supabase.io
- **Upstash Support:** support@upstash.com

### Escalation Path
1. On-call engineer (0-15 min)
2. Platform lead (15-30 min)
3. Engineering manager (30-60 min)
4. CTO (60+ min or critical incident)

---

## Change Log

Track all production deployments:

| Date | Version | Deployer | Changes | Rollback |
|------|---------|----------|---------|----------|
| 2025-01-XX | v1.2.0 | @user | Feature X, Bug Y | No |
| 2025-01-XX | v1.1.9 | @user | Hotfix Z | No |

---

## Related Documentation

- [Infrastructure Documentation](./INFRASTRUCTURE.md)
- [Security Documentation](./SECURITY.md)
- [Vercel Deployment Guide](./DEPLOY_TO_VERCEL.md)
- [ML Service README](./ml-service/README.md)
