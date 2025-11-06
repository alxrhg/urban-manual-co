# n8n Setup for The Urban Manual

This directory contains the n8n workflow automation setup for The Urban Manual, including Docker configuration and pre-built workflows.

## 📋 Table of Contents

- [What is n8n?](#what-is-n8n)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Pre-built Workflows](#pre-built-workflows)
- [Creating Custom Workflows](#creating-custom-workflows)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🤔 What is n8n?

n8n is an open-source workflow automation tool that connects The Urban Manual with external services. It enables:

- **Automated Data Enrichment**: Keep 897 destinations fresh with Google Places data
- **User Onboarding**: Welcome emails and engagement campaigns
- **ML Training Automation**: Retrain recommendation models automatically
- **Admin Alerts**: Real-time notifications for errors and data quality issues
- **Smart Trip Planning**: Generate itineraries using AI

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- The Urban Manual project running locally
- Access to your Supabase database

### Step 1: Create the Docker Network

n8n shares a network with the ML service for seamless communication:

```bash
# Create the network (if it doesn't exist)
docker network create urban-manual-network
```

### Step 2: Configure Environment Variables

```bash
# Navigate to n8n directory
cd n8n

# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

**Required Variables:**
- `N8N_BASIC_AUTH_USER` - Your n8n admin username
- `N8N_BASIC_AUTH_PASSWORD` - Strong password for n8n access
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `POSTGRES_URL` - PostgreSQL connection string (with pooler)
- `OPENAI_API_KEY` - OpenAI API key for AI workflows
- `GOOGLE_AI_API_KEY` - Google AI API key
- `NEXT_PUBLIC_GOOGLE_API_KEY` - Google Maps/Places API key

### Step 3: Start n8n

```bash
# From the n8n directory
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 4: Access n8n

Open your browser and navigate to:
```
http://localhost:5678
```

Login with the credentials you set in `.env`:
- Username: Value of `N8N_BASIC_AUTH_USER`
- Password: Value of `N8N_BASIC_AUTH_PASSWORD`

### Step 5: Import Workflows

1. In n8n, click **"Workflows"** in the left sidebar
2. Click **"Import from File"**
3. Import these workflows:
   - `workflows/01-destination-enrichment.json`
   - `workflows/02-user-onboarding.json`

### Step 6: Configure Credentials

Before running workflows, set up these credentials in n8n:

#### Supabase PostgreSQL

1. Go to **Settings** → **Credentials** → **New**
2. Search for "Postgres"
3. Fill in:
   - **Name**: `Supabase PostgreSQL`
   - **Host**: Extract from your `POSTGRES_URL` (e.g., `aws-0-us-east-1.pooler.supabase.com`)
   - **Port**: `6543` (pooler) or `5432` (direct)
   - **Database**: `postgres`
   - **User**: Extract from `POSTGRES_URL`
   - **Password**: Extract from `POSTGRES_URL`
   - **SSL**: `allow`

#### Supabase API (Optional, for easier queries)

1. **Settings** → **Credentials** → **New**
2. Search for "Supabase"
3. Fill in:
   - **Name**: `Supabase API`
   - **Host**: Your `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Secret**: Your Supabase service role key (from Supabase Dashboard)

#### Google Maps/Places API

The API key is already passed via environment variables (`GOOGLE_API_KEY`), so HTTP requests will use it directly.

#### Gmail (for email workflows)

1. **Settings** → **Credentials** → **New**
2. Search for "Gmail OAuth2"
3. Follow the OAuth flow to connect your Gmail account

**Alternative**: Use SendGrid or Resend for production emails (more reliable).

---

## ⚙️ Configuration

### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_HOST` | Hostname for n8n (default: localhost) | No |
| `N8N_PROTOCOL` | http or https | No |
| `N8N_BASIC_AUTH_USER` | Admin username | Yes |
| `N8N_BASIC_AUTH_PASSWORD` | Admin password | Yes |
| `WEBHOOK_URL` | Base URL for webhooks | Yes |
| `TIMEZONE` | Your timezone (e.g., America/New_York) | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `POSTGRES_URL` | PostgreSQL connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `GOOGLE_AI_API_KEY` | Google AI API key | Yes |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Maps/Places key | Yes |
| `ML_SERVICE_URL` | ML service endpoint | No |

### Docker Compose Options

#### Option 1: SQLite (Default - Simple Setup)

The default configuration uses SQLite for n8n's internal database. This is perfect for:
- Development
- Small-scale deployments
- Single-server setups

#### Option 2: PostgreSQL (Production Recommended)

For production, switch to PostgreSQL:

1. Uncomment PostgreSQL config in `.env`:
```env
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your_postgres_host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=your_secure_password
```

2. Update `docker-compose.yml` to remove SQLite settings

#### Option 3: Queue Mode (High-Load Production)

For high-traffic production with many concurrent workflows:

1. Add Redis to `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
```

2. Enable queue mode in `.env`:
```env
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379
```

---

## 📊 Pre-built Workflows

### 1. Destination Enrichment Pipeline

**File**: `workflows/01-destination-enrichment.json`

**What it does**:
- Runs daily at 2 AM
- Finds destinations not enriched in 30+ days
- Fetches fresh data from Google Places API
- Updates Supabase with: ratings, hours, photos, reviews
- Sends summary notification

**How to use**:
1. Import the workflow
2. Activate it (toggle in top-right)
3. Click "Execute Workflow" to test immediately
4. Monitor in "Executions" tab

**Customization**:
- Change schedule: Edit "Daily at 2 AM" node → Cron expression
- Adjust staleness threshold: Edit SQL query `INTERVAL '30 days'`
- Limit destinations per run: Change `LIMIT 50` in SQL
- Add Slack notifications: Replace "Log Summary" node with Slack node

**Expected Results**:
- 50 destinations enriched per run
- ~5-10 minutes execution time
- Data freshness improved

---

### 2. User Onboarding Automation

**File**: `workflows/02-user-onboarding.json`

**What it does**:
- Triggers on new user signup (via webhook)
- Creates user profile in database
- Sends welcome email immediately
- Waits 2 hours, checks if profile completed
- If incomplete: sends profile completion nudge
- Waits 3 days, checks for activity
- If no activity: sends engagement email with popular destinations

**How to use**:
1. Import the workflow
2. Configure email credentials (Gmail/SendGrid)
3. Note the webhook URL (shown in "Webhook" node)
4. Configure Supabase Database Webhook:

**Supabase Setup**:
```sql
-- In Supabase SQL Editor, create a webhook
CREATE OR REPLACE FUNCTION notify_n8n_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'http://your-n8n-host:5678/webhook/user-signup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'type', 'INSERT',
      'table', 'users',
      'record', row_to_json(NEW)
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_new_user();
```

**Customization**:
- Adjust wait times: Edit "Wait" nodes
- Customize email templates: Edit Gmail nodes' HTML
- Add more engagement steps: Insert nodes between steps
- Track conversion: Add analytics nodes

---

## 🛠️ Creating Custom Workflows

### Example: Trending Destinations Email

Let's create a workflow that sends weekly trending destinations to engaged users.

**Steps**:

1. **Add Schedule Trigger**
   - Node: "Schedule Trigger"
   - Cron: `0 9 * * 1` (Every Monday at 9 AM)

2. **Query ML Service**
   - Node: "HTTP Request"
   - Method: `GET`
   - URL: `{{ $env.ML_SERVICE_URL }}/api/forecast/trending`

3. **Get Engaged Users**
   - Node: "Postgres"
   - Query:
   ```sql
   SELECT DISTINCT u.id, u.email
   FROM auth.users u
   JOIN visited_places vp ON vp.user_id = u.id
   WHERE vp.visited_at > NOW() - INTERVAL '30 days'
   GROUP BY u.id
   HAVING COUNT(*) >= 3;
   ```

4. **Loop Users**
   - Node: "Split In Batches"

5. **Send Personalized Email**
   - Node: "Gmail" / "SendGrid"
   - Include trending destinations from step 2

6. **Log Success**
   - Node: "Postgres" → Insert into analytics table

### Workflow Development Tips

**Testing**:
- Use "Execute Node" to test individual nodes
- Check "Input/Output" tabs to debug data flow
- Enable "Always Output Data" in node settings for debugging

**Error Handling**:
- Add "Error Trigger" node to catch failures
- Use "If" nodes for conditional logic
- Set retry policies in node settings (3 retries with exponential backoff)

**Performance**:
- Use "Split In Batches" for large datasets (avoid memory issues)
- Add "Wait" nodes between API calls to respect rate limits
- Enable "Pagination" in HTTP Request nodes when available

---

## 🚀 Production Deployment

### Option 1: Docker on VPS (DigitalOcean, AWS EC2, etc.)

**Requirements**:
- 2GB RAM minimum
- 20GB storage
- Docker installed

**Steps**:
1. Clone repository to server
2. Configure `.env` with production values
3. Update `N8N_HOST` and `WEBHOOK_URL` to your domain
4. Set up SSL/TLS (use Nginx reverse proxy + Let's Encrypt)
5. Run: `docker-compose up -d`

**Nginx Config Example**:
```nginx
server {
    listen 80;
    server_name n8n.yoursite.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Option 2: n8n Cloud

Easiest option: Use n8n's official cloud hosting.

**Pros**:
- Managed hosting (no DevOps needed)
- Automatic updates
- Built-in scaling

**Cons**:
- Monthly cost (~$20-50/month)
- Less control

**Setup**:
1. Sign up at https://n8n.io/cloud
2. Export workflows from local: Settings → Export Workflow
3. Import to n8n Cloud
4. Configure credentials in cloud instance

### Option 3: Railway / Fly.io

Quick deployment with free tier available.

**Railway**:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd n8n
railway up
```

### Production Checklist

- [ ] Switch to PostgreSQL database
- [ ] Enable queue mode with Redis (if high load)
- [ ] Set up SSL/TLS certificate
- [ ] Configure proper `WEBHOOK_URL` with HTTPS
- [ ] Use service accounts instead of personal OAuth (Gmail → SendGrid/Resend)
- [ ] Set up monitoring (use n8n's built-in metrics + Sentry)
- [ ] Configure backup strategy for n8n data volume
- [ ] Set resource limits in `docker-compose.yml`:
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
  ```
- [ ] Enable workflow versioning (export regularly)
- [ ] Set up log aggregation (ELK stack or cloud logging)
- [ ] Configure rate limiting for webhooks
- [ ] Test disaster recovery plan

---

## 🔍 Troubleshooting

### Common Issues

#### 1. n8n won't start

**Error**: `Cannot connect to Docker daemon`
```bash
# Solution: Start Docker
sudo systemctl start docker

# Check status
docker ps
```

**Error**: `Port 5678 already in use`
```bash
# Solution: Change port in docker-compose.yml
ports:
  - "5679:5678"  # Use 5679 instead
```

#### 2. Can't connect to Supabase

**Error**: `connection refused` or `timeout`

**Solutions**:
- Check Supabase URL is correct (no trailing slash)
- Verify PostgreSQL credentials
- Ensure using port `6543` (pooler) not `5432` (direct)
- Check Supabase firewall/IP whitelist
- Test connection:
  ```bash
  docker exec -it urban-manual-n8n sh
  nc -zv your-supabase-host 6543
  ```

#### 3. Workflows fail with "API key invalid"

**Solution**:
- Verify API keys in `.env` have no extra spaces
- Restart n8n after changing `.env`:
  ```bash
  docker-compose restart
  ```
- Check API key is active in provider dashboard

#### 4. Google Places API returns 403

**Solutions**:
- Enable "Places API" in Google Cloud Console
- Check API key restrictions (allow your n8n IP)
- Verify billing is enabled (Google requires it even for free tier)

#### 5. ML Service unreachable

**Error**: `connect ECONNREFUSED` when calling ML service

**Solutions**:
- Ensure ML service is running:
  ```bash
  docker ps | grep ml
  ```
- Verify `ML_SERVICE_URL` uses `host.docker.internal`:
  ```env
  ML_SERVICE_URL=http://host.docker.internal:8000
  ```
- Check both containers are on same network:
  ```bash
  docker network inspect urban-manual-network
  ```

#### 6. Emails not sending

**Gmail OAuth Issues**:
- Enable "Less secure app access" (not recommended for production)
- Use App Passwords instead
- Switch to SendGrid/Resend for production

**SendGrid Setup**:
1. Sign up at sendgrid.com (free tier: 100 emails/day)
2. Create API key
3. Add to `.env`: `SENDGRID_API_KEY=...`
4. In workflow: Use "HTTP Request" node:
   ```
   POST https://api.sendgrid.com/v3/mail/send
   Headers: Authorization: Bearer {{ $env.SENDGRID_API_KEY }}
   Body: { ... }
   ```

### Debugging Workflows

**Enable Debug Mode**:
```env
# In .env
N8N_LOG_LEVEL=debug
```

**View Logs**:
```bash
# Real-time logs
docker-compose logs -f n8n

# Last 100 lines
docker-compose logs --tail=100 n8n

# Search logs
docker-compose logs n8n | grep ERROR
```

**Test Individual Nodes**:
1. Open workflow
2. Click node
3. Click "Execute Node" (not "Execute Workflow")
4. Check Input/Output tabs

**Common Workflow Errors**:

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'json' of undefined` | Previous node returned no data | Add "If" node to check for data |
| `Query syntax error` | SQL syntax issue | Test query in Supabase SQL editor first |
| `Rate limit exceeded` | Too many API calls | Add "Wait" nodes between calls |
| `Timeout` | Operation took > 300s | Increase `EXECUTIONS_TIMEOUT` |

### Performance Issues

**Workflow runs slow**:
- Split large operations into smaller batches
- Use pagination for API requests
- Enable caching for repeated queries
- Check database indexes (slow queries)

**High memory usage**:
- Reduce batch sizes in "Split In Batches"
- Clear old execution data: Settings → Executions → Delete old
- Enable auto-deletion:
  ```env
  EXECUTIONS_DATA_MAX_AGE=168  # Keep only 7 days
  ```

**n8n container restarts**:
- Check memory limits
- Review resource usage:
  ```bash
  docker stats urban-manual-n8n
  ```
- Increase resources if needed

---

## 📚 Additional Resources

- **n8n Documentation**: https://docs.n8n.io
- **Community Forum**: https://community.n8n.io
- **Workflow Templates**: https://n8n.io/workflows
- **YouTube Tutorials**: Search "n8n workflow automation"

### Useful n8n Nodes for Urban Manual

| Node | Use Case |
|------|----------|
| **Postgres** | Query Supabase database |
| **HTTP Request** | Call ML service, Google APIs |
| **OpenAI** | Generate content, analyze sentiment |
| **Schedule Trigger** | Run workflows on schedule |
| **Webhook** | Receive real-time events |
| **Gmail / SendGrid** | Send emails |
| **Slack** | Admin notifications |
| **Code (JS)** | Custom logic, data transformation |
| **If** | Conditional branching |
| **Split In Batches** | Process large datasets |
| **Wait** | Delays between steps |
| **Error Trigger** | Handle failures |

---

## 🤝 Contributing

Found a useful workflow? Share it!

1. Export workflow: Workflow → Download
2. Save to `workflows/` directory
3. Add documentation to this README
4. Create pull request

---

## 📞 Support

Having issues?

1. Check [Troubleshooting](#troubleshooting) section
2. Review n8n logs: `docker-compose logs n8n`
3. Search n8n community forum
4. Open an issue in the repository

---

**Next Steps**:
1. ✅ Complete [Quick Start](#quick-start)
2. ✅ Import and test pre-built workflows
3. ✅ Customize workflows for your needs
4. 🚀 Deploy to production

Happy automating! 🎉
