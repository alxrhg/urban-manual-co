# Discovery Engine Configuration Quick Fix

## Problem
Discovery Engine API status shows:
```
isAvailable: false
isConfigured: false
useDiscoveryEngine: false
projectId: 'missing'
location: 'missing'
dataStoreId: 'missing'
```

## Solution: Add Required Environment Variables

### Step 1: Create or Update `.env.local`

Create a `.env.local` file in your project root (if it doesn't exist) and add the following:

```bash
# Discovery Engine Configuration (REQUIRED)
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global

# Service Account Credentials (REQUIRED - choose one option)
# Option 1: Path to JSON file (for local development)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json

# Option 2: JSON as environment variable (for Vercel/production)
# GOOGLE_CLOUD_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### Step 2: Get Your Google Cloud Project ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Copy your **Project ID** (e.g., `urban-manual-123456`)
4. Replace `your-project-id-here` in `.env.local`

### Step 3: Create a Data Store (if you haven't already)

1. Go to [Discovery Engine Console](https://console.cloud.google.com/gen-app-builder)
2. Click **"Data Stores"** → **"Create Data Store"**
3. Configure:
   - **Name**: `urban-manual-destinations`
   - **Type**: Generic
   - **Location**: Global
4. Click **"Create"** and wait 2-5 minutes
5. Note the **Data Store ID** (usually matches the name)

### Step 4: Set Up Service Account Credentials

#### Option A: For Local Development (Recommended)

1. Install Google Cloud SDK:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate:
   ```bash
   gcloud auth application-default login
   ```

3. **No need to set `GOOGLE_APPLICATION_CREDENTIALS`** - gcloud handles it automatically

#### Option B: Use Service Account JSON File

1. Create a service account in Google Cloud Console:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **"Create Service Account"**
   - Name: `discovery-engine-sa`
   - Grant role: **Discovery Engine Admin**

2. Create and download key:
   - Click on the service account
   - Go to **"Keys"** tab
   - Click **"Add Key"** → **"Create new key"**
   - Select **JSON**
   - Save the file securely (e.g., `~/discovery-engine-key.json`)

3. Set environment variable:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/Users/alxrhg/discovery-engine-key.json
   ```

#### Option C: For Vercel/Production

1. Convert your service account JSON to a single-line string
2. Add to Vercel environment variables as `GOOGLE_CLOUD_CREDENTIALS_JSON`
3. Make sure to escape quotes properly

### Step 5: Restart Your Development Server

After adding the environment variables:

```bash
# Stop your current server (Ctrl+C)
# Then restart
npm run dev
# or
yarn dev
```

### Step 6: Verify Configuration

The status check should now show:
```
isAvailable: true
isConfigured: true
useDiscoveryEngine: true
projectId: 'your-project-id'
location: 'global'
dataStoreId: 'urban-manual-destinations'
```

## Quick Reference

**Minimum Required Variables:**
- `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud project ID
- `DISCOVERY_ENGINE_DATA_STORE_ID` - Your data store ID (default: `urban-manual-destinations`)
- `GOOGLE_CLOUD_LOCATION` - Location (default: `global`)
- **AND** one of:
  - `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file
  - `GOOGLE_CLOUD_CREDENTIALS_JSON` - Service account JSON as string
  - OR use `gcloud auth application-default login` (no env var needed)

## Troubleshooting

### Still showing "missing" after setup?

1. **Check file location**: Make sure `.env.local` is in the project root (same directory as `package.json`)
2. **Restart server**: Environment variables are only loaded on server start
3. **Check variable names**: They must match exactly (case-sensitive)
4. **Check credentials**: Make sure service account has Discovery Engine Admin role

### Need more help?

See the detailed guides:
- `DISCOVERY_ENGINE_SETUP.md` - Full setup guide
- `EXISTING_GOOGLE_CLOUD_SETUP.md` - If you already have Google Cloud setup
- `GOOGLE_CLOUD_SETUP_STEP_BY_STEP.md` - Step-by-step walkthrough

