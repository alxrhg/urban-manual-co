# Sanity CMS Setup Guide

This project uses Sanity CMS for content management. Follow these steps to set it up:

## 1. Create a Sanity Project

1. Go to [sanity.io](https://sanity.io) and create a free account
2. Create a new project:
   ```bash
   npm create sanity@latest -- --project <your-project-name> --dataset production
   ```
   Or create through the web dashboard at https://sanity.io/manage

## 2. Get Your Project Credentials

From your Sanity dashboard (https://sanity.io/manage):
- **Project ID**: Found in project settings
- **Dataset**: Usually `production` (or `development` for testing)

## 3. Configure Environment Variables

Add these to your `.env.local` file:

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
