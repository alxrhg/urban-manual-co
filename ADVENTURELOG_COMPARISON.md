# AdventureLog vs Urban Manual Trip Features Comparison

## Overview
This document compares AdventureLog's trip planning features with Urban Manual's existing implementation to identify potential integration opportunities.

## AdventureLog Key Features

### 1. **Collections System**
- **What**: Flexible folders/groups for organizing locations
- **Use Cases**: Group all stops for a trip, theme-based journeys (e.g., "Paris Museums"), recurring travels
- **Status in Urban Manual**: ❌ Not implemented (only single trip structure)

### 2. **Multi-Day Itineraries**
- **What**: Day-by-day planning with multiple locations per day
- **Features**: 
  - Stop-by-stop planning
  - Timing information
  - Notes and checklists per item
  - External resource links (maps, tickets)
- **Status in Urban Manual**: ✅ Partially implemented
  - Has day-based organization
  - Has order_index for ordering within days
  - Has time field
  - Has notes field

### 3. **Collaborative Planning**
- **What**: Share trips/collections with other users
- **Features**:
  - Public/private trips
  - Direct sharing with specific users
  - Collaborative editing
- **Status in Urban Manual**: ⚠️ Partially implemented
  - Has `is_public` flag on trips
  - No multi-user collaboration features
  - No sharing mechanism beyond public/private

### 4. **Categories, Tags & Customization**
- **What**: Organize locations with categories and tags
- **Features**:
  - Predefined categories (Hiking, Museums, etc.)
  - Custom tags for flexible organization
- **Status in Urban Manual**: ✅ Implemented differently
  - Destinations have categories
  - No custom tags for trips specifically

### 5. **Time-Aware Planning**
- **What**: Respect exact start/end times with time zones
- **Features**:
  - Time zone support
  - Chronological timeline
  - Auto-ordering by time
- **Status in Urban Manual**: ⚠️ Basic implementation
  - Has time field (VARCHAR)
  - No timezone support
  - Manual ordering via order_index

### 6. **Attachments & Media**
- **What**: Rich media support for trip items
- **Features**:
  - Images for memories/planning
  - PDF attachments (tickets, maps, hotels)
  - External links
- **Status in Urban Manual**: ⚠️ Limited
  - Cover images for trips
  - Destination images via destination_slug
  - Notes field can store JSON with image URLs
  - No file upload/attachment system

### 7. **Packing Lists & Checklists**
- **What**: Trip preparation tools
- **Features**:
  - Per-trip packing lists
  - Checklists with items
  - Day-by-day notes
- **Status in Urban Manual**: ❌ Not implemented
  - TripPackingList component exists but needs backend

### 8. **Interactive Map Views**
- **What**: Visual trip planning and tracking
- **Features**:
  - Visited/planned locations on map
  - Distance calculation
  - Elevation data for hikes
- **Status in Urban Manual**: ✅ Implemented
  - Has map visualization
  - Visited countries tracking
  - Integration with destination coordinates

### 9. **Activity Tracking Integration**
- **What**: Import from fitness/activity apps
- **Features**:
  - Strava integration
  - Wanderer integration
  - GPS trail upload
  - Distance and elevation stats
- **Status in Urban Manual**: ❌ Not implemented
  - No activity tracking
  - No GPS trail support

### 10. **World Travel Book**
- **What**: Track countries and regions visited
- **Features**:
  - Country/region tracking
  - Travel statistics
  - Visual map of visited places
- **Status in Urban Manual**: ✅ Implemented
  - Has visited_countries table
  - Has visited_places tracking
  - Account page shows stats

### 11. **Import/Export Data**
- **What**: Data portability
- **Features**:
  - GPX export
  - GeoJSON export
  - Various format support
- **Status in Urban Manual**: ❌ Not implemented
  - No data export features

## Technical Stack Comparison

### AdventureLog
- **Frontend**: SvelteKit
- **Backend**: Django REST Framework
- **Database**: PostgreSQL
- **Deployment**: Docker (self-hosted)
- **License**: GPL-3.0

### Urban Manual
- **Frontend**: Next.js 16 (App Router), React 19
- **Backend**: Next.js API routes, tRPC
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **License**: MIT

## Current Urban Manual Trip Schema

### trips table
```sql
- id (UUID)
- user_id (UUID) -> auth.users
- title (VARCHAR 255)
- description (TEXT)
- destination (VARCHAR 255)
- start_date (DATE)
- end_date (DATE)
- status (planning|upcoming|ongoing|completed)
- is_public (BOOLEAN)
- cover_image (VARCHAR 500)
- created_at, updated_at (TIMESTAMP)
```

### itinerary_items table
```sql
- id (UUID)
- trip_id (UUID) -> trips
- destination_slug (VARCHAR 255)
- day (INTEGER)
- order_index (INTEGER)
- time (VARCHAR 50)
- title (VARCHAR 255)
- description (TEXT)
- notes (TEXT) -- Can store JSON
- created_at (TIMESTAMP)
```

## Gap Analysis

### High-Priority Gaps
1. **No Collections/Grouping** - Can't organize multiple trips together
2. **No Packing Lists Backend** - UI exists but no data persistence
3. **No Multi-User Collaboration** - Can't share trips with specific users
4. **No File Attachments** - Can't upload tickets, maps, PDFs
5. **No Data Export** - Users can't export their trip data

### Medium-Priority Gaps
1. **No Time Zone Support** - Time stored as VARCHAR, no timezone handling
2. **Limited Sharing** - Only public/private, no granular permissions
3. **No Activity Tracking** - No GPS trails, Strava integration, etc.
4. **No Checklist System** - Beyond packing lists, general checklists

### Low-Priority Gaps
1. **No Custom Tags** - Can use destination categories but not custom tags
2. **No Elevation Data** - Not tracking hiking/activity elevation

## Recommendations

### Option 1: Fork AdventureLog (Not Recommended)
**Pros:**
- Get all features at once
- Proven, battle-tested codebase
- Active community and updates

**Cons:**
- Complete tech stack mismatch (SvelteKit vs Next.js, Django vs Supabase)
- Would require massive refactoring to integrate
- GPL-3.0 license may conflict with MIT
- Self-hosted focus vs cloud-native Urban Manual
- Different design philosophy (functional vs editorial)

### Option 2: Selective Feature Adoption (Recommended)
**Pros:**
- Keep existing tech stack
- Add features incrementally
- Maintain Urban Manual's design philosophy
- Stay on Vercel/Supabase infrastructure

**Cons:**
- More implementation work
- Need to design features ourselves

### Option 3: Hybrid Approach
- Reference AdventureLog's feature set as inspiration
- Implement high-priority gaps using Urban Manual stack
- Keep what works in current implementation
- Add unique features that fit Urban Manual's curation focus

## Proposed Implementation Plan

### Phase 1: Core Enhancements (Minimal Changes)
1. **Add trip_collections table**
   - Group related trips together
   - Simple parent-child relationship
   
2. **Enhance itinerary_items with proper time support**
   - Add timezone field
   - Convert time to proper TIMESTAMPTZ
   
3. **Add packing_lists table**
   - Link to trips
   - Store checklist items with completion status

### Phase 2: Collaboration Features
1. **Add trip_shares table**
   - Share trips with specific users
   - Permission levels (view/edit)
   
2. **Update RLS policies**
   - Support shared trip access
   - Maintain security

### Phase 3: Rich Media & Attachments
1. **Add trip_attachments table**
   - Store file references (using Supabase Storage)
   - Support PDFs, images, etc.
   
2. **Enhance notes field**
   - Better structured JSON schema
   - Support for rich content

### Phase 4: Advanced Features (Optional)
1. **Activity tracking**
   - GPX file upload
   - Basic stats (distance, elevation)
   
2. **Data export**
   - JSON export
   - PDF itinerary generation

## Conclusion

**Do NOT fork AdventureLog.** Instead, use it as inspiration to enhance Urban Manual's existing trip feature with targeted, incremental improvements that fit the existing tech stack and design philosophy.

The current trip implementation is solid and just needs refinement rather than replacement. Focus on:
- Packing lists (already has UI)
- Better sharing/collaboration
- File attachments
- Collections for organization

This approach maintains code quality, stays within the MIT license, and builds on existing investment while incorporating AdventureLog's best ideas.
