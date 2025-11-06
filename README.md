# The Urban Manual

A modern, curated travel guide featuring 897 destinations across the world.

## Architecture

This is a **Next.js 16** application with optional microservices for enhanced features. The core app works fully standalone, with optional services for ML-powered recommendations, high-performance search, and AI-powered development tools.

📖 **[Microservices Architecture Guide](./MICROSERVICES_ARCHITECTURE.md)** - Detailed explanation of why services are separate
⚡ **[Quick Start: Optional Services](./QUICKSTART_OPTIONAL_SERVICES.md)** - Enable ML, Rust, and AI features in minutes

### Features

- 🌍 **897 Curated Destinations** - Handpicked places across major cities worldwide
- 🗺️ **Interactive Map** - Visualize countries you've visited
- ⭐ **Michelin-Starred Restaurants** - Discover award-winning dining experiences
- 👤 **User Accounts** - Track visited places, save favorites, and build your travel profile
- 📱 **Responsive Design** - Beautiful on desktop and mobile
- 🎨 **Urban Manual Inspired** - Clean, minimal, editorial design
- 🌙 **Dark Mode** - Full dark mode support
- 🤖 **ML-Powered Recommendations** - Optional: Enhanced recommendations with collaborative filtering (see [ML Integration Guide](./ML_INTEGRATION_GUIDE.md))

### Tech Stack

**Core Application:**
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with direct client integration
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

**Optional Microservices** (see [Quick Start](./QUICKSTART_OPTIONAL_SERVICES.md)):
- **ML Service**: Python/FastAPI - Personalized recommendations & forecasting
- **Rust Modules**: High-performance vector operations (50x faster search)
- **AI Agents**: LangGraph-based code generation & automation

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://avdnefdfwvpjkuanhdwk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps (optional - for map embeds)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**Note**: Next.js requires the `NEXT_PUBLIC_` prefix for environment variables that need to be accessible in the browser.

### Optional Service Configuration

To enable optional microservices, add these to `.env.local`:

```env
# ML Service (Optional - for personalized recommendations)
ML_SERVICE_URL=http://localhost:8000

# Feature flags
ENABLE_ML_RECOMMENDATIONS=true
ENABLE_ML_FORECASTING=true
```

See **[Quick Start Guide](./QUICKSTART_OPTIONAL_SERVICES.md)** for setup instructions.

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

## Local Development

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Enable Optional Services (Local)

```bash
# Start ML service (terminal 1)
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Start Next.js app (terminal 2)
cd ..
npm run dev
```

See **[Quick Start Guide](./QUICKSTART_OPTIONAL_SERVICES.md)** for detailed setup.

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

## Documentation

### ML Integration (New! ✨)
- 🚀 **[ML Integration Guide](./ML_INTEGRATION_GUIDE.md)** - **START HERE**: ML service is now integrated! Simple 2-minute setup.

### Architecture & Services
- 📖 **[Microservices Architecture Guide](./MICROSERVICES_ARCHITECTURE.md)** - Why services are separate and how they work
- ⚡ **[Quick Start: Optional Services](./QUICKSTART_OPTIONAL_SERVICES.md)** - Enable ML, Rust, and AI features
- 🚢 **[Deployment Guide](./DEPLOYMENT_RUST_AI.md)** - Deploy optional services to production

### Service-Specific Docs
- **[ML Service README](./ml-service/README.md)** - Python ML service documentation
- **[Rust Modules README](./rust-modules/README.md)** - High-performance Rust modules
- **[AI Agents README](./ai-agents/README.md)** - Code generation and automation

### Development Guides
Multiple planning and implementation documents available in the repository for specific features and enhancements.

## License

MIT

## Credits

Built with ❤️ using modern web technologies

