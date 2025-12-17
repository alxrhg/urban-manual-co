/**
 * Architecture Enrichment Service
 * Handles enrichment of architecture data from various sources
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy Supabase client to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface ArchitectEnrichmentData {
  bio?: string;
  birth_year?: number;
  death_year?: number;
  nationality?: string;
  design_philosophy?: string;
  notable_works?: string[];
  movements?: string[];
  influences?: string[];
  image_url?: string;
}

export interface MovementEnrichmentData {
  description?: string;
  period_start?: number;
  period_end?: number;
  key_characteristics?: string[];
  notable_architects?: string[];
  image_url?: string;
}

/**
 * Enrich architect with additional data
 * This would typically call external APIs or databases
 */
export async function enrichArchitect(
  architectId: string,
  data: ArchitectEnrichmentData
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.bio) updateData.bio = data.bio;
  if (data.birth_year) updateData.birth_year = data.birth_year;
  if (data.death_year) updateData.death_year = data.death_year;
  if (data.nationality) updateData.nationality = data.nationality;
  if (data.design_philosophy) updateData.design_philosophy = data.design_philosophy;
  if (data.notable_works) updateData.notable_works = data.notable_works;
  if (data.movements) updateData.movements = data.movements;
  if (data.influences) updateData.influences = data.influences;
  if (data.image_url) updateData.image_url = data.image_url;

  updateData.updated_at = new Date().toISOString();

  const { error } = await getSupabase()
    .from('architects')
    .update(updateData)
    .eq('id', architectId);

  if (error) {
    throw new Error(`Failed to enrich architect: ${error.message}`);
  }
}

/**
 * Enrich design movement with additional data
 */
export async function enrichMovement(
  movementId: string,
  data: MovementEnrichmentData
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.description) updateData.description = data.description;
  if (data.period_start) updateData.period_start = data.period_start;
  if (data.period_end !== undefined) updateData.period_end = data.period_end;
  if (data.key_characteristics) updateData.key_characteristics = data.key_characteristics;
  if (data.notable_architects) updateData.notable_architects = data.notable_architects;
  if (data.image_url) updateData.image_url = data.image_url;

  updateData.updated_at = new Date().toISOString();

  const { error } = await getSupabase()
    .from('design_movements')
    .update(updateData)
    .eq('id', movementId);

  if (error) {
    throw new Error(`Failed to enrich movement: ${error.message}`);
  }
}

/**
 * Extract materials from destination description
 * Simple keyword-based extraction (can be enhanced with NLP)
 */
export function extractMaterials(description: string): string[] {
  const materialKeywords: Record<string, string> = {
    'concrete': 'concrete',
    'glass': 'glass',
    'steel': 'steel',
    'wood': 'wood',
    'wooden': 'wood',
    'stone': 'stone',
    'brick': 'brick',
    'marble': 'marble',
    'copper': 'copper',
    'brass': 'steel', // Map to steel for now
    'aluminum': 'steel',
  };

  const found: Set<string> = new Set();
  const lowerDescription = description.toLowerCase();

  for (const [keyword, material] of Object.entries(materialKeywords)) {
    if (lowerDescription.includes(keyword)) {
      found.add(material);
    }
  }

  return Array.from(found);
}

/**
 * Link materials to destination
 */
export async function linkMaterialsToDestination(
  destinationId: number,
  materialSlugs: string[]
): Promise<void> {
  // Get material IDs
  const supabase = getSupabase();
  const { data: materials, error: fetchError } = await supabase
    .from('materials')
    .select('id')
    .in('slug', materialSlugs);

  if (fetchError || !materials) {
    throw new Error(`Failed to fetch materials: ${fetchError?.message}`);
  }

  // Delete existing links
  await supabase
    .from('destination_materials')
    .delete()
    .eq('destination_id', destinationId);

  // Create new links
  if (materials.length > 0) {
    const links = materials.map(m => ({
      destination_id: destinationId,
      material_id: m.id,
    }));

    const { error: insertError } = await supabase
      .from('destination_materials')
      .insert(links);

    if (insertError) {
      throw new Error(`Failed to link materials: ${insertError.message}`);
    }
  }
}

/**
 * Enrich destination with architecture data
 */
export async function enrichDestinationArchitecture(
  destinationId: number,
  data: {
    architectural_significance?: string;
    design_story?: string;
    construction_year?: number;
    renovation_history?: Record<string, unknown>;
    design_awards?: Record<string, unknown>;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (data.architectural_significance) {
    updateData.architectural_significance = data.architectural_significance;
  }
  if (data.design_story) {
    updateData.design_story = data.design_story;
  }
  if (data.construction_year) {
    updateData.construction_year = data.construction_year;
  }
  if (data.renovation_history) {
    updateData.renovation_history = data.renovation_history;
  }
  if (data.design_awards) {
    updateData.design_awards = data.design_awards;
  }

  updateData.last_enriched_at = new Date().toISOString();

  const { error } = await getSupabase()
    .from('destinations')
    .update(updateData)
    .eq('id', destinationId);

  if (error) {
    throw new Error(`Failed to enrich destination architecture: ${error.message}`);
  }
}

