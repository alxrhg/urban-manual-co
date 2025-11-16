# Monitoring & Observability Guide

## Overview

This document outlines the monitoring, logging, and observability strategy for Urban Manual.

## Monitoring Stack

### Application Monitoring

**Vercel Analytics** (Built-in)
- Real User Monitoring (RUM)
- Core Web Vitals tracking
- Traffic analytics
- Visitor insights
- Deployment analytics

**Vercel Logs** (Pro Plan)
- Function execution logs
- Edge function logs
- Build logs
- 7-day retention (Pro)
- Real-time streaming

### Infrastructure Monitoring

**Supabase Dashboard**
- Database CPU & memory
- Active connections
- Query performance
- Storage usage
- Real-time metrics

**Upstash Dashboard** (if enabled)
- Redis operations/sec
- Cache hit rate
- Memory usage
- Request latency

### Application Health

**Health Check Endpoint**
- URL: `/api/health`
- Returns: Service status, environment checks
- Status codes: 200 (healthy), 503 (unhealthy)

**ML Service Health**
- URL: `/health`
- Returns: Service status
- Status codes: 200 (healthy), 503 (unhealthy)

---

## Key Metrics

### Application Metrics

#### Performance Metrics
```yaml
Response Time:
  - Target: < 500ms (p50)
  - Warning: > 1s (p50)
  - Critical: > 3s (p50)

Core Web Vitals:
  LCP (Largest Contentful Paint):
    - Good: < 2.5s
    - Needs Improvement: 2.5s - 4s
    - Poor: > 4s
  
  FID (First Input Delay):
    - Good: < 100ms
    - Needs Improvement: 100ms - 300ms
    - Poor: > 300ms
  
  CLS (Cumulative Layout Shift):
    - Good: < 0.1
    - Needs Improvement: 0.1 - 0.25
    - Poor: > 0.25

Build Time:
  - Target: < 3 min
  - Warning: > 5 min
  - Critical: > 10 min
```

#### Error Metrics
```yaml
Error Rate:
  - Target: < 0.5%
  - Warning: > 1%
  - Critical: > 5%

Function Timeout Rate:
  - Target: < 0.1%
  - Warning: > 1%
  - Critical: > 5%

4xx Error Rate:
  - Target: < 2%
  - Warning: > 5%
  - Critical: > 10%

5xx Error Rate:
  - Target: < 0.1%
  - Warning: > 0.5%
  - Critical: > 1%
```

### Database Metrics

```yaml
Database CPU:
  - Normal: < 60%
  - Warning: > 80%
  - Critical: > 95%

Active Connections:
  - Normal: < 50
  - Warning: > 80
  - Critical: > 95 (max 100 on Supabase Pro)

Query Duration:
  - Fast: < 100ms
  - Acceptable: < 500ms
  - Slow: > 1s
  - Critical: > 5s

Storage Usage:
  - Normal: < 70%
  - Warning: > 85%
  - Critical: > 95%
```

### ML Service Metrics

```yaml
Response Time:
  - Target: < 1s
  - Warning: > 3s
  - Critical: > 10s

CPU Usage:
  - Normal: < 70%
  - Warning: > 85%
  - Critical: > 95%

Memory Usage:
  - Normal: < 80%
  - Warning: > 90%
  - Critical: > 95%

Availability:
  - Target: > 99.5%
  - Warning: < 99%
  - Critical: < 95%
```

---

## Logging Strategy

### Log Levels

```typescript
// Structured logging format
{
  timestamp: string;      // ISO 8601 timestamp
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: {
    requestId?: string;
    userId?: string;
    path?: string;
    method?: string;
    duration?: number;
    [key: string]: any;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### Log Categories

**Application Logs**
```typescript
// API route logging
logger.info('API request', {
  path: req.url,
  method: req.method,
  userId: session?.user?.id,
  duration: endTime - startTime,
});

// Error logging
logger.error('Database query failed', {
  error: err.message,
  stack: err.stack,
  query: 'SELECT ...',
  userId: session?.user?.id,
});

// Performance logging
logger.warn('Slow query detected', {
  query: 'SELECT ...',
  duration: 5000,
  threshold: 1000,
});
```

**Security Logs**
```typescript
// Authentication events
logger.info('User login', {
  userId: user.id,
  provider: 'google',
  ip: req.ip,
});

// Rate limit violations
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  endpoint: req.url,
  limit: 10,
  window: '1m',
});

// Failed authentication
logger.warn('Authentication failed', {
  email: attempt.email,
  reason: 'invalid_credentials',
  ip: req.ip,
});
```

**Business Metrics**
```typescript
// User actions
logger.info('Destination visited', {
  userId: user.id,
  destinationId: destination.id,
  action: 'mark_visited',
});

// AI interactions
logger.info('AI chat interaction', {
  userId: user.id,
  model: 'gpt-4o-mini',
  tokens: completion.usage.total_tokens,
  duration: endTime - startTime,
});
```

### Log Retention

- **Vercel Logs**: 7 days (Pro plan)
- **Application Logs**: Consider external logging service for longer retention
- **Audit Logs**: Store critical events in database for compliance

---

## Alerting Strategy

### Alert Channels

1. **Critical Alerts**
   - Email: engineering@urbanmanual.com
   - Slack: #engineering-alerts
   - PagerDuty: On-call engineer

2. **Warning Alerts**
   - Slack: #engineering
   - Email digest (daily)

3. **Info Alerts**
   - Slack: #deployments
   - Dashboard notifications

### Alert Rules

#### Critical Alerts (Immediate Action Required)

```yaml
High Error Rate:
  condition: error_rate > 5% for 5 minutes
  severity: critical
  channels: [email, slack, pagerduty]
  action: Investigate immediately, consider rollback

Service Down:
  condition: health_check fails for 3 consecutive attempts
  severity: critical
  channels: [email, slack, pagerduty]
  action: Page on-call engineer

Database CPU Critical:
  condition: db_cpu > 95% for 10 minutes
  severity: critical
  channels: [email, slack]
  action: Investigate queries, scale if needed

Multiple Function Timeouts:
  condition: timeout_rate > 10% for 5 minutes
  severity: critical
  channels: [email, slack]
  action: Check function logs, optimize or scale
```

#### Warning Alerts (Attention Needed)

```yaml
Elevated Error Rate:
  condition: error_rate > 2% for 15 minutes
  severity: warning
  channels: [slack]
  action: Monitor and investigate

Database CPU High:
  condition: db_cpu > 80% for 20 minutes
  severity: warning
  channels: [slack]
  action: Review query performance

Slow Response Times:
  condition: p95_response_time > 3s for 10 minutes
  severity: warning
  channels: [slack]
  action: Investigate performance bottlenecks

Build Time Increase:
  condition: build_time > 5 minutes
  severity: warning
  channels: [slack]
  action: Optimize build process
```

#### Info Alerts (FYI)

```yaml
Deployment Success:
  condition: deployment completes
  severity: info
  channels: [slack #deployments]

Dependency Updates:
  condition: Dependabot PR created
  severity: info
  channels: [slack #engineering]

Weekly Report:
  condition: every Monday 9 AM
  severity: info
  channels: [email]
  content: Weekly metrics summary
```

---

## Monitoring Dashboard Setup

### Vercel Dashboard Widgets

**Recommended Layout:**

1. **Overview** (Top Row)
   - Deployment status
   - Error rate (24h)
   - Response time (24h)
   - Traffic (24h)

2. **Performance** (Second Row)
   - Core Web Vitals
   - Function execution time
   - Cache hit rate
   - Bandwidth usage

3. **Errors** (Third Row)
   - Error count by route
   - 4xx errors
   - 5xx errors
   - Function timeouts

4. **Traffic** (Bottom Row)
   - Requests by country
   - Top pages
   - Device breakdown
   - Browser breakdown

### Supabase Dashboard

**Key Views to Monitor:**

1. **Database Performance**
   - CPU usage (chart)
   - Memory usage (chart)
   - Active connections (chart)
   - Disk I/O (chart)

2. **Query Performance**
   - Slow queries (> 1s)
   - Most executed queries
   - Query duration distribution
   - Lock wait events

3. **Storage**
   - Database size
   - Table sizes
   - Growth rate
   - Backup status

4. **API**
   - Request count
   - Response time
   - Error rate
   - Rate limit usage

---

## Custom Monitoring Scripts

### Health Check Script

```bash
#!/bin/bash
# health-check.sh - Monitor application health

URL="https://urbanmanual.com/api/health"
ML_URL="https://ml-service.railway.app/health"

# Check main application
response=$(curl -s -o /dev/null -w "%{http_code}" $URL)
if [ $response -eq 200 ]; then
  echo "✓ Main application is healthy"
else
  echo "✗ Main application is unhealthy (HTTP $response)"
  # Send alert
fi

# Check ML service
ml_response=$(curl -s -o /dev/null -w "%{http_code}" $ML_URL)
if [ $ml_response -eq 200 ]; then
  echo "✓ ML service is healthy"
else
  echo "✗ ML service is unhealthy (HTTP $ml_response)"
  # Send alert
fi
```

### Performance Test Script

```bash
#!/bin/bash
# performance-test.sh - Test application performance

echo "Running performance tests..."

# Test homepage
time curl -s -o /dev/null -w "Homepage: %{time_total}s\n" https://urbanmanual.com/

# Test API health
time curl -s -o /dev/null -w "Health API: %{time_total}s\n" https://urbanmanual.com/api/health

# Test search API (example)
time curl -s -o /dev/null -w "Search API: %{time_total}s\n" \
  "https://urbanmanual.com/api/search?q=restaurant"
```

---

## Incident Response

### Monitoring During Incidents

1. **Detection**
   - Alert triggered
   - User report
   - Monitoring dashboard anomaly

2. **Initial Assessment** (2 min)
   - Check Vercel dashboard
   - Check Supabase dashboard
   - Check health endpoints
   - Review recent deployments

3. **Triage** (5 min)
   - Identify affected components
   - Assess severity and impact
   - Determine if rollback needed
   - Notify team

4. **Resolution**
   - Apply fix or rollback
   - Monitor recovery metrics
   - Verify resolution

5. **Post-Incident**
   - Document timeline
   - Root cause analysis
   - Update runbooks
   - Implement prevention measures

### Incident Monitoring Checklist

During an incident, monitor:
- [ ] Error rate (should decrease)
- [ ] Response time (should normalize)
- [ ] Traffic (check for anomalies)
- [ ] Database metrics (CPU, connections)
- [ ] Function logs (for errors)
- [ ] User reports (social media, support)

---

## Monitoring Best Practices

### Do's

✅ Monitor business metrics, not just technical metrics
✅ Set up alerts for anomalies, not just thresholds
✅ Include context in logs (user ID, request ID, etc.)
✅ Use structured logging for easier analysis
✅ Monitor user experience (Core Web Vitals)
✅ Keep dashboards simple and actionable
✅ Review and update alert thresholds regularly
✅ Document monitoring decisions and rationale

### Don'ts

❌ Don't alert on everything (alert fatigue)
❌ Don't log sensitive data (passwords, tokens, PII)
❌ Don't ignore warnings (they become critical)
❌ Don't rely on a single monitoring tool
❌ Don't forget to monitor the ML service
❌ Don't skip post-incident reviews
❌ Don't set alerts without clear actions
❌ Don't forget to test alert notifications

---

## Monitoring Checklist

### Daily
- [ ] Review error rate in Vercel dashboard
- [ ] Check for any critical alerts
- [ ] Monitor database performance
- [ ] Review deployment logs (if deployed)

### Weekly
- [ ] Review Core Web Vitals trends
- [ ] Check for slow queries
- [ ] Review dependency security alerts
- [ ] Analyze traffic patterns
- [ ] Check ML service performance

### Monthly
- [ ] Review and update alert thresholds
- [ ] Analyze incident trends
- [ ] Review monitoring coverage
- [ ] Update documentation
- [ ] Cost optimization review

### Quarterly
- [ ] Monitoring strategy review
- [ ] Tool evaluation
- [ ] Incident retrospectives
- [ ] Training updates

---

## Tools & Resources

### Monitoring Tools

**Current:**
- Vercel Analytics (built-in)
- Vercel Logs (built-in)
- Supabase Dashboard (built-in)
- GitHub Actions (CI/CD monitoring)

**Optional/Future:**
- Sentry (error tracking)
- DataDog (full-stack monitoring)
- LogRocket (session replay)
- Uptime Robot (uptime monitoring)
- StatusPage (status page)

### Useful Queries

**Vercel CLI:**
```bash
# Stream logs
vercel logs --follow

# Get logs for specific deployment
vercel logs <deployment-url>

# Filter by function
vercel logs --filter "api/search"
```

**Supabase SQL:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Related Documentation

- [Infrastructure Documentation](./INFRASTRUCTURE.md)
- [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md)
- [Security Documentation](./SECURITY.md)
- [Vercel Monitoring](./vercel/monitoring.md)
