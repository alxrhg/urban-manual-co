# Sanity CMS Setup

This guide explains how to set up and use Sanity CMS with Urban Manual.

## Overview

Sanity CMS is integrated into the Urban Manual project for content management. The Vercel Sanity integration automatically configures the necessary environment variables.

## Environment Variables

The following environment variables are required (automatically set by Vercel Sanity integration):

- `NEXT_PUBLIC_SANITY_PROJECT_ID` - Your Sanity project ID
- `NEXT_PUBLIC_SANITY_DATASET` - Dataset name (defaults to 'production')
- `NEXT_PUBLIC_SANITY_API_VERSION` - API version (defaults to '2024-11-18')
- `SANITY_API_TOKEN` - API token for write operations (optional, for admin features)

## Accessing Sanity Studio

Once configured, access the Sanity Studio at:

```
https://your-domain.vercel.app/studio
```

## API Endpoints

### Get All Destinations
```
GET /api/sanity/destinations
```

Query parameters:
- `city` - Filter by city
- `category` - Filter by category
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

Example:
```
GET /api/sanity/destinations?city=Tokyo&category=restaurant&limit=10
```

### Get Destination by Slug
```
GET /api/sanity/destinations/[slug]
```

Example:
```
GET /api/sanity/destinations/tokyo-sushi-restaurant
```

## Using Sanity Client

### In Server Components

```typescript
import { sanityClient } from '@/lib/sanity/client';

const destinations = await sanityClient.fetch(
  `*[_type == "destination" && city == "Tokyo"]`
);
```

### In Client Components

```typescript
'use client';
import { sanityClient } from '@/lib/sanity/client';

const destinations = await sanityClient.fetch(
  `*[_type == "destination"]`
);
```

### Image URLs

```typescript
import { urlFor } from '@/lib/sanity/client';

const imageUrl = urlFor(destination.image)
  .width(800)
  .height(600)
  .url();
```

## Schema

The destination schema includes:

- `name` - Destination name
- `slug` - URL-friendly identifier
- `city` - City name
- `category` - Category (restaurant, museum, etc.)
- `description` - Short description
- `content` - Rich text content (portable text)
- `image` - Main image
- `latitude` / `longitude` - Location coordinates
- `michelinStars` - Michelin star rating (0-3)
- `crown` - Featured destination flag
- `rating` - Rating (0-5)
- `priceLevel` - Price level (1-4)
- `googlePlaceId` - Google Places ID
- `formattedAddress` - Formatted address

## Vercel Integration

If you installed the Vercel Sanity integration:

1. The environment variables are automatically configured
2. Sanity Studio is available at `/studio`
3. API endpoints are ready to use

## Manual Setup

If you need to set up manually:

1. Create a Sanity project at https://sanity.io
2. Get your project ID from the Sanity dashboard
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` (optional, defaults to 'production')
4. Deploy to Vercel

## Troubleshooting

### Studio Not Loading

- Check that `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- Verify the project ID is correct
- Check browser console for errors

### API Endpoints Returning 503

- Ensure Sanity is configured (`isSanityConfigured()` returns true)
- Check that the project ID is valid
- Verify dataset name matches your Sanity project

### Images Not Loading

- Ensure images are uploaded to Sanity
- Check image URL builder is working
- Verify image references in your queries

