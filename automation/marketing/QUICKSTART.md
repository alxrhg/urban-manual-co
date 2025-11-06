# 🚀 Quick Start Guide

Get your Instagram automation running in 15 minutes.

## ⚡ Fast Setup (5 Steps)

### 1. Set Environment Variables (2 min)

```bash
cd automation
cp .env.example .env
nano .env  # or use your favorite editor
```

**Required:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` - See step 3
- `INSTAGRAM_ACCESS_TOKEN` - See step 3

### 2. Start n8n (1 min)

```bash
docker-compose up -d
```

Wait 30 seconds, then visit: http://localhost:5678

### 3. Get Instagram API Access (5 min)

**Option A: Quick (for testing)**
Use the [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api/getting-started):
1. Go to https://developers.facebook.com/apps/
2. Create App → Consumer
3. Add "Instagram Basic Display"
4. Get your token

**Option B: Production (recommended)**
1. Convert to Business Account (in Instagram app settings)
2. Link to Facebook Page
3. Get access via Graph API Explorer
4. Copy your `Business Account ID` and `Access Token`

### 4. Import Workflows (3 min)

In n8n (http://localhost:5678):

1. Click **Workflows** → **Import**
2. Upload `workflows/1-content-generation.json`
3. Click credentials → Add OpenAI API
   - Enter your OpenAI API key
4. Import `workflows/2-auto-post-approved.json`
5. Add Instagram credentials
6. **Activate both workflows**

### 5. Generate First Post (1 min)

In n8n:
1. Open "Instagram Content Generator" workflow
2. Click **"Execute Workflow"** button (top right)
3. Wait 30-60 seconds
4. Check `generated-content` folder for your image!

---

## 🎨 Test Approval Flow

### Start Approval Dashboard

```bash
cd automation/marketing/approval-queue
node approval-server.js
```

Open: http://localhost:3001

You should see your generated post ready for review!

### Approve & Post

1. Click **✓ Approve** on the post
2. Wait for next posting time (9am, 1pm, or 7pm)
3. Or manually trigger "Auto-Poster" workflow in n8n

---

## ⚙️ Customize Your Style

### Quick Edits

Edit `config/brand-aesthetic.json`:

```json
{
  "visualStyle": {
    "mood": "Change this to your mood",
    "photoStyle": {
      "composition": "Your composition style",
      "lighting": "Your lighting preference"
    }
  },
  "captionStyle": {
    "tone": "Your tone here",
    "emojiUsage": "Your emoji strategy"
  }
}
```

### Test Custom Style

1. Edit the config file
2. In n8n, manually execute the content generation workflow
3. Review the generated content
4. Refine until satisfied
5. Activate automatic scheduling

---

## 📅 Scheduling

### Content Generation

Default: Mon, Wed, Fri at 9am

**To change:** Edit `1-content-generation.json` line 8:
```json
"expression": "0 9 * * 1,3,5"
```

Common schedules:
- Daily 9am: `"0 9 * * *"`
- Weekdays 8am: `"0 8 * * 1-5"`
- 3x/day: `"0 9,14,19 * * *"`

### Auto-Posting

Default: 9am, 1pm, 7pm daily

**To change:** Edit `2-auto-post-approved.json` line 8:
```json
"expression": "0 9,13,19 * * *"
```

---

## ✅ Checklist

- [ ] Environment variables set (`.env`)
- [ ] n8n running (`docker-compose up -d`)
- [ ] Instagram API credentials added
- [ ] OpenAI API key added
- [ ] Both workflows imported
- [ ] Both workflows activated
- [ ] Test post generated
- [ ] Approval server running
- [ ] Test post approved
- [ ] Brand aesthetic customized

---

## 🎯 What's Next?

### Week 1: Test & Refine
- Generate 3-5 test posts
- Refine your brand aesthetic
- Test posting manually
- Monitor engagement

### Week 2: Automate
- Set generation schedule (3x/week)
- Set posting schedule (1x/day)
- Set up Telegram notifications (optional)
- Create approval routine (check dashboard daily)

### Week 3: Optimize
- Analyze which content performs best
- Adjust content pillars ratio
- Refine AI prompts
- Increase posting frequency

---

## 🔥 Pro Tips

**1. Start Small**
Generate 1 post/day max for first week. Quality > Quantity.

**2. Review Everything**
Never auto-post without approval initially. Build trust in the AI.

**3. Mix Content**
70% AI + 30% manual posts = best results.

**4. Track Metrics**
Monitor approval rate. If <80%, refine your aesthetic config.

**5. Iterate Prompts**
Save rejected posts, analyze why, update `ai-prompts.json`.

---

## 🆘 Troubleshooting

**Workflow fails?**
→ Check n8n Executions tab for error details

**No posts generated?**
→ Verify OpenAI API key has credits
→ Check n8n logs: `docker logs urban-manual-n8n`

**Can't approve posts?**
→ Ensure approval server is running
→ Check browser console for errors

**Instagram API errors?**
→ Verify token is valid: `curl "https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN"`
→ Check token expiration (60 days for long-lived)

---

## 📞 Need Help?

1. Check main [README.md](./README.md) for full documentation
2. Review [n8n community forums](https://community.n8n.io/)
3. Test individual nodes in n8n to isolate issues

---

**Ready to automate? Let's go! 🚀**
