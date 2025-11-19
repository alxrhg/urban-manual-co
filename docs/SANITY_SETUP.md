# Sanity CMS Setup

This project exposes a fully managed Sanity Studio at `/studio`. The studio ships with a starter `destination` schema that mirrors our Supabase destinations table.

## Environment Variables

Add the following variables to every environment (`.env.local`, Vercel, etc.):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=xxxx
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2023-10-01
NEXT_PUBLIC_SANITY_PROJECT_TITLE=Urban Manual CMS
NEXT_PUBLIC_SANITY_USE_CDN=true
SANITY_TOKEN=<optional editor token>
```

- `NEXT_PUBLIC_` prefixed variables are required both on the client (for Studio) and server (for GROQ queries).
- `SANITY_TOKEN` is only required for server-side mutations or preview drafts.

## Local Development

1. Install dependencies (`npm install`).
2. Run the Next.js dev server: `npm run dev`.
3. Open http://localhost:3000/studio to manage content.

## Deploying the Studio

The Studio is bundled alongside the app via `NextStudio` so no additional Sanity hosting is required. Ensure the Sanity project has the following CORS origins:

- `http://localhost:3000`
- Your production domain (e.g., `https://app.urbanmanual.com`).

## Schemas

All schemas live in `sanity/schemas`. To add new content types, create a new file and export it via `sanity/schemas/index.ts`.

## Querying Sanity Data

Use `lib/sanity/client.ts` to obtain a configured Sanity client:

```ts
import { sanityClient } from '@/lib/sanity/client';

const destinations = await sanityClient.fetch(`*[_type == "destination"]{name, slug}`);
```

Keep GROQ queries server-side whenever possible.
