# n8n Quick Reference Guide

## 🚀 Quick Commands

```bash
# Start n8n
cd n8n
docker-compose up -d

# Stop n8n
docker-compose down

# Restart n8n (after .env changes)
docker-compose restart

# View logs
docker-compose logs -f n8n

# Check status
docker ps | grep n8n

# Access shell inside container
docker exec -it urban-manual-n8n sh

# Rebuild container (after Dockerfile changes)
docker-compose up -d --build
```

## 📍 Important URLs

- **n8n Interface**: http://localhost:5678
- **Webhook Base URL**: http://localhost:5678/webhook/
- **Health Check**: http://localhost:5678/healthz

## 🔐 Default Credentials

Set in `.env` file:
- **Username**: `N8N_BASIC_AUTH_USER`
- **Password**: `N8N_BASIC_AUTH_PASSWORD`

## 📊 Pre-built Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **Destination Enrichment** | `01-destination-enrichment.json` | Daily 2 AM | Update destination data from Google Places |
| **User Onboarding** | `02-user-onboarding.json` | Webhook | Automated user welcome & engagement |
| **ML Training** | `03-ml-training-automation.json` | Weekly Sunday 3 AM | Retrain recommendation models |

## 🔧 Common Tasks

### Import a Workflow

1. Open n8n: http://localhost:5678
2. Click "Workflows" → "Import from File"
3. Select JSON file from `workflows/` directory
4. Click "Import"

### Export a Workflow

1. Open workflow in n8n
2. Click "..." menu → "Download"
3. Save JSON file to `workflows/` directory

### Test a Workflow

1. Open workflow
2. Click "Execute Workflow" button
3. Check "Executions" tab for results
4. Review "Input/Output" data in each node

### Test a Single Node

1. Click the node
2. Click "Execute Node" (not "Execute Workflow")
3. Review output in right panel

### Add Credentials

1. Go to Settings → Credentials → New
2. Search for credential type (e.g., "Postgres", "OpenAI")
3. Fill in details
4. Save

**Required Credentials**:
- `Supabase PostgreSQL` - Database access
- `Gmail OAuth2` or `SendGrid` - Email sending
- (Optional) `Slack` - Admin notifications

## 🐛 Debugging

### Enable Debug Logs

```bash
# Add to .env
N8N_LOG_LEVEL=debug

# Restart
docker-compose restart
```

### View Execution History

1. In n8n, click "Executions" in left sidebar
2. Click any execution to see details
3. Review each node's input/output

### Common Errors

| Error | Solution |
|-------|----------|
| `Cannot connect to database` | Check Supabase credentials in .env |
| `API key invalid` | Verify OPENAI_API_KEY / GOOGLE_AI_API_KEY |
| `Module not found` | Restart n8n: `docker-compose restart` |
| `Timeout` | Increase `EXECUTIONS_TIMEOUT` in .env |
| `Rate limit exceeded` | Add Wait nodes between API calls |

## 💡 Tips & Tricks

### Use Environment Variables

Access env vars in workflows:
```javascript
// In Code nodes or expressions
{{ $env.OPENAI_API_KEY }}
{{ $env.ML_SERVICE_URL }}
```

### Handle Errors Gracefully

1. Add "Error Trigger" node to workflow
2. Connect it to error handling logic (e.g., send Slack alert)

### Process Large Datasets

Use "Split In Batches" node:
- **Batch Size**: 10-50 items
- Prevents memory issues
- Respects rate limits

### Format Data with Code

```javascript
// In Code node
const items = $input.all();

return items.map(item => {
  return {
    json: {
      // Transform data here
      id: item.json.id,
      name: item.json.name.toUpperCase()
    }
  };
});
```

### Conditional Logic

Use "If" node:
- **Condition**: `{{ $json.count }} > 10`
- **True**: Continue workflow
- **False**: Skip or use alternative path

### Loop Through Items

```javascript
// In Code node - process multiple items
const results = [];

for (const item of $input.all()) {
  results.push({
    json: {
      processed: item.json.value * 2
    }
  });
}

return results;
```

## 📚 Useful Expressions

### Date/Time

```javascript
// Current timestamp
{{ $now }}

// Format date
{{ $now.toFormat('yyyy-MM-dd') }}

// 7 days ago
{{ $now.minus({ days: 7 }).toISO() }}
```

### String Manipulation

```javascript
// Uppercase
{{ $json.name.toUpperCase() }}

// Replace
{{ $json.text.replace('old', 'new') }}

// Check if contains
{{ $json.description.includes('keyword') }}
```

### Numbers

```javascript
// Round
{{ Math.round($json.price) }}

// Format currency
{{ $json.amount.toFixed(2) }}

// Random number
{{ Math.floor(Math.random() * 100) }}
```

### Arrays

```javascript
// Length
{{ $json.items.length }}

// Filter
{{ $json.items.filter(item => item.active) }}

// Map
{{ $json.items.map(item => item.name).join(', ') }}
```

## 🔗 Node Connections

### Access Previous Node Data

```javascript
// Current node's data
$json.fieldName

// Specific node's data
$('Node Name').first().json.fieldName

// All items from a node
$('Node Name').all()
```

### Handle Multiple Inputs

```javascript
// In Code node
const input1 = $input.first().json;  // First input
const input2 = $input.last().json;   // Last input
const allInputs = $input.all();      // All inputs
```

## 🚨 Production Checklist

Before deploying to production:

- [ ] Change `.env` passwords (not "change_this_secure_password_123")
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS (`N8N_PROTOCOL=https`)
- [ ] Update `WEBHOOK_URL` to production domain
- [ ] Switch from Gmail OAuth to SendGrid/Resend
- [ ] Set up Slack notifications for errors
- [ ] Enable automatic execution data cleanup
- [ ] Configure backups for n8n data volume
- [ ] Set resource limits in docker-compose.yml
- [ ] Test all workflows in staging environment
- [ ] Document custom workflows

## 📞 Getting Help

1. **Check logs**: `docker-compose logs n8n`
2. **n8n Docs**: https://docs.n8n.io
3. **Community Forum**: https://community.n8n.io
4. **Workflow Library**: https://n8n.io/workflows

## 🎯 Next Steps

1. ✅ Run `./setup.sh` to get started
2. ✅ Import pre-built workflows
3. ✅ Configure credentials
4. ✅ Test each workflow
5. ✅ Customize for your needs
6. 🚀 Deploy to production

---

**Need more details?** See full documentation in `README.md`
