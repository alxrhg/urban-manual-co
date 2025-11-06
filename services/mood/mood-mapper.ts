/**
 * Mood Mapping Service
 * Automatically maps destinations to moods using AI and heuristics
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface MoodMapping {
  mood_key: string
  strength: number // 0-1
  confidence: number // 0-1
  reasoning?: string
}

export interface Destination {
  id: number
  name: string
  category: string
  cuisine_type?: string
  price_level?: number
  rating?: number
  description?: string
  tags?: string[]
  ambiance_tags?: string[]
  city: string
}

// Standard mood keys from taxonomy
export const MOOD_KEYS = [
  'energetic',
  'relaxed',
  'cozy',
  'romantic',
  'social',
  'solo',
  'family',
  'adventurous',
  'curious',
  'familiar',
  'celebration',
  'working',
  'exploring',
  'local_vibes',
  'inspiring',
  'nostalgic',
  'trendy',
  'hidden_gem',
] as const

export type MoodKey = typeof MOOD_KEYS[number]

// ============================================
// Mood Mapper
// ============================================

export class MoodMapper {
  /**
   * Map a destination to all applicable moods
   */
  async mapDestination(destination: Destination): Promise<MoodMapping[]> {
    // Step 1: Get heuristic-based mappings
    const heuristicMappings = this.getHeuristicMappings(destination)

    // Step 2: Get AI-enhanced mappings
    const aiMappings = await this.getAIMappings(destination)

    // Step 3: Merge and normalize
    const merged = this.mergeMappings(heuristicMappings, aiMappings)

    // Step 4: Filter out weak mappings (strength < 0.3)
    return merged.filter(m => m.strength >= 0.3)
  }

  /**
   * Save mood mappings to database
   */
  async saveMoodMappings(
    destinationId: number,
    mappings: MoodMapping[],
    source: 'auto' | 'manual' | 'ai' | 'crowd' = 'auto'
  ): Promise<void> {
    const records = mappings.map(mapping => ({
      destination_id: destinationId,
      mood_key: mapping.mood_key,
      strength: mapping.strength,
      confidence: mapping.confidence,
      source,
    }))

    const { error } = await supabase
      .from('destination_moods')
      .upsert(records, { onConflict: 'destination_id,mood_key' })

    if (error) {
      throw new Error(`Failed to save mood mappings: ${error.message}`)
    }
  }

  /**
   * Batch process multiple destinations
   */
  async batchMapDestinations(destinations: Destination[]): Promise<void> {
    console.log(`[MoodMapper] Processing ${destinations.length} destinations`)

    for (const destination of destinations) {
      try {
        const mappings = await this.mapDestination(destination)
        await this.saveMoodMappings(destination.id, mappings, 'auto')
        console.log(`[MoodMapper] Mapped ${destination.name}: ${mappings.length} moods`)
      } catch (error) {
        console.error(`[MoodMapper] Failed to map ${destination.name}:`, error)
      }

      // Rate limiting: wait 100ms between destinations
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // ============================================
  // Heuristic Mapping
  // ============================================

  private getHeuristicMappings(destination: Destination): MoodMapping[] {
    const mappings: MoodMapping[] = []

    // Price level heuristics
    if (destination.price_level) {
      if (destination.price_level >= 4) {
        mappings.push({ mood_key: 'celebration', strength: 0.7, confidence: 0.8 })
        mappings.push({ mood_key: 'romantic', strength: 0.6, confidence: 0.7 })
      } else if (destination.price_level <= 2) {
        mappings.push({ mood_key: 'casual', strength: 0.6, confidence: 0.7 })
        mappings.push({ mood_key: 'local_vibes', strength: 0.5, confidence: 0.6 })
      }
    }

    // Category heuristics
    const category = destination.category.toLowerCase()
    if (category.includes('bar') || category.includes('club')) {
      mappings.push({ mood_key: 'energetic', strength: 0.8, confidence: 0.9 })
      mappings.push({ mood_key: 'social', strength: 0.9, confidence: 0.9 })
    } else if (category.includes('cafe') || category.includes('coffee')) {
      mappings.push({ mood_key: 'cozy', strength: 0.8, confidence: 0.9 })
      mappings.push({ mood_key: 'working', strength: 0.6, confidence: 0.7 })
      mappings.push({ mood_key: 'solo', strength: 0.5, confidence: 0.6 })
    } else if (category.includes('museum') || category.includes('gallery')) {
      mappings.push({ mood_key: 'inspiring', strength: 0.9, confidence: 0.9 })
      mappings.push({ mood_key: 'curious', strength: 0.7, confidence: 0.8 })
      mappings.push({ mood_key: 'solo', strength: 0.6, confidence: 0.7 })
    } else if (category.includes('park') || category.includes('garden')) {
      mappings.push({ mood_key: 'relaxed', strength: 0.9, confidence: 0.9 })
      mappings.push({ mood_key: 'family', strength: 0.7, confidence: 0.8 })
    }

    // Tag-based heuristics
    const tags = destination.tags || []
    const allTags = [...tags, ...(destination.ambiance_tags || [])].map(t => t.toLowerCase())

    if (allTags.some(t => t.includes('romantic') || t.includes('intimate') || t.includes('date'))) {
      mappings.push({ mood_key: 'romantic', strength: 0.9, confidence: 0.9 })
    }

    if (allTags.some(t => t.includes('hidden') || t.includes('secret') || t.includes('local'))) {
      mappings.push({ mood_key: 'hidden_gem', strength: 0.8, confidence: 0.8 })
      mappings.push({ mood_key: 'adventurous', strength: 0.6, confidence: 0.7 })
    }

    if (allTags.some(t => t.includes('trendy') || t.includes('popular') || t.includes('instagram'))) {
      mappings.push({ mood_key: 'trendy', strength: 0.9, confidence: 0.8 })
    }

    if (allTags.some(t => t.includes('quiet') || t.includes('peaceful') || t.includes('calm'))) {
      mappings.push({ mood_key: 'relaxed', strength: 0.8, confidence: 0.9 })
      mappings.push({ mood_key: 'solo', strength: 0.6, confidence: 0.7 })
    }

    if (allTags.some(t => t.includes('family') || t.includes('kids'))) {
      mappings.push({ mood_key: 'family', strength: 0.9, confidence: 0.9 })
    }

    if (allTags.some(t => t.includes('historic') || t.includes('traditional') || t.includes('classic'))) {
      mappings.push({ mood_key: 'nostalgic', strength: 0.7, confidence: 0.8 })
      mappings.push({ mood_key: 'familiar', strength: 0.6, confidence: 0.7 })
    }

    if (allTags.some(t => t.includes('lively') || t.includes('vibrant') || t.includes('bustling'))) {
      mappings.push({ mood_key: 'energetic', strength: 0.8, confidence: 0.8 })
      mappings.push({ mood_key: 'social', strength: 0.7, confidence: 0.7 })
    }

    if (allTags.some(t => t.includes('cozy') || t.includes('warm'))) {
      mappings.push({ mood_key: 'cozy', strength: 0.9, confidence: 0.9 })
    }

    // Rating heuristics
    if (destination.rating && destination.rating >= 4.5) {
      mappings.push({ mood_key: 'celebration', strength: 0.5, confidence: 0.6 })
    }

    return mappings
  }

  // ============================================
  // AI-Enhanced Mapping
  // ============================================

  private async getAIMappings(destination: Destination): Promise<MoodMapping[]> {
    const prompt = `
You are a destination mood analyzer. Analyze this destination and assign appropriate moods.

Destination:
- Name: ${destination.name}
- Category: ${destination.category}
- Cuisine: ${destination.cuisine_type || 'N/A'}
- Price Level: ${'$'.repeat(destination.price_level || 2)}
- Rating: ${destination.rating || 'N/A'}/5
- Description: ${destination.description || 'N/A'}
- Tags: ${destination.tags?.join(', ') || 'N/A'}
- Location: ${destination.city}

Available Moods:
- energetic: High-energy, vibrant experiences
- relaxed: Calm, peaceful environments
- cozy: Comfortable, warm atmospheres
- romantic: Date nights, intimate moments
- social: Group gatherings, making memories
- solo: Personal time, reflection
- family: Family-friendly experiences
- adventurous: Completely new experiences
- curious: Discovery with familiarity
- familiar: Tried-and-true favorites
- celebration: Special occasions
- working: Productive environments
- exploring: Tourist sightseeing
- local_vibes: Experience like a local
- inspiring: Creativity and inspiration
- nostalgic: Reminds of good memories
- trendy: Popular and buzzing
- hidden_gem: Off-the-beaten-path

For each applicable mood (select 3-6 moods), provide:
1. mood_key (from list above)
2. strength (0-1): How strongly this mood applies
3. confidence (0-1): Your confidence in this assessment
4. reasoning: Brief explanation (10-20 words)

Return ONLY a JSON array:
[
  {
    "mood_key": "romantic",
    "strength": 0.85,
    "confidence": 0.9,
    "reasoning": "Intimate ambiance and candlelit setting perfect for couples"
  }
]
`.trim()

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()

      // Extract JSON from response
      const jsonMatch = text.match(/\[[^\]]*\]/s)
      if (!jsonMatch) {
        console.error('Failed to parse Gemini mood response:', text)
        return []
      }

      const mappings = JSON.parse(jsonMatch[0]) as MoodMapping[]

      // Validate mood keys
      return mappings.filter(m => MOOD_KEYS.includes(m.mood_key as MoodKey))
    } catch (error) {
      console.error('Gemini mood mapping error:', error)
      return []
    }
  }

  // ============================================
  // Mapping Merge
  // ============================================

  private mergeMappings(
    heuristic: MoodMapping[],
    ai: MoodMapping[]
  ): MoodMapping[] {
    const merged = new Map<string, MoodMapping>()

    // Add heuristic mappings
    for (const mapping of heuristic) {
      merged.set(mapping.mood_key, { ...mapping })
    }

    // Merge AI mappings
    for (const mapping of ai) {
      const existing = merged.get(mapping.mood_key)

      if (existing) {
        // Average strength and confidence if both exist
        merged.set(mapping.mood_key, {
          mood_key: mapping.mood_key,
          strength: (existing.strength + mapping.strength) / 2,
          confidence: (existing.confidence + mapping.confidence) / 2,
          reasoning: mapping.reasoning,
        })
      } else {
        merged.set(mapping.mood_key, { ...mapping })
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.strength - a.strength)
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get mood mappings for a destination from database
   */
  async getDestinationMoods(destinationId: number): Promise<MoodMapping[]> {
    const { data, error } = await supabase
      .from('destination_moods')
      .select('mood_key, strength, confidence')
      .eq('destination_id', destinationId)
      .order('strength', { ascending: false })

    if (error) {
      console.error('Failed to fetch destination moods:', error)
      return []
    }

    return data || []
  }

  /**
   * Get all destinations that need mood mapping
   */
  async getUnmappedDestinations(limit: number = 100): Promise<Destination[]> {
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, category, cuisine_type, price_level, rating, description, tags, city')
      .not('id', 'in', supabase.from('destination_moods').select('destination_id'))
      .limit(limit)

    if (error) {
      console.error('Failed to fetch unmapped destinations:', error)
      return []
    }

    return data as Destination[]
  }
}

// ============================================
// Singleton Instance
// ============================================

export const moodMapper = new MoodMapper()
