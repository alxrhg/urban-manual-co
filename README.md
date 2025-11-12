# The Urban Manual

A modern, curated travel guide featuring 897 destinations across the world.

> **⚠️ IMPORTANT**: This project is being migrated to Next.js 16. Please use the **`urban-manual-next/`** directory for active development.

## Active Development (Next.js 16)

**Location**: `/urban-manual-next/`

### Features

- 🌍 **897 Curated Destinations** - Handpicked places across major cities worldwide
- 🗺️ **Interactive Map** - Visualize countries you've visited
- ⭐ **Michelin-Starred Restaurants** - Discover award-winning dining experiences
- 👤 **User Accounts** - Track visited places, save favorites, and build your travel profile
- 📱 **Responsive Design** - Beautiful on desktop and mobile
- 🎨 **Urban Manual Inspired** - Clean, minimal, editorial design
- 🌙 **Dark Mode** - Full dark mode support
- 🤖 **Smart Trip Guide** - Describe your ideal outing and receive an AI-curated itinerary

### Tech Stack (Next.js)

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with direct client integration
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file in the `urban-manual-next/` directory with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://avdnefdfwvpjkuanhdwk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps (optional - for map embeds)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**Note**: Next.js requires the `NEXT_PUBLIC_` prefix for environment variables that need to be accessible in the browser.

## Deployment to Vercel

### Prerequisites
- Vercel account (sign up at https://vercel.com)
- GitHub account
- This repository pushed to GitHub

### Steps

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/travel-guide.git
   git push -u origin master
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your `travel-guide` repository
   - Vercel will auto-detect the settings
   - Add environment variables in the Vercel dashboard
   - Click "Deploy"

3. **Configure Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env` file
   - Make sure to add them for Production, Preview, and Development

4. **Update Supabase URLs**
   - After deployment, get your Vercel URL
   - Add it to Supabase Authentication → URL Configuration
   - Site URL: `https://your-project.vercel.app`
   - Redirect URLs: `https://your-project.vercel.app/**`

## Local Development (Next.js)

```bash
# Navigate to Next.js app
cd urban-manual-next

# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Note**: The old Vite app in `/client/` is deprecated and should not be used.

## Database Setup

The project uses Supabase with the following tables:

### `destinations`
- Stores all travel destinations
- Fields: name, slug, city, category, description, image, michelin_stars, crown

### `visited_places`
- Tracks user's visited destinations
- Fields: user_id, destination_id, visited_date, rating, notes

### SQL Setup
Run these SQL commands in Supabase SQL Editor:

```sql
-- See setup_supabase.js for full schema
```

## Features Overview

### Home Page
- Browse 897 destinations
- Filter by city (pill-style buttons with counts)
- Search functionality
- Slideover drawer for destination details

### AI Assistant
- Natural language travel queries
- Recommendations from curated database only
- Itinerary generation
- Personalized greetings when logged in

### Smart Trip Guide
- Located at `/trips/smart-guide`
- Free-text preference entry with optional city, budget, and tag controls
- AI interprets requests into structured filters and returns a curated destination list
- Summarized itinerary preview plus destination cards you can tap into for full details

### Account Page
- Travel statistics (places visited, cities explored, countries)
- Visited places grid with images and details
- Interactive world map showing visited countries
- Profile management

### Destination Details
- Large hero images
- Michelin star ratings
- One-click "Mark as Visited"
- Optional visit details (date, rating, notes)
- Save for later functionality

## Design Philosophy

Inspired by Urban Manual and Little Places London:
- Minimal, monochromatic color scheme
- Bold typography
- Large, beautiful imagery
- Story-led content
- Clean, editorial layout

## License

MIT

## Credits

Built with ❤️ using modern web technologies

