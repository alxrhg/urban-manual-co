# 🎨 AI-Powered Instagram Marketing Automation

Complete system for generating, approving, and posting Instagram content using AI with bulk approval workflow.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Setup Guide](#setup-guide)
- [Customizing Your Aesthetic](#customizing-your-aesthetic)
- [Workflow Guide](#workflow-guide)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This system automates your Instagram content creation with AI while keeping you in control through a simple bulk approval process:

1. **AI generates** content based on your brand aesthetic (images + captions)
2. **You review** and approve posts in batches via web dashboard
3. **System auto-posts** approved content on your schedule

### Workflow Flow

```
┌─────────────────┐
│  AI Generation  │  ← Runs 3x/week (configurable)
│  (n8n workflow) │  ← Creates images + captions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Approval Queue  │  ← Posts wait here for your review
│  (Web Dashboard)│  ← You bulk approve/reject
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Posting   │  ← Posts at 9am, 1pm, 7pm daily
│  (n8n workflow) │  ← Publishes to Instagram
└─────────────────┘
```

---

## ✨ Features

- **AI Content Generation**: DALL-E 3 for images, GPT-4 for captions
- **Brand-Aligned**: Uses your custom aesthetic configuration
- **Bulk Approval**: Review multiple posts at once via web interface
- **Scheduled Posting**: Automatic posting at optimal times
- **Content Pillars**: Balanced mix of educational, inspirational, and promotional
- **Telegram Notifications**: Get notified when new content needs review (optional)

---

## 🏗️ Architecture

### Directory Structure

```
automation/marketing/
├── config/
│   ├── brand-aesthetic.json    # Your brand style guide
│   └── ai-prompts.json          # AI prompt templates
├── workflows/
│   ├── 1-content-generation.json    # Generates content
│   └── 2-auto-post-approved.json    # Posts approved content
├── approval-queue/
│   ├── approval-dashboard.html      # Web interface
│   ├── approval-server.js           # Simple API server
│   ├── approval-queue.jsonl         # Pending posts
│   └── approved-queue.jsonl         # Approved posts ready to post
└── generated-content/               # AI-generated images
```

---

## 🚀 Setup Guide

### Prerequisites

- Docker & Docker Compose
- Instagram Business Account
- Meta Developer Account (for Instagram API)
- OpenAI API Key

### Step 1: Configure Environment

```bash
cd automation
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# n8n
N8N_USER=admin
N8N_PASSWORD=your_secure_password

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Instagram (Meta Graph API)
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id
INSTAGRAM_ACCESS_TOKEN=your_token

# Optional: Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Step 2: Get Instagram API Access

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app → Business type
3. Add "Instagram" product
4. Get your Instagram Business Account ID:
   ```bash
   curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"
   ```
5. Get long-lived access token:
   ```bash
   curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN"
   ```

### Step 3: Start n8n

```bash
cd automation
docker-compose up -d
```

Access n8n at: `http://localhost:5678`

Login with credentials from `.env`:
- Username: admin (or your N8N_USER)
- Password: your_secure_password

### Step 4: Import Workflows

1. In n8n, click **Workflows** → **Import**
2. Import both workflow files:
   - `workflows/1-content-generation.json`
   - `workflows/2-auto-post-approved.json`
3. For each workflow:
   - Add your OpenAI credentials
   - Add your Instagram credentials
   - Activate the workflow

### Step 5: Start Approval Server

```bash
cd marketing/approval-queue
node approval-server.js
```

Access dashboard at: `http://localhost:3001`

---

## 🎨 Customizing Your Aesthetic

### Edit Brand Configuration

Open `config/brand-aesthetic.json`:

```json
{
  "visualStyle": {
    "description": "YOUR STYLE HERE",
    "colorPalette": {
      "primary": "#YOUR_COLOR",
      "accent": "#YOUR_ACCENT"
    },
    "mood": "YOUR MOOD (e.g., minimal, vibrant, moody)",
    "photoStyle": {
      "composition": "YOUR COMPOSITION RULES",
      "lighting": "YOUR LIGHTING PREFERENCE",
      "filters": "YOUR FILTER STYLE"
    }
  },
  "captionStyle": {
    "tone": "YOUR TONE",
    "voice": "YOUR VOICE",
    "emojiUsage": "YOUR EMOJI STRATEGY"
  }
}
```

### Example Aesthetic Profiles

**Minimal Travel Blog:**
```json
{
  "visualStyle": {
    "description": "Clean, minimal, muted tones",
    "colorPalette": {
      "primary": "#2d3436",
      "secondary": "#dfe6e9",
      "accent": "#74b9ff"
    },
    "mood": "Calm, sophisticated, aspirational",
    "photoStyle": {
      "composition": "Lots of negative space, centered subjects",
      "lighting": "Soft natural light, overcast preferred",
      "filters": "Desaturated, muted pastels, -10 contrast"
    }
  }
}
```

**Vibrant Adventure:**
```json
{
  "visualStyle": {
    "description": "Bold, colorful, high-energy",
    "colorPalette": {
      "primary": "#e74c3c",
      "secondary": "#f39c12",
      "accent": "#3498db"
    },
    "mood": "Exciting, adventurous, bold",
    "photoStyle": {
      "composition": "Dynamic angles, action shots",
      "lighting": "Golden hour, dramatic shadows",
      "filters": "Vibrant colors, +20 saturation, high contrast"
    }
  }
}
```

### Training the AI on Your Style

**Method 1: Feed Examples**

Add 10-15 of your best posts to `ai-prompts.json`:

```json
{
  "captionGeneration": {
    "examples": [
      {
        "post": "YOUR ACTUAL CAPTION HERE",
        "explanation": "Why this works for your brand"
      }
    ]
  }
}
```

**Method 2: Custom Image Style Reference**

For DALL-E, create detailed prompts:

```json
{
  "imagePromptTemplate": "Travel photography in the style of [your favorite photographer], {subject}, {location}, muted color palette, minimalist composition, film photography aesthetic, Fujifilm color science"
}
```

---

## 📖 Workflow Guide

### Content Generation Schedule

Default: **Monday, Wednesday, Friday at 9:00 AM**

To change schedule, edit `1-content-generation.json`:

```json
{
  "parameters": {
    "rule": {
      "interval": [{
        "field": "cronExpression",
        "expression": "0 9 * * 1,3,5"  // Edit this
      }]
    }
  }
}
```

**Cron Examples:**
- Daily at 9am: `0 9 * * *`
- Mon-Fri at 8am: `0 8 * * 1-5`
- Every other day: `0 9 */2 * *`

### Posting Schedule

Default: **9:00 AM, 1:00 PM, 7:00 PM daily**

Edit `2-auto-post-approved.json`:

```json
{
  "expression": "0 9,13,19 * * *"
}
```

**Best Times for Instagram:**
- **Fashion/Beauty**: 9am, 1pm, 5pm
- **Food**: 11am, 2pm, 7pm
- **Travel**: 9am, 12pm, 8pm
- **B2B**: 8am, 12pm, 5pm

### Approval Process

1. **Receive Notification** (if Telegram enabled)
2. **Open Dashboard**: `http://localhost:3001`
3. **Review Posts**: Check image + caption
4. **Bulk Actions**:
   - Click checkboxes to select multiple posts
   - Click "Approve Selected" or "Reject Selected"
5. **Done!** Approved posts will auto-post on schedule

---

## 🔌 API Integration

### Approval API Endpoints

**Get Pending Posts**
```bash
GET http://localhost:3001/api/posts
```

**Approve Post**
```bash
POST http://localhost:3001/api/approve
Content-Type: application/json

{
  "postId": "post_1234567890"
}
```

**Bulk Approve**
```bash
POST http://localhost:3001/api/bulk-approve
Content-Type: application/json

{
  "postIds": ["post_123", "post_456", "post_789"]
}
```

### Webhook Integration

To integrate with Slack/Discord for approvals:

1. Create a webhook endpoint in your workspace
2. Add webhook node to n8n workflow
3. Send approval links via webhook

---

## 🎛️ Advanced Customization

### Content Pillars

Adjust content mix in `brand-aesthetic.json`:

```json
{
  "contentPillars": {
    "educational": { "percentage": 40 },  // Travel tips
    "inspirational": { "percentage": 30 }, // Beautiful shots
    "promotional": { "percentage": 30 }    // Your product/service
  }
}
```

### Custom Destinations

Add your focus destinations in the workflow:

```json
{
  "name": "destination",
  "value": "={{ ['Paris', 'Tokyo', 'YOUR_CITY'][Math.floor(Math.random() * 3)] }}"
}
```

### Multiple Posting Times

Duplicate the posting workflow for different content types:

- **Workflow A**: Posts landscape photos at 9am
- **Workflow B**: Posts close-ups at 1pm
- **Workflow C**: Posts video content at 7pm

---

## 🔧 Troubleshooting

### Common Issues

**"Instagram API Error: Invalid Token"**
- Your access token expired (they last 60 days)
- Generate a new long-lived token
- Update `.env` and restart n8n

**"DALL-E: Content Policy Violation"**
- Your prompt triggered safety filters
- Make prompts more generic
- Avoid: people's faces, violence, sensitive topics

**"Posts not appearing in approval queue"**
- Check n8n execution logs
- Verify workflow is activated
- Check file permissions on `approval-queue` folder

**"Approval dashboard shows no images"**
- Images path is incorrect
- Check `generated-content` folder exists
- Verify approval server is serving images from correct path

### Debugging Tips

**Check n8n logs:**
```bash
docker logs urban-manual-n8n
```

**Check workflow executions:**
- n8n UI → Executions tab
- Look for failed nodes (red)
- Click to see error details

**Test AI generation manually:**
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Write an Instagram caption about Paris"}]
  }'
```

---

## 📊 Monitoring & Analytics

### Track Performance

Add analytics tracking to workflow:

```javascript
// In n8n, add a Function node after posting
const post = items[0].json;

// Send to Google Analytics
await fetch('https://www.google-analytics.com/mp/collect', {
  method: 'POST',
  body: JSON.stringify({
    measurement_id: 'G-XXXXXXXXXX',
    api_secret: 'YOUR_SECRET',
    events: [{
      name: 'instagram_post',
      params: {
        content_pillar: post.contentPillar,
        destination: post.destination,
        post_id: post.id
      }
    }]
  })
});

return items;
```

### Success Metrics

Monitor these weekly:
- **Approval Rate**: % of AI posts you approve
- **Engagement**: Likes/comments per post
- **Time Saved**: Hours not spent creating content
- **Consistency**: Posts per week maintained

---

## 🎯 Next Steps

### Immediate Actions

1. ✅ Customize `brand-aesthetic.json` with your style
2. ✅ Set up Instagram API credentials
3. ✅ Import and activate n8n workflows
4. ✅ Run test generation manually
5. ✅ Approve test post and verify auto-posting works

### Optimization (Week 2+)

- Fine-tune AI prompts based on approval rate
- A/B test different posting times
- Add more content pillars
- Train custom DALL-E style
- Integrate with other platforms (Twitter, LinkedIn)

### Advanced Features

- **Multi-account**: Manage multiple Instagram accounts
- **Carousel posts**: Generate multi-image posts
- **Stories automation**: Auto-post to Stories
- **Reply automation**: AI-generated comment responses
- **Competitor analysis**: Scrape and analyze competitor content

---

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [DALL-E 3 Prompting Guide](https://platform.openai.com/docs/guides/images)

---

## 💡 Tips for Best Results

1. **Start Conservative**: Generate 1-2 posts/week initially
2. **Iterate on Prompts**: Refine based on what you approve
3. **Mix AI & Manual**: Supplement with manual posts
4. **Monitor Engagement**: Track what resonates with your audience
5. **Stay Authentic**: Review every post - don't blindly auto-post

---

## 🆘 Support

Issues? Questions?

1. Check the [Troubleshooting](#troubleshooting) section
2. Review n8n execution logs
3. Test individual workflow nodes
4. Check OpenAI/Instagram API status pages

---

**Built for Urban Manual** | Last Updated: 2025-01-06
