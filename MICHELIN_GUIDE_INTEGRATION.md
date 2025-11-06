# Michelin Guide Integration

This document describes how to fetch and import Michelin Guide data (star restaurants and key hotels) into the Urban Manual database.

## Overview

The Michelin Guide awards two types of ratings:

### Michelin Stars ⭐ (Restaurants)
- **1 Star**: High-quality cooking, worth a stop
- **2 Stars**: Excellent cooking, worth a detour
- **3 Stars**: Exceptional cuisine, worth a special journey
- **Bib Gourmand** (Crown): Good food at moderate prices

### Michelin Keys 🔑 (Hotels)
- **1 Key**: A very special stay
- **2 Keys**: An exceptional stay
- **3 Keys**: An extraordinary stay

Introduced in 2024, the Michelin Keys evaluate hotels based on architecture, interior design, service quality, personality, value, and local experience.

## Database Schema

The `destinations` table includes the following Michelin-related fields:

```sql
michelin_stars        INTEGER   -- Star rating for restaurants (0-3)
michelin_keys         INTEGER   -- Key rating for hotels (1-3)
crown                 BOOLEAN   -- Bib Gourmand designation
michelin_guide_url    TEXT      -- Direct link to Michelin Guide page
michelin_updated_at   TIMESTAMPTZ -- Last update timestamp
```

## Migration

Run the database migration to add Michelin Keys support:

```bash
# Apply migration to Supabase
psql $DATABASE_URL < supabase/migrations/027_add_michelin_keys.sql
```

Or run it through Supabase CLI:

```bash
supabase migration up
```

## Data Collection Methods

There are three ways to import Michelin data:

### Method 1: Web Scraping (Automated)

Use Playwright to scrape data from the Michelin Guide website.

#### Prerequisites

```bash
# Install Playwright browsers
npx playwright install chromium
```

#### Scrape Restaurants

```bash
tsx scripts/scrape-michelin-guide.ts \
  --type restaurants \
  --city "Paris" \
  --output data/michelin/paris-restaurants.json
```

#### Scrape Hotels

```bash
tsx scripts/scrape-michelin-guide.ts \
  --type hotels \
  --city "Tokyo" \
  --output data/michelin/tokyo-hotels.json
```

#### Advanced Options

```bash
tsx scripts/scrape-michelin-guide.ts \
  --type restaurants \
  --city "New York" \
  --country "USA" \
  --output data/michelin/nyc-restaurants.json \
  --max-pages 10 \
  --delay 5000
```

**Note**: The Michelin Guide website has anti-bot protection. Scraping may be unreliable and should be used respectfully with delays.

### Method 2: Manual Data Collection (Recommended)

1. Visit the [Michelin Guide website](https://guide.michelin.com)
2. Search for restaurants or hotels in your target cities
3. Manually create a JSON file with the data

See example files in `data/michelin/` for the correct format.

### Method 3: Third-Party APIs

Consider using third-party Michelin data providers:
- RapidAPI Michelin Guide API
- Other restaurant/hotel data aggregators

## Data Format

### JSON Structure

Create a JSON file with an array of entries:

```json
[
  {
    "name": "Restaurant Name",
    "city": "Paris",
    "country": "France",
    "stars": 2,
    "category": "Restaurants",
    "michelin_guide_url": "https://guide.michelin.com/..."
  },
  {
    "name": "Hotel Name",
    "city": "Tokyo",
    "country": "Japan",
    "keys": 3,
    "category": "Hotels",
    "michelin_guide_url": "https://guide.michelin.com/..."
  },
  {
    "name": "Bistro Name",
    "city": "Lyon",
    "crown": true,
    "category": "Restaurants"
  }
]
```

### Field Descriptions

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `name` | string | Establishment name | ✅ Yes |
| `city` | string | City name | ✅ Yes |
| `country` | string | Country name | Optional |
| `stars` | number | Michelin stars (0-3) for restaurants | Conditional* |
| `keys` | number | Michelin keys (1-3) for hotels | Conditional* |
| `crown` | boolean | Bib Gourmand designation | Optional |
| `category` | string | "Restaurants" or "Hotels" | Optional |
| `michelin_guide_url` | string | Link to Michelin Guide page | Optional |

*Either `stars`, `keys`, or `crown` must be provided.

## Importing Data

Once you have a JSON file with Michelin data, import it using the import script:

```bash
tsx scripts/import-michelin-data.ts data/michelin/paris-restaurants.json
```

### Import Process

The script will:

1. **Match destinations** by name and city
2. **Update Michelin ratings** (stars/keys/crown)
3. **Add Michelin Guide URLs**
4. **Set update timestamp**
5. **Generate a summary report**

### Example Output

```
🔍 Processing 25 Michelin entries...

✓ Found: Le Cinq in Paris
  → Updating with 3 star(s)
  ✅ Updated successfully

✓ Found: Aman Tokyo in Tokyo
  → Updating with 3 key(s)
  ✅ Updated successfully

============================================================
📊 IMPORT SUMMARY
============================================================
Total entries:        25
Matched:              23
Successfully updated: 23
Not found:            2
Errors:               0
============================================================

⚠️  NOT FOUND:
  - Restaurant ABC (Lyon)
  - Hotel XYZ (Kyoto)

✅ Import complete!
```

## Example Data Files

See the `data/michelin/` directory for example files:

- `example-restaurants.json` - 3-star restaurants worldwide
- `example-hotels.json` - 3-key hotels worldwide
- `example-bib-gourmand.json` - Bib Gourmand restaurants

## Workflow Example

### Complete Workflow for Paris

```bash
# Step 1: Scrape restaurants
tsx scripts/scrape-michelin-guide.ts \
  --type restaurants \
  --city "Paris" \
  --output data/michelin/paris-restaurants.json

# Step 2: Scrape hotels
tsx scripts/scrape-michelin-guide.ts \
  --type hotels \
  --city "Paris" \
  --output data/michelin/paris-hotels.json

# Step 3: Import restaurants
tsx scripts/import-michelin-data.ts data/michelin/paris-restaurants.json

# Step 4: Import hotels
tsx scripts/import-michelin-data.ts data/michelin/paris-hotels.json
```

## Frontend Integration

### Displaying Michelin Stars

```tsx
import { MICHELIN } from '@/lib/constants'

function RestaurantCard({ destination }: { destination: Destination }) {
  if (destination.michelin_stars > 0) {
    return (
      <div className="michelin-stars">
        {Array.from({ length: destination.michelin_stars }).map((_, i) => (
          <img key={i} src={MICHELIN.STARS.ICON_URL} alt="Michelin Star" />
        ))}
      </div>
    )
  }
  return null
}
```

### Displaying Michelin Keys

```tsx
function HotelCard({ destination }: { destination: Destination }) {
  if (destination.michelin_keys > 0) {
    return (
      <div className="michelin-keys">
        <span>{destination.michelin_keys} Michelin Key{destination.michelin_keys > 1 ? 's' : ''}</span>
      </div>
    )
  }
  return null
}
```

### Filtering by Michelin Ratings

```typescript
// Filter Michelin-starred restaurants
const { data } = await supabase
  .from('destinations')
  .select('*')
  .eq('category', 'Restaurants')
  .gte('michelin_stars', 1)
  .order('michelin_stars', { ascending: false })

// Filter Michelin Key hotels
const { data } = await supabase
  .from('destinations')
  .select('*')
  .eq('category', 'Hotels')
  .not('michelin_keys', 'is', null)
  .order('michelin_keys', { ascending: false })

// Filter Bib Gourmand
const { data } = await supabase
  .from('destinations')
  .select('*')
  .eq('crown', true)
```

## Updating Michelin Data

Michelin Guide updates its ratings annually:
- **Restaurants**: New stars announced in various ceremonies throughout the year
- **Hotels**: New keys announced at global reveal events

To keep data current:

1. **Monitor Michelin announcements** for new awards
2. **Re-scrape** or manually collect updated data
3. **Re-import** using the same scripts
4. **Check `michelin_updated_at`** timestamp to track data freshness

## API Integration

### Search API with Michelin Filters

Update your search API to support Michelin filtering:

```typescript
// app/api/search/route.ts
const filters: any = {}

if (searchParams.get('michelin_stars')) {
  filters.michelin_stars = parseInt(searchParams.get('michelin_stars'))
}

if (searchParams.get('michelin_keys')) {
  filters.michelin_keys = parseInt(searchParams.get('michelin_keys'))
}

if (searchParams.get('crown') === 'true') {
  filters.crown = true
}
```

## Troubleshooting

### Common Issues

**Issue**: Destinations not found during import

**Solution**: Check that:
- Destination names match exactly (case-insensitive)
- City names match the database
- The destination already exists in the database

**Issue**: Web scraping returns 403 error

**Solution**:
- Use manual data collection instead
- Add longer delays between requests
- Use residential proxies
- Consider third-party APIs

**Issue**: Playwright browser not found

**Solution**:
```bash
npx playwright install chromium
```

## Resources

- [Michelin Guide Official Website](https://guide.michelin.com)
- [Michelin Keys Announcement](https://guide.michelin.com/en/article/travel/michelin-key-hotels-global-reveal-2025)
- [Playwright Documentation](https://playwright.dev)

## License & Legal

- **Michelin Guide™** is a registered trademark of Michelin
- **Respect robots.txt** and rate limiting when scraping
- **Review Michelin's terms of service** before automated data collection
- **Consider data licensing** for commercial use

## Support

For questions or issues with Michelin data integration:

1. Check this documentation
2. Review example files in `data/michelin/`
3. Test with small datasets first
4. Open an issue on GitHub if needed
