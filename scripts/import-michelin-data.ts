/**
 * Import Michelin Guide Data (Stars for Restaurants, Keys for Hotels)
 *
 * This script imports Michelin star ratings for restaurants and Michelin keys for hotels
 * from a JSON file and updates the destinations table.
 *
 * Data Source Options:
 * 1. Manual collection from https://guide.michelin.com
 * 2. Third-party Michelin data APIs
 * 3. CSV export from Michelin Guide website
 *
 * Usage:
 *   tsx scripts/import-michelin-data.ts <json-file-path>
 *
 * Example:
 *   tsx scripts/import-michelin-data.ts data/michelin-restaurants.json
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface MichelinEntry {
  name: string;
  city: string;
  country?: string;
  stars?: number; // 1-3 for restaurants
  keys?: number; // 1-3 for hotels
  crown?: boolean; // Bib Gourmand
  michelin_guide_url?: string;
  category?: 'Restaurants' | 'Hotels'; // Type of establishment
}

interface MatchResult {
  matched: number;
  updated: number;
  notFound: string[];
  errors: string[];
}

/**
 * Find destination by name and city
 */
async function findDestination(name: string, city: string) {
  // Try exact match first
  let { data, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city, category')
    .ilike('name', name)
    .ilike('city', city)
    .limit(1)

  if (error) {
    console.error(`Error finding ${name} in ${city}:`, error.message)
    return null
  }

  if (data && data.length > 0) {
    return data[0]
  }

  // Try fuzzy match (name contains or city contains)
  const { data: fuzzyData, error: fuzzyError } = await supabase
    .from('destinations')
    .select('id, slug, name, city, category')
    .or(`name.ilike.%${name}%,city.ilike.%${city}%`)
    .limit(5)

  if (fuzzyError || !fuzzyData || fuzzyData.length === 0) {
    return null
  }

  // Return first match that has matching city OR name
  const bestMatch = fuzzyData.find(d =>
    d.city.toLowerCase() === city.toLowerCase() ||
    d.name.toLowerCase() === name.toLowerCase()
  )

  return bestMatch || null
}

/**
 * Update destination with Michelin data
 */
async function updateMichelinData(
  destinationId: number,
  entry: MichelinEntry
): Promise<boolean> {
  const updateData: any = {
    michelin_updated_at: new Date().toISOString(),
  }

  // Add stars for restaurants
  if (entry.stars !== undefined) {
    updateData.michelin_stars = entry.stars
  }

  // Add keys for hotels
  if (entry.keys !== undefined) {
    updateData.michelin_keys = entry.keys
  }

  // Add crown/Bib Gourmand
  if (entry.crown !== undefined) {
    updateData.crown = entry.crown
  }

  // Add Michelin Guide URL
  if (entry.michelin_guide_url) {
    updateData.michelin_guide_url = entry.michelin_guide_url
  }

  // Update category if provided and destination doesn't have proper category
  if (entry.category) {
    updateData.category = entry.category
  }

  const { error } = await supabase
    .from('destinations')
    .update(updateData)
    .eq('id', destinationId)

  if (error) {
    console.error(`Error updating destination ${destinationId}:`, error.message)
    return false
  }

  return true
}

/**
 * Import Michelin data from JSON file
 */
async function importMichelinData(filePath: string): Promise<MatchResult> {
  const result: MatchResult = {
    matched: 0,
    updated: 0,
    notFound: [],
    errors: [],
  }

  // Read JSON file
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  let entries: MichelinEntry[]

  try {
    entries = JSON.parse(fileContent)
  } catch (error) {
    console.error(`❌ Invalid JSON file: ${error}`)
    process.exit(1)
  }

  console.log(`\n🔍 Processing ${entries.length} Michelin entries...\n`)

  // Process each entry
  for (const entry of entries) {
    try {
      const destination = await findDestination(entry.name, entry.city)

      if (!destination) {
        console.log(`⚠️  Not found: ${entry.name} in ${entry.city}`)
        result.notFound.push(`${entry.name} (${entry.city})`)
        continue
      }

      result.matched++

      const michelinType = entry.stars ? `${entry.stars} star(s)` : entry.keys ? `${entry.keys} key(s)` : 'crown'
      console.log(`✓ Found: ${destination.name} in ${destination.city}`)
      console.log(`  → Updating with ${michelinType}`)

      const success = await updateMichelinData(destination.id, entry)

      if (success) {
        result.updated++
        console.log(`  ✅ Updated successfully\n`)
      } else {
        result.errors.push(`${entry.name} (${entry.city})`)
        console.log(`  ❌ Update failed\n`)
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error: any) {
      console.error(`❌ Error processing ${entry.name}:`, error.message)
      result.errors.push(`${entry.name} (${entry.city}): ${error.message}`)
    }
  }

  return result
}

/**
 * Print summary report
 */
function printSummary(result: MatchResult, totalEntries: number) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total entries:        ${totalEntries}`)
  console.log(`Matched:              ${result.matched}`)
  console.log(`Successfully updated: ${result.updated}`)
  console.log(`Not found:            ${result.notFound.length}`)
  console.log(`Errors:               ${result.errors.length}`)
  console.log('='.repeat(60))

  if (result.notFound.length > 0) {
    console.log('\n⚠️  NOT FOUND:')
    result.notFound.forEach(item => console.log(`  - ${item}`))
  }

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:')
    result.errors.forEach(item => console.log(`  - ${item}`))
  }

  console.log('\n✅ Import complete!\n')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error(`
❌ Missing file path argument

Usage: tsx scripts/import-michelin-data.ts <json-file-path>

Example: tsx scripts/import-michelin-data.ts data/michelin-restaurants.json

The JSON file should have the following format:
[
  {
    "name": "Restaurant Name",
    "city": "City Name",
    "country": "Country",
    "stars": 2,
    "michelin_guide_url": "https://guide.michelin.com/..."
  },
  {
    "name": "Hotel Name",
    "city": "City Name",
    "keys": 3,
    "category": "Hotels",
    "michelin_guide_url": "https://guide.michelin.com/..."
  }
]
    `)
    process.exit(1)
  }

  const filePath = path.resolve(args[0])

  console.log('🌟 Michelin Guide Data Import')
  console.log('================================')
  console.log(`File: ${filePath}\n`)

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const entries = JSON.parse(fileContent)

  const result = await importMichelinData(filePath)
  printSummary(result, entries.length)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
