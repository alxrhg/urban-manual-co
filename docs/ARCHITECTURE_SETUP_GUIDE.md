# Architecture-First Platform Setup Guide

## Quick Start

### 1. Run Database Migration

Execute the architecture-first schema migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/030_architecture_first_schema.sql
-- This creates:
--   - architects table
--   - design_movements table
--   - materials table
--   - design_firms table
--   - destination_materials junction table
--   - architectural_photos table
--   - Adds architecture columns to destinations
```

### 2. Populate Base Data

Run enrichment scripts in order:

```bash
# 1. Create design movements (Brutalism, Modernism, etc.)
npm run enrich:movements

# 2. Create materials (Concrete, Glass, Wood, etc.)
npm run enrich:materials

# 3. Extract architects from existing destinations
npm run enrich:architects
```

### 3. Verify Setup

Check that data was created:

```sql
-- Check architects
SELECT COUNT(*) FROM architects;

-- Check movements
SELECT COUNT(*) FROM design_movements;

-- Check materials
SELECT COUNT(*) FROM materials;

-- Check destinations with architect_id
SELECT COUNT(*) FROM destinations WHERE architect_id IS NOT NULL;
```

## Using the Platform

### Travel Intelligence

Visit `/intelligence` to generate travel intelligence:

1. Enter destination city
2. Select dates
3. Choose travel style
4. Click "Generate Intelligence"

The system will:
- Create an architectural journey
- Generate optimized itinerary
- Provide design narrative
- Show architectural insights
- Display real-time adjustments

### Architecture Search

Use the architecture search API:

```typescript
POST /api/architecture/search
{
  "query": "brutalist restaurants in tokyo",
  "city": "tokyo",
  "limit": 20
}
```

The parser understands:
- Architect names: "Tadao Ando restaurants"
- Movements: "Brutalist places"
- Materials: "Concrete architecture"
- Combined: "Brutalist restaurants by Tadao Ando in Tokyo"

### Browse by Movement

Visit movement pages:
- `/movement/brutalism` - Brutalism destinations
- `/movement/modernism` - Modernism destinations
- `/movements` - Browse all movements

### Browse by Architect

Visit architect pages:
- `/architect/tadao-ando` - Tadao Ando's works
- `/architects` - Browse all architects

## Architecture Components

### ArchitectBadge
```tsx
<ArchitectBadge architect={architect} size="md" />
```

### MovementTag
```tsx
<MovementTag movement={movement} size="md" />
```

### MaterialIndicators
```tsx
<MaterialIndicators materials={materials} maxDisplay={3} />
```

### ArchitectureMap
```tsx
<ArchitectureMap 
  architectId={architectId}
  movementId={movementId}
  city={city}
/>
```

## API Endpoints

### Intelligence
- `POST /api/intelligence/generate` - Generate travel intelligence
- `POST /api/intelligence/realtime` - Get real-time adjustments

### Architecture Search
- `POST /api/architecture/search` - Architecture-aware search

### Architecture Data
- `GET /api/architects/[id]` - Get architect data (to be implemented)
- `GET /api/movements/[slug]` - Get movement data (to be implemented)

## Next Steps

1. **Enhance Homepage**: Integrate `ArchitectureHomepageSection` into main homepage
2. **Update Destination Cards**: Add architecture badges and movement tags
3. **Enrich Data**: Add architectural significance and design stories
4. **Add More Movements**: Expand movement database
5. **Enhance Architect Pages**: Use new architect_id relationships

## Architecture-First Philosophy

Remember: **Architecture is primary, not metadata.**

- Every destination should have an architect_id
- Design movements organize destinations
- Materials define architectural character
- Intelligence understands design intent
- Search is architecture-aware

This is an architecture guide that happens to be about travel.

