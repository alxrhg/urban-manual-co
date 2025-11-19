# Google Discovery Engine Setup Guide

## ⚠️ Requirement: Discovery Engine is NOT Optional

To fix the "Discovery Engine is not available" error (503), you must configure the following credentials.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Discovery Engine API** (also known as "Vertex AI Search and Conversation")

## 2. Create a Data Store

1. Go to **Search & Conversation** in the console
2. Create a new App (type: **Search**)
3. Create a new Data Store (type: **Structured Data**)
   - You can leave it empty for now, or import data later
4. Link the Data Store to your App

## 3. Create Service Account & Key

1. Go to **IAM & Admin** > **Service Accounts**
2. Create a new Service Account
3. Grant the role: **Discovery Engine Admin** (or Editor)
4. Create a JSON Key for this service account
5. Download the JSON file (e.g., `google-cloud-key.json`)

## 4. Configure Environment Variables

Update your `.env.local` file with the values from your project:

```env
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Discovery Engine Location (usually 'global')
GOOGLE_CLOUD_LOCATION=global

# Data Store ID (found in Data Store details)
DISCOVERY_ENGINE_DATA_STORE_ID=your-data-store-id-here

# Collection ID (default is 'default_collection')
DISCOVERY_ENGINE_COLLECTION_ID=default_collection

# Path to your Service Account Key JSON file
# Place the file in your project root (and add to .gitignore!)
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
```

## 5. Restart Server

After updating `.env.local`, restart the development server:

```bash
npm run dev
```

## Verification

Visit `http://localhost:3000` and check the server logs. You should see:
`[Discovery Engine API] Search completed: ...`
Instead of the 503 error.
