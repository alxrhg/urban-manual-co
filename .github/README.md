# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD and deployment verification.

## Workflows

### 1. CI (`ci.yml`)
Runs on every push and pull request to ensure code quality:
- Lints code
- Type checks
- Builds the project

**Trigger**: Automatic on push/PR

### 2. Deployment Check (`deployment-check.yml`)
Runs after pushes to `master`/`main` to verify deployments:
- Builds and tests the project
- Waits for Vercel deployment
- Runs health check (`/api/health`)
- Runs comprehensive deployment check (`/api/deployment-check`)
- Comments on PRs if checks fail

**Trigger**: Automatic on push to `master`/`main`

### 3. Vercel Deployment Check (`vercel-deployment-check.yml`)
Runs when Vercel completes a deployment:
- Verifies deployment health
- Updates GitHub deployment status
- Can be triggered manually

**Trigger**: Vercel deployment status events or manual

## Setup

### Required Secrets

Add these in **Repository Settings → Secrets and variables → Actions**:

- `NEXT_PUBLIC_SUPABASE_URL` (optional): For build-time checks
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional): For build-time checks
- `NEXT_PUBLIC_GOOGLE_API_KEY` (optional): For build-time checks

### Optional Secrets

For enhanced functionality:

- `VERCEL_TOKEN`: Vercel API token to fetch deployment URLs
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `VERCEL_URL`: Your Vercel deployment URL (e.g., `urban-manual.vercel.app`)

### Getting Vercel Token

1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Add it as `VERCEL_TOKEN` secret in GitHub

### Getting Vercel Project ID

1. Go to your Vercel project dashboard
2. Project ID is in the URL: `https://vercel.com/YOUR_TEAM/YOUR_PROJECT/settings`
3. Or use: `vercel project ls` (if you have Vercel CLI)

## Usage

### View Workflow Runs

Go to **Actions** tab in GitHub repository to see all workflow runs.

### Manual Trigger

Trigger workflows manually:
```bash
# Using GitHub CLI
gh workflow run "Deployment Check"
gh workflow run "CI"
gh workflow run "Vercel Deployment Check"
```

Or via GitHub UI: **Actions** → Select workflow → **Run workflow**

### Check Results

- ✅ Green checkmark = All checks passed
- ❌ Red X = One or more checks failed
- Click on a run to see detailed logs

## Troubleshooting

### Build Fails

- Check that required environment variables are set
- Review build logs for specific errors
- Ensure `package.json` has correct build script

### Deployment Check Fails

- Verify Vercel deployment completed successfully
- Check that `/api/health` endpoint is accessible
- Review deployment check logs for specific failures
- Ensure Supabase is not paused (free tier)

### Workflow Not Triggering

- Check workflow file syntax (YAML)
- Verify branch names match (`master` vs `main`)
- Check GitHub Actions is enabled for the repository

## Customization

### Add More Checks

Edit the workflow files to add:
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Security scans: Add security scanning step
- Performance tests: Add Lighthouse CI

### Change Triggers

Modify the `on:` section in workflow files:
```yaml
on:
  push:
    branches: [master, develop]  # Add more branches
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
```

## Best Practices

1. **Keep workflows fast**: Use caching for dependencies
2. **Fail fast**: Run quick checks first (lint, type check)
3. **Parallel jobs**: Run independent checks in parallel
4. **Clear error messages**: Use descriptive step names
5. **Notifications**: Set up alerts for failed workflows

