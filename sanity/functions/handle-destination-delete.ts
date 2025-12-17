/**
 * Sanity Function: Handle Destination Delete
 *
 * This function handles destination document deletion events.
 * It logs the deletion for audit purposes but doesn't remove from Supabase
 * to maintain data integrity (soft delete approach).
 *
 * Test locally: npx sanity functions test handle-destination-delete
 * Deploy: npx sanity blueprints deploy
 */

import { documentEventHandler } from '@sanity/functions';

interface DeletedDestination {
  _id: string;
  slug?: { _type: 'slug'; current: string } | string;
}

export const handler = documentEventHandler<DeletedDestination>(async ({ event }) => {
  const doc = event.data;
  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current || doc._id;

  console.log(`[Sanity Function] Destination deleted: ${slug} (${doc._id})`);

  // Log deletion for audit purposes
  // Note: We don't delete from Supabase to maintain data integrity
  // This allows for soft delete patterns and data recovery

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      // Log to audit table if it exists
      const auditUrl = `${supabaseUrl}/rest/v1/content_audit_log`;
      await fetch(auditUrl, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          action: 'delete',
          document_id: doc._id,
          slug,
          source: 'sanity_function',
          created_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      // Audit log table may not exist - just log to console
      console.log(`[Sanity Function] Audit log entry for deletion: ${slug}`);
    }
  }

  // Log result
  console.log(`[Sanity Function] Deletion logged for ${slug} (${doc._id}). Supabase record retained.`);
});
