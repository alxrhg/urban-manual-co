# The Urban Manual

A modern, curated travel guide featuring 897 destinations across the world.

> **⚠️ IMPORTANT**: The production Next.js 16 app now lives at the **repository root**. All commands in this README assume you are already in `/workspace/urban-manual` (or wherever you cloned the repo).

Need to work on the tagging/enrichment system? Read the [Semantic Tags Guide](docs/semantic_tags.md) for rule syntax, testing steps, and taxonomy tips.

## Active Development (Next.js 16)

**Location**: Repository root (`/`)

### Features

- 🌍 **897 Curated Destinations** - Handpicked places across major cities worldwide
- 🗺️ **Interactive Map** - Visualize countries you've visited
- ⭐ **Michelin-Starred Restaurants** - Discover award-winning dining experiences
- 👤 **User Accounts** - Track visited places, save favorites, and build your travel profile
- 📱 **Responsive Design** - Beautiful on desktop and mobile
- 🎨 **Urban Manual Inspired** - Clean, minimal, editorial design
- 🌙 **Dark Mode** - Full dark mode support

### Tech Stack (Next.js)

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with direct client integration
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file in the repository root:

```env
# Required for Supabase auth + client access
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for enrichment scripts / admin tasks
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Gemini / Google features (AI chat, contextual search, maps)
GEMINI_API_KEY=your_gemini_or_google_api_key
GOOGLE_API_KEY=your_google_api_key # falls back to NEXT_PUBLIC_GOOGLE_API_KEY
NEXT_PUBLIC_GOOGLE_API_KEY=your_browser_safe_google_key

# Optional client features
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_MAPKIT_JS_KEY=your_apple_mapkit_key
NEXT_PUBLIC_MAPKIT_TEAM_ID=your_apple_team_id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BUILD_VERSION=dev
```

Next.js requires the `NEXT_PUBLIC_` prefix for any variable that must be available in the browser. The Supabase/Google scripts also read the unprefixed counterparts (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`, etc.), so the safest path is to define both when possible.

## Local Development

### Quick Start

Use the automated setup script:

```bash
# Run setup script (installs dependencies and creates .env.local)
./scripts/setup-dev.sh

# Start development server (http://localhost:3000)
npm run dev
```

### Manual Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server (http://localhost:3000)
npm run dev

# Run linting / unit tests
npm run lint
npm run test:unit

# Build and start production server
npm run build
npm start
```

### Docker Development

```bash
# Start all services (Next.js + ML service)
docker-compose up

# Start with hot reload (development mode)
docker-compose --profile dev up

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Deployment to Vercel

See the [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md) for detailed deployment procedures.

### Quick Deploy

**Prerequisites:**
- Vercel account (sign up at https://vercel.com)
- GitHub account with this repository

**Steps:**

1. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import this repository
   - Vercel auto-detects Next.js configuration

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add required variables (see `.env.example`)
   - Set for Production, Preview, and Development

3. **Deploy**
   - Push to `main` branch for production
   - Create PR for automatic preview deployments

### CI/CD Pipeline

Automatic deployments on:
- Push to `main` → Production deployment
- Pull Request → Preview deployment with unique URL
- Manual deployment via Vercel CLI

GitHub Actions automatically:
- Runs tests and linting
- Builds the application
- Scans for security issues
- Checks dependencies

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for complete infrastructure documentation.

## Legacy Note

Earlier iterations of Urban Manual used a Vite client that lived in `/client`. That codebase is fully deprecated—the folder no longer exists, and all current work should target the root-level Next.js 16 project described above. The history is useful if you are spelunking older migrations, but ignore any residual references to `/client` or `urban-manual-next/` in older documents.

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

## Infrastructure & DevOps

### CI/CD Pipeline
- **Automated Testing**: Tests run on every push and PR
- **Automated Builds**: Build verification before deployment
- **Security Scanning**: Dependency and secret scanning
- **Automated Updates**: Dependabot for dependency updates

### Monitoring & Observability
- **Health Checks**: `/api/health` endpoint for status monitoring
- **Performance Monitoring**: Vercel Analytics for Core Web Vitals
- **Error Tracking**: Built-in Next.js error handling
- **Logging**: Structured logging with 7-day retention

### Container Support
- **Docker**: Production-ready Dockerfile included
- **Docker Compose**: Local development environment
- **ML Service**: Separate containerized Python service

### Documentation
- [Infrastructure Guide](./INFRASTRUCTURE.md) - Complete infrastructure documentation
- [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md) - Deployment procedures and runbooks
- [Monitoring Guide](./MONITORING.md) - Monitoring and observability
- [Environment Variables](./.env.example) - All configuration options

## License

MIT

## Credits

Built with ❤️ using modern web technologies

