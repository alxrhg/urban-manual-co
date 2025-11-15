# Sanity CMS Setup Guide

This project uses Sanity CMS for content management. The Sanity project ID is **ryd11bal**.

## For Deployed Environments (Vercel, Netlify, etc.) 🚀

**This is the most common setup for production:**

1. **Go to your hosting platform's dashboard**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - Railway: Project → Variables tab
   - Render: Dashboard → Environment tab

2. **Add these environment variables:**
   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=ryd11bal
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
   ```

3. **Redeploy your application**
   - Vercel: Will auto-deploy after adding variables
   - Netlify: Trigger new deploy from Deploys tab
   - Railway/Render: Will auto-redeploy

4. **Access Sanity Studio**
   - Visit your-domain.com/studio - it will now show a link to the Sanity dashboard
   - Or go directly to [sanity.io/manage/project/ryd11bal](https://sanity.io/manage/project/ryd11bal)

**Important:** You don't need to run any local commands if you're just deploying to production!

## For Local Development 💻

If you already have a Sanity account and the project created, just add these to your `.env.local`:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=ryd11bal
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## Full Setup from Scratch

### Option 1: Use Existing Project (ryd11bal)

If the project `ryd11bal` already exists in your Sanity account:

1. Go to [sanity.io/manage](https://sanity.io/manage) and sign in
2. Find the project `ryd11bal` 
3. Add environment variables (see sections above for deployed vs local)

### Option 2: Create New Project with CLI

Run this command to initialize Sanity with the existing configuration:

```bash
npm create sanity@latest -- --project ryd11bal --dataset production --template clean
```

This will:
- Link to the existing Sanity project `ryd11bal`
- Set up the `production` dataset
- Use a clean template (no sample data)

**Important:** If the project doesn't exist, you'll be prompted to create it during this process.

### Option 3: Create Project via Web Dashboard

1. Go to [sanity.io](https://sanity.io) and create a free account
2. Create a new project from the dashboard
3. Copy the project ID
4. Update `sanity.cli.ts` and `.env.local` with your new project ID

## Running Sanity Studio

Once configured, you can run Sanity Studio in two ways:

### 1. Integrated Studio (Embedded in Next.js)

Access the Studio at: `http://localhost:3000/studio`

This page will show setup instructions if not configured, or redirect to the standalone Studio.

### 2. Standalone Studio (Recommended for Development)

Run Sanity Studio standalone:

```bash
npx sanity start
```

This will start the Studio at `http://localhost:3333` by default.

## Deploying Studio

To deploy your Studio to Sanity's hosting:

```bash
npx sanity deploy
```

This creates a hosted version at: `https://your-studio-name.sanity.studio`

## Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=ryd11bal
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## Verify Setup

1. Check that your environment variables are set:
   ```bash
   echo $NEXT_PUBLIC_SANITY_PROJECT_ID
   ```

2. Check CMS health at: `http://localhost:3000/api/sanity-health`

3. Visit the admin CMS tab at: `http://localhost:3000/admin` (requires authentication)

## 3. Configure Environment Variables

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## 4. Access Sanity Studio

Once configured, you can access Sanity Studio at:
- **Local**: http://localhost:3000/studio
- **Production**: https://yourdomain.com/studio

## 5. Schema

The Sanity schema is defined in `/sanity/schemas/` and includes:
- **Destination**: For managing travel destinations
  - Name, slug, city, category
  - Description and full content
  - Images and media
  - Location data (latitude, longitude)
  - Ratings and features (Michelin stars, crown/featured status)

## 6. Admin Integration

The admin page at `/admin` includes a CMS tab that:
- Shows Sanity CMS health status
- Links directly to Sanity Studio
- Provides quick access to manage destinations and media

## 7. API Access

The Sanity client is configured in `/lib/sanity/client.ts` and can be used to:
- Query content using GROQ (Sanity's query language)
- Upload and manage images
- Real-time content updates

Example query:
```typescript
import { client } from '@/lib/sanity/client'

const destinations = await client.fetch(`
  *[_type == "destination"] {
    name,
    slug,
    city,
    image
  }
`)
```

## 8. Deployment

Sanity Studio is automatically deployed with your Next.js app:
- The Studio runs at `/studio` route
- Uses Next.js API routes for communication
- No separate deployment needed

## Need Help?

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Query Reference](https://www.sanity.io/docs/groq)
- [Sanity Community](https://www.sanity.io/community)
