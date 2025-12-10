# R2 Setup Steps for Cloudflare AI Search

## Quick Setup Checklist

- [ ] Step 1: Create R2 Bucket
- [ ] Step 2: Create R2 API Token
- [ ] Step 3: Set Environment Variables
- [ ] Step 4: Export Destinations to R2
- [ ] Step 5: Create AI Search with R2 Bucket

---

## Step 1: Create R2 Bucket

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Navigate to: **R2** (in left sidebar)

2. **Create New Bucket**
   - Click **"Create bucket"** button
   - **Bucket name**: `urban-manual-destinations`
   - **Location**: Choose closest to you (or default)
   - Click **"Create bucket"**

3. **Verify Bucket Created**
   - You should see `urban-manual-destinations` in your bucket list
   - Status should be "Active"

---

## Step 2: Create R2 API Token

1. **Go to R2 API Tokens**
   - In Cloudflare Dashboard → **R2** → **Manage R2 API Tokens**
   - Or: https://dash.cloudflare.com/?to=/:account/r2/api-tokens

2. **Create API Token**
   - Click **"Create API Token"**
   - **Token name**: `urban-manual-export` (or any name)
   - **Permissions**: 
     - ✅ **Object Read & Write**
   - **Bucket**: 
     - Select **"urban-manual-destinations"** (or "All buckets" if you prefer)
   - Click **"Create API Token"**

3. **Copy Credentials** ⚠️ **IMPORTANT: Copy these now, you won't see them again!**
   - **Access Key ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Secret Access Key**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save these securely (you'll need them in Step 3)

---

## Step 3: Set Environment Variables

1. **Get Your Cloudflare Account ID**
   - Go to Cloudflare Dashboard
   - Look at the **right sidebar** → Your **Account ID** is displayed there
   - Or: Go to any page, Account ID is in the URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/...`

2. **Add to `.env.local`**

   Open your `.env.local` file and add:

   ```env
   # Cloudflare Account
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here

   # R2 Credentials (from Step 2)
   R2_ACCESS_KEY_ID=your_access_key_id_here
   R2_SECRET_ACCESS_KEY=your_secret_access_key_here
   R2_BUCKET_NAME=urban-manual-destinations

   # R2 Endpoint (auto-generated, but you can set it explicitly)
   # R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
   ```

   **Replace:**
   - `your_account_id_here` → Your Cloudflare Account ID
   - `your_access_key_id_here` → Access Key ID from Step 2
   - `your_secret_access_key_here` → Secret Access Key from Step 2

3. **Verify Environment Variables**

   Make sure you also have Supabase credentials:
   ```env
   # Supabase (should already exist)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   # OR
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   ```

---

## Step 4: Export Destinations to R2

1. **Install Dependencies** (if not already installed)
   ```bash
   npm install
   ```

2. **Test with Dry Run** (recommended first)
   ```bash
   npm run export:r2:dry-run
   ```
   
   This will:
   - Show you what would be exported
   - Verify your configuration
   - **Not actually upload anything**

3. **Export First 10 Destinations** (for testing)
   ```bash
   npx tsx scripts/export-destinations-to-r2.ts --limit=10
   ```

   **Expected output:**
   ```
   🚀 Starting destination export to R2 (Dry Run: false, Limit: 10)...
   📦 Bucket: urban-manual-destinations
   ✅ Found 10 destinations to process
   📤 Uploading destinations/restaurant-name.md...
   ✅ Uploaded destinations/restaurant-name.md
   ...
   🎉 Export to R2 complete!
   ```

4. **Verify in Cloudflare Dashboard**
   - Go to **R2** → **urban-manual-destinations** bucket
   - You should see files in `destinations/` folder
   - Each file should be named like `destinations/restaurant-name.md`

5. **Export All Destinations** (once you've verified it works)
   ```bash
   npm run export:r2
   # OR
   npx tsx scripts/export-destinations-to-r2.ts
   ```

   **This may take a few minutes** depending on how many destinations you have.

---

## Step 5: Create AI Search with R2 Bucket

1. **Go to Cloudflare AI Search**
   - Cloudflare Dashboard → **AI** → **AI Search**
   - Or: https://dash.cloudflare.com/?to=/:account/ai/search

2. **Create New AI Search**
   - Click **"Create a new AI Search"** button

3. **Connect Data Source**
   - **Step 1**: Select **"R2 Bucket"** (not Website)
   - **Bucket**: Select `urban-manual-destinations`
   - **Path Prefix** (optional): `destinations/` (if all files are in this folder)
   - Click **"Continue"**

4. **Connect AI Gateway** (Step 2)
   - If you have an AI Gateway, connect it
   - If not, you can create one or skip (AI Search will use default)

5. **Generate Indexes** (Step 3)
   - AI Search will automatically:
     - Read all Markdown files from R2
     - Generate embeddings
     - Create search indexes
   - **This may take a few minutes** depending on the number of files
   - Wait for indexing to complete

6. **Configure Retrieval and Generation** (Step 4)
   - **Retrieval settings**: Default is usually fine
   - **Generation model**: Choose your preferred model
   - **Query rewriting**: Enable (recommended)
   - Click **"Continue"**

7. **Finalize** (Step 5)
   - Review settings
   - Click **"Create"** or **"Finalize"**

8. **Get Instance ID**
   - After creation, you'll see your AI Search instance
   - Copy the **Instance ID** (you'll need this for API calls)

---

## Step 6: Test AI Search

1. **Use the Test Interface**
   - In Cloudflare Dashboard → AI Search → Your instance
   - There should be a test interface
   - Try queries like:
     - "Best restaurants in Paris"
     - "Michelin star restaurants"
     - "Hotels in Tokyo"

2. **Verify Results**
   - Results should show relevant destinations
   - Should include context from your Markdown files

---

## Troubleshooting

### **Error: "Missing R2 configuration"**
- ✅ Check `.env.local` has all R2 variables
- ✅ Verify variable names are correct (case-sensitive)
- ✅ Restart your terminal/IDE after adding env vars

### **Error: "Access Denied" or "403 Forbidden"**
- ✅ Check R2 API token has correct permissions
- ✅ Verify bucket name matches
- ✅ Check token hasn't expired

### **Error: "Bucket not found"**
- ✅ Verify bucket name is correct
- ✅ Check bucket exists in Cloudflare Dashboard
- ✅ Ensure you're using the correct account

### **Export Script Fails**
- ✅ Check Supabase credentials are correct
- ✅ Verify you have destinations in your database
- ✅ Check network connection

### **AI Search Can't Find Files**
- ✅ Verify files are in R2 bucket
- ✅ Check path prefix matches folder structure
- ✅ Ensure files are Markdown format (`.md`)

---

## Quick Reference

### **Environment Variables Needed:**
```env
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=urban-manual-destinations
SUPABASE_URL=xxx (or NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### **Useful Commands:**
```bash
# Dry run (test without uploading)
npm run export:r2:dry-run

# Export first 10 (for testing)
npx tsx scripts/export-destinations-to-r2.ts --limit=10

# Export all destinations
npm run export:r2
```

### **Cloudflare Dashboard Links:**
- R2 Buckets: https://dash.cloudflare.com/?to=/:account/r2
- R2 API Tokens: https://dash.cloudflare.com/?to=/:account/r2/api-tokens
- AI Search: https://dash.cloudflare.com/?to=/:account/ai/search

---

## Next Steps

After setup:
1. ✅ Test AI Search queries
2. ✅ Integrate into your app (see `AUTORAG_SETUP_GUIDE.md`)
3. ✅ Set up automatic exports (cron job)
4. ✅ Monitor usage and costs

---

**That's it! You're ready to use Cloudflare AI Search with your R2 data.** 🎉

