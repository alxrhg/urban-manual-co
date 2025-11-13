import { generateDestinationEmbedding } from '@/lib/embeddings/generate';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function updateDestinationEmbeddingById(destinationId: string, text: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const embedding = await generateDestinationEmbedding({
    name: text,
    content: text,
  }, { versionTag: 'intelligence-service' });
  const { error } = await supabase
    .from('destinations')
    .update({
      vector_embedding: Array.from(embedding.vector) as unknown as any,
      embedding_model: embedding.metadata.model,
      embedding_generated_at: embedding.metadata.generatedAt,
      embedding_metadata: embedding.metadata,
    })
    .eq('id', destinationId);
  return !error;
}

export async function updateDestinationEmbeddingBySlug(slug: string, text: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;
  const embedding = await generateDestinationEmbedding({
    name: text,
    content: text,
  }, { versionTag: 'intelligence-service' });
  const { error } = await supabase
    .from('destinations')
    .update({
      vector_embedding: Array.from(embedding.vector) as unknown as any,
      embedding_model: embedding.metadata.model,
      embedding_generated_at: embedding.metadata.generatedAt,
      embedding_metadata: embedding.metadata,
    })
    .eq('slug', slug);
  return !error;
}


