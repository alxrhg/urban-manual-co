import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'

/**
 * Get PostgreSQL connection string from environment variables
 * Supports multiple formats:
 * 1. Direct POSTGRES_URL or DATABASE_URL
 * 2. Constructed from Supabase URL + password
 */
function getPostgresConnectionString(): string {
  // First, try direct connection string
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL
  }
  
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // If not available, try to construct from Supabase URL
  // This requires SUPABASE_DB_PASSWORD to be set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (supabaseUrl && dbPassword) {
    try {
      const url = new URL(supabaseUrl)
      // Extract project ref from Supabase URL (e.g., xyzabc123.supabase.co -> xyzabc123)
      const projectRef = url.hostname.split('.')[0]
      
      // Use connection pooling (recommended for serverless)
      return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    } catch (error) {
      console.error('Error constructing PostgreSQL URL from Supabase URL:', error)
    }
  }

  // Fallback: return empty string (will cause error with helpful message)
  console.error(`
    ⚠️  PostgreSQL connection string not found!
    
    Please set one of the following environment variables:
    
    Option 1 (Recommended): Set POSTGRES_URL directly
      POSTGRES_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    
    Option 2: Set SUPABASE_DB_PASSWORD (will construct from NEXT_PUBLIC_SUPABASE_URL)
      SUPABASE_DB_PASSWORD=your-database-password
    
    To get your connection string from Supabase:
    1. Go to https://supabase.com/dashboard
    2. Select your project
    3. Go to Settings → Database
    4. Copy the "Connection string" under "Connection pooling"
    5. Use the "Transaction" mode connection string (port 6543)
  `)
  
  return ''
}

export default buildConfig({
  admin: {
    user: 'users',
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'User', value: 'user' },
          ],
          defaultValue: 'user',
          required: true,
        },
      ],
    },
    {
      slug: 'destinations',
      admin: {
        useAsTitle: 'name',
        description: 'Manage destinations from Supabase. Changes sync to Supabase automatically.',
      },
      // Use existing Supabase table - don't create new one
      dbName: 'destinations',
      access: {
        read: () => true,
        create: () => true,
        update: () => true,
        delete: () => true,
      },
      hooks: {
        afterChange: [
          async ({ doc, operation, req }: { doc: any; operation: 'create' | 'update'; req: any }) => {
            // Sync changes to Supabase after Payload operations
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (!supabaseUrl || !supabaseKey) {
                console.warn('[Payload] Supabase credentials not found, skipping sync')
                return
              }

              // Import Supabase client dynamically
              const { createClient } = await import('@supabase/supabase-js')
              const supabase = createClient(supabaseUrl, supabaseKey)

              // Map Payload fields to Supabase columns
              const supabaseData: any = {
                name: doc.name,
                slug: doc.slug,
                city: doc.city,
                category: doc.category,
                description: doc.description || null,
                content: doc.content ? (typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)) : null,
                image: doc.image || null,
                latitude: doc.latitude || null,
                longitude: doc.longitude || null,
                michelin_stars: doc.michelin_stars || 0,
                crown: doc.crown || false,
                rating: doc.rating || null,
                price_level: doc.price_level || null,
              }

              if (operation === 'create') {
                const { error } = await supabase
                  .from('destinations')
                  .insert([supabaseData])
                
                if (error) {
                  console.error('[Payload] Error syncing to Supabase (create):', error)
                } else {
                  console.log(`[Payload] ✅ Synced new destination "${doc.name}" to Supabase`)
                }
              } else if (operation === 'update') {
                const { error } = await supabase
                  .from('destinations')
                  .update(supabaseData)
                  .eq('slug', doc.slug)
                
                if (error) {
                  console.error('[Payload] Error syncing to Supabase (update):', error)
                } else {
                  console.log(`[Payload] ✅ Synced updated destination "${doc.name}" to Supabase`)
                }
              }
            } catch (error) {
              console.error('[Payload] Error in afterChange hook:', error)
            }
          },
        ],
        afterDelete: [
          async ({ doc, req }: { doc: any; req: any }) => {
            // Sync deletion to Supabase
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (!supabaseUrl || !supabaseKey) {
                console.warn('[Payload] Supabase credentials not found, skipping sync')
                return
              }

              const { createClient } = await import('@supabase/supabase-js')
              const supabase = createClient(supabaseUrl, supabaseKey)

              const { error } = await supabase
                .from('destinations')
                .delete()
                .eq('slug', doc.slug)
              
              if (error) {
                console.error('[Payload] Error syncing deletion to Supabase:', error)
              } else {
                console.log(`[Payload] ✅ Synced deletion of "${doc.name}" to Supabase`)
              }
            } catch (error) {
              console.error('[Payload] Error in afterDelete hook:', error)
            }
          },
        ],
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'category',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'content',
          type: 'richText',
          editor: lexicalEditor(),
        },
        {
          name: 'image',
          type: 'text', // Store URL string, not upload relation
          admin: {
            description: 'Image URL from Supabase',
          },
        },
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
        {
          name: 'michelin_stars',
          type: 'number',
          min: 0,
          max: 3,
        },
        {
          name: 'crown',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
        },
        {
          name: 'price_level',
          type: 'number',
          min: 1,
          max: 4,
        },
      ],
    },
    {
      slug: 'media',
      access: {
        read: () => true,
      },
      upload: true,
      fields: [
        {
          name: 'alt',
          type: 'text',
        },
      ],
    },
  ],
  db: postgresAdapter({
    pool: {
      connectionString: getPostgresConnectionString(),
    },
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(process.cwd(), 'payload-types.ts'),
  },
})

