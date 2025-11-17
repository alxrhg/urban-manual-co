# Cloudflare AI Search Setup Guide

## What is Cloudflare AI Search?

**Cloudflare AI Search** is a conversational search feature that:
- **Crawls your website** (via sitemap or direct crawling)
- **Indexes content** automatically
- **Creates embeddings** for semantic search
- **Provides conversational search** interface
- **Works with AutoRAG** for RAG capabilities

**Key Difference from AutoRAG:**
- **AutoRAG**: You upload data to R2, AutoRAG indexes it
- **AI Search**: Cloudflare crawls your website automatically, indexes it

---

## Your Current Setup Issue

### **Problem:**
You're trying to use `alexanderhuang.me` in Cloudflare AI Search, but:
- Your actual site is `urbanmanual.co`
- Your sitemap is at `https://www.urbanmanual.co/sitemap.xml`
- Cloudflare can't find the sitemap at `alexanderhuang.me`

### **Solution:**
Use `urbanmanual.co` (or `www.urbanmanual.co`) as the domain in Cloudflare AI Search.

---

## Step-by-Step Setup

### **Step 1: Verify Your Sitemap**

Your sitemap is already set up correctly:
- ✅ **Sitemap URL**: `https://www.urbanmanual.co/sitemap.xml`
- ✅ **Robots.txt**: References sitemap correctly
- ✅ **Next.js Dynamic Sitemap**: Generated via `app/sitemap.ts`

**Verify it's accessible:**
```bash
curl https://www.urbanmanual.co/sitemap.xml
# Should return XML sitemap
```

### **Step 2: Set Up Cloudflare AI Search**

1. **Go to Cloudflare Dashboard** → **AI** → **AI Search**

2. **Create New AI Search**:
   - Click "Create a new AI Search"

3. **Connect Data Source**:
   - Select **"Website"** (not R2 Bucket)
   - **Source type**: "Sitemap"
   - **Domain**: Use `urbanmanual.co` or `www.urbanmanual.co`
     - ⚠️ **Important**: Use your actual domain, not `alexanderhuang.me`
   - **Subdomain**: Leave empty (or use `www` if needed)

4. **Parsing Options**:
   - **Recommended**: "Rendered site"
     - Loads pages like a browser
     - Captures dynamic content (Next.js renders)
     - Better for React/Next.js apps
   - **Alternative**: "Static site" (faster, but may miss dynamic content)

5. **Continue Setup**:
   - Connect AI Gateway (if needed)
   - Generate indexes
   - Configure retrieval and generation
   - Finalize

---

## Fixing the Sitemap Error

### **Error: "Sitemap not found. Please check your robots.txt"**

**Possible Causes:**

1. **Wrong Domain**:
   - ❌ Using `alexanderhuang.me` (doesn't exist)
   - ✅ Use `urbanmanual.co` or `www.urbanmanual.co`

2. **Sitemap Not Accessible**:
   - Check: `https://www.urbanmanual.co/sitemap.xml`
   - Should return XML (verified above ✅)

3. **Robots.txt Issue**:
   - Your `robots.txt` correctly references sitemap ✅
   - Check: `https://www.urbanmanual.co/robots.txt`

4. **Cloudflare Zone Issue**:
   - Make sure `urbanmanual.co` is in your Cloudflare account
   - DNS should be proxied (orange cloud)

### **Quick Fix:**

1. **Change Domain in AI Search Setup**:
   - Use `urbanmanual.co` instead of `alexanderhuang.me`
   - Or use `www.urbanmanual.co` if that's your primary domain

2. **Verify Zone in Cloudflare**:
   - Go to **DNS** → Check if `urbanmanual.co` is listed
   - Ensure it's proxied (orange cloud icon)

3. **Test Sitemap Access**:
   ```bash
   # Test from Cloudflare's perspective
   curl -H "User-Agent: Cloudflare" https://www.urbanmanual.co/sitemap.xml
   ```

---

## Cloudflare AI Search vs Your Current Setup

### **What You Already Have:**

1. **Custom Conversational Search** (`/api/ai-chat`)
   - OpenAI GPT-4o-mini
   - Google Discovery Engine
   - Supabase pgvector
   - Full control

2. **AutoRAG Integration** (set up, not fully deployed)
   - Manual data export to R2
   - Full control over indexing

### **What Cloudflare AI Search Adds:**

1. **Automatic Website Crawling**:
   - No manual data export needed
   - Automatically crawls your site
   - Updates when content changes

2. **Ready-to-Use Interface**:
   - Pre-built conversational UI
   - Less customization needed

3. **Cloudflare Integration**:
   - Works with Cloudflare Workers
   - Integrated with Cloudflare ecosystem

### **Comparison:**

| Feature | Your Current Setup | Cloudflare AI Search |
|---------|-------------------|---------------------|
| **Crawling** | Manual (AutoRAG) | ✅ Automatic |
| **Indexing** | Manual export | ✅ Automatic |
| **Customization** | ✅ Full control | ⚠️ Limited |
| **Discovery Engine** | ✅ Integrated | ❌ Not integrated |
| **Personalization** | ✅ Advanced | ⚠️ Basic |
| **Cost** | Variable | FREE (Enterprise) |

---

## Should You Use Cloudflare AI Search?

### **✅ Use Cloudflare AI Search If:**
1. **You want automatic crawling** - No manual data export
2. **You want less maintenance** - Cloudflare handles indexing
3. **You want a quick setup** - Faster than AutoRAG manual setup
4. **You want to test** - See how it compares to your current setup

### **❌ Don't Use Cloudflare AI Search If:**
1. **You need Discovery Engine** - AI Search doesn't integrate with it
2. **You need advanced personalization** - Your current setup is more advanced
3. **You need full control** - Your custom setup gives more flexibility

### **🤔 Hybrid Approach (Recommended):**

**Use Both:**
- **Cloudflare AI Search**: For automatic website crawling and indexing
- **Your Current Setup**: For advanced features (Discovery Engine, personalization)
- **AutoRAG**: For specific data sources (destination details from R2)

**Benefits:**
- ✅ Automatic website indexing (AI Search)
- ✅ Advanced personalization (Discovery Engine)
- ✅ Specific data sources (AutoRAG)
- ✅ Best of all worlds

---

## Setup Checklist

### **Before Starting:**
- [ ] Verify `urbanmanual.co` is in your Cloudflare account
- [ ] Verify DNS is proxied (orange cloud)
- [ ] Test sitemap: `https://www.urbanmanual.co/sitemap.xml`
- [ ] Test robots.txt: `https://www.urbanmanual.co/robots.txt`

### **During Setup:**
- [ ] Use correct domain: `urbanmanual.co` (not `alexanderhuang.me`)
- [ ] Select "Website" as data source
- [ ] Select "Sitemap" as source type
- [ ] Choose "Rendered site" for parsing (better for Next.js)
- [ ] Configure AI Gateway (if needed)
- [ ] Generate indexes
- [ ] Test conversational search

### **After Setup:**
- [ ] Test search functionality
- [ ] Compare with your current setup
- [ ] Decide if you want to use it alongside or replace current setup

---

## Troubleshooting

### **Error: "Sitemap not found"**

**Fix:**
1. Use correct domain (`urbanmanual.co`)
2. Verify sitemap is accessible: `curl https://www.urbanmanual.co/sitemap.xml`
3. Check robots.txt references sitemap
4. Ensure domain is in Cloudflare account

### **Error: "Robots.txt not found"**

**Fix:**
1. Verify robots.txt: `curl https://www.urbanmanual.co/robots.txt`
2. Check Next.js generates it correctly (`app/robots.ts`)
3. Ensure domain is proxied in Cloudflare

### **Error: "Domain not in Cloudflare account"**

**Fix:**
1. Add domain to Cloudflare account
2. Update nameservers
3. Wait for DNS propagation

---

## Next Steps

1. **Fix Domain**: Use `urbanmanual.co` in AI Search setup
2. **Complete Setup**: Follow the wizard steps
3. **Test**: Try conversational search
4. **Compare**: See how it compares to your current setup
5. **Decide**: Use alongside or replace current setup

---

## Resources

- [Cloudflare AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [Cloudflare AI Search Blog](https://blog.cloudflare.com/ai-search/)
- [Your Sitemap](https://www.urbanmanual.co/sitemap.xml)
- [Your Robots.txt](https://www.urbanmanual.co/robots.txt)

---

**TL;DR: Use `urbanmanual.co` (not `alexanderhuang.me`) in Cloudflare AI Search setup. Your sitemap is already correctly configured. Cloudflare AI Search is great for automatic website crawling, but your current setup is more advanced. Consider using both!**

