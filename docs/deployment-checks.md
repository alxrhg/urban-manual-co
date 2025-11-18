# Vercel Deployment Checks

This document describes how to configure and use deployment checks in Vercel to verify deployments are healthy.

## Overview

Deployment checks are automated verifications that run after a Vercel deployment completes. They help catch issues before users see them.

## Available Endpoints

### 1. `/api/health` - Basic Health Check
- **Purpose**: Quick health check for environment variables and basic connectivity
- **Use Case**: Monitoring, uptime checks
- **Response**: 200 if healthy, 503 if unhealthy

### 2. `/api/deployment-check` - Comprehensive Deployment Check
- **Purpose**: Full deployment verification with actual connection tests
- **Use Case**: Vercel deployment checks, post-deployment verification
- **Response**: 200 if all checks pass, 503 if any fail
- **Checks Performed**:
  - Environment variables validation
  - Supabase database connection test
  - Health endpoint accessibility

## Setting Up Vercel Deployment Checks

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Checks**
3. Click **Add Check**
4. Configure:
   - **Name**: "Deployment Health Check"
   - **Path**: `/api/deployment-check`
   - **Method**: `GET`
   - **Expected Status**: `200`
   - **Timeout**: `30 seconds`
   - **Blocking**: `Yes` (prevents deployment if check fails)

### Option 2: Via Vercel API

Create a check programmatically using the Vercel API:

```bash
curl -X POST "https://api.vercel.com/v1/deployments/{deploymentId}/checks" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deployment Health Check",
    "path": "/api/deployment-check",
    "status": "registered"
  }'
```

### Option 3: Via GitHub Actions (Recommended)

GitHub Actions workflows are set up to automatically check deployments:

#### Workflows Included

1. **`.github/workflows/deployment-check.yml`**
   - Runs on pushes to `master`/`main`
   - Builds and tests the project
   - Waits for Vercel deployment
   - Runs health check and comprehensive deployment check
   - Comments on PRs if checks fail

2. **`.github/workflows/vercel-deployment-check.yml`**
   - Triggers on Vercel deployment status events
   - Verifies deployment health automatically
   - Updates deployment status in GitHub

3. **`.github/workflows/ci.yml`**
   - Runs on every push and PR
   - Lints, type checks, and builds the project
   - Ensures code quality before merge

#### Setup

1. **Add GitHub Secrets** (Repository Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN` (optional): For fetching deployment URLs from Vercel API
   - `VERCEL_PROJECT_ID` (optional): Your Vercel project ID
   - `VERCEL_URL` (optional): Your Vercel deployment URL (e.g., `urban-manual.vercel.app`)

2. **Configure Vercel Webhook** (optional):
   - Go to Vercel Dashboard → Project Settings → Git → Deploy Hooks
   - Add webhook: `https://api.github.com/repos/YOUR_USERNAME/urban-manual/dispatches`
   - This enables automatic checks when Vercel deploys

#### Manual Run

You can manually trigger deployment checks:
```bash
gh workflow run "Deployment Check"
```

## Check Response Format

### Success Response (200)
```json
{
  "status": "passed",
  "timestamp": "2025-11-18T14:33:41.000Z",
  "duration": 234,
  "results": {
    "environment": {
      "status": "pass",
      "message": "All required environment variables are set"
    },
    "supabase": {
      "status": "pass",
      "message": "Successfully connected to Supabase",
      "duration": 156
    },
    "health_endpoint": {
      "status": "pass",
      "message": "Health endpoint responded",
      "duration": 45
    }
  },
  "message": "All deployment checks passed"
}
```

### Failure Response (503)
```json
{
  "status": "failed",
  "timestamp": "2025-11-18T14:33:41.000Z",
  "duration": 123,
  "results": {
    "environment": {
      "status": "pass",
      "message": "All required environment variables are set"
    },
    "supabase": {
      "status": "fail",
      "message": "Connection failed: timeout",
      "duration": 5000
    }
  },
  "message": "Some deployment checks failed"
}
```

## Monitoring

### Vercel Dashboard
- View check results in the **Deployments** tab
- Failed checks will show in red with error details
- Check logs are available in the deployment details

### Alerts
Configure webhooks in Vercel to get notified of failed checks:
1. Go to **Settings** → **Webhooks**
2. Add webhook URL (e.g., Slack, Discord, PagerDuty)
3. Select event: **Deployment Check Failed**

## Troubleshooting

### Check Times Out
- Increase timeout in check configuration
- Check if Supabase is paused (free tier)
- Verify network connectivity

### Check Fails but App Works
- Check may be too strict
- Review error message in check response
- Consider making check non-blocking for preview deployments

### Environment Variables Missing
- Ensure all required env vars are set in Vercel dashboard
- Check that `NEXT_PUBLIC_` prefix is used for client-side vars
- Redeploy after adding new environment variables

## Best Practices

1. **Use blocking checks for production**: Prevent bad deployments from going live
2. **Use non-blocking checks for previews**: Allow preview deployments even if checks fail (for debugging)
3. **Set appropriate timeouts**: 30 seconds is usually sufficient
4. **Monitor check duration**: If checks take too long, optimize the endpoints
5. **Add custom checks**: Extend `/api/deployment-check` to test specific features

## Extending Checks

To add custom checks, edit `/app/api/deployment-check/route.ts`:

```typescript
// Add new check
try {
  const customCheckStart = Date.now();
  // Your custom check logic here
  const customCheckDuration = Date.now() - customCheckStart;
  
  results.custom_check = {
    status: 'pass', // or 'fail'
    message: 'Custom check passed',
    duration: customCheckDuration,
  };
} catch (error: any) {
  results.custom_check = {
    status: 'fail',
    message: `Custom check failed: ${error.message}`,
  };
}
```

