import { BaseAgent, AgentState } from '../lib/base-agent.js';
import { HumanMessage } from '@langchain/core/messages';
import { AI_CONFIG } from '../config.js';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATION_SYSTEM_PROMPT = `You are an expert database migration generator for Supabase/PostgreSQL projects.

Your responsibilities:
1. Analyze the existing database schema from previous migrations
2. Generate SQL migrations based on user requirements
3. Follow Supabase best practices (RLS policies, indexes, constraints)
4. Ensure migrations are idempotent and safe
5. Include both UP and DOWN migrations
6. Add helpful comments to explain complex changes

When generating migrations:
- Use proper transaction blocks
- Include IF NOT EXISTS / IF EXISTS checks
- Create appropriate indexes for foreign keys and frequently queried columns
- Set up Row Level Security (RLS) policies for tables
- Use PostgreSQL best practices (proper data types, constraints)
- Follow the naming convention: YYYYMMDDHHMMSS_description.sql

Output only the SQL migration code, without markdown formatting or explanation text.
The migration should be production-ready and executable.`;

interface MigrationContext {
  existingMigrations: string[];
  schemaInfo: string;
  targetPath: string;
}

export class MigrationGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'MigrationGenerator',
      description: 'Generates Supabase database migrations automatically',
      systemPrompt: MIGRATION_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for more consistent code generation
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    // Always finalize after first iteration for migration generation
    return 'finalize';
  }

  async generateMigration(
    description: string,
    requirements: string,
    options: {
      migrationsPath?: string;
      schemaPath?: string;
    } = {}
  ): Promise<{ fileName: string; content: string }> {
    const migrationsPath = options.migrationsPath || join(process.cwd(), '..', 'supabase', 'migrations');
    const schemaPath = options.schemaPath || join(process.cwd(), '..', 'src', 'db', 'schema.ts');

    // Gather context
    const context = this.gatherContext(migrationsPath, schemaPath);

    // Build prompt
    const prompt = this.buildPrompt(description, requirements, context);

    console.log('🔍 Analyzing existing schema...');
    console.log(`📁 Found ${context.existingMigrations.length} existing migrations`);
    console.log('🤖 Generating migration with AI agent...');

    // Execute agent
    const migrationSQL = await this.execute(prompt, {
      description,
      migrationsPath,
      schemaPath,
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const slug = description.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const fileName = `${timestamp}_${slug}.sql`;

    console.log(`✅ Migration generated: ${fileName}`);

    return {
      fileName,
      content: this.cleanMigrationOutput(migrationSQL),
    };
  }

  private gatherContext(migrationsPath: string, schemaPath: string): MigrationContext {
    let existingMigrations: string[] = [];
    let schemaInfo = '';

    // Read existing migrations
    try {
      const files = readdirSync(migrationsPath);
      existingMigrations = files
        .filter(f => f.endsWith('.sql'))
        .sort()
        .slice(-5); // Get last 5 migrations for context
    } catch (error) {
      console.warn('⚠️  Could not read migrations directory:', migrationsPath);
    }

    // Read schema file
    try {
      schemaInfo = readFileSync(schemaPath, 'utf-8');
      // Truncate if too long
      if (schemaInfo.length > 10000) {
        schemaInfo = schemaInfo.slice(0, 10000) + '\n... (truncated)';
      }
    } catch (error) {
      console.warn('⚠️  Could not read schema file:', schemaPath);
    }

    return {
      existingMigrations,
      schemaInfo,
      targetPath: migrationsPath,
    };
  }

  private buildPrompt(description: string, requirements: string, context: MigrationContext): string {
    let prompt = `Generate a PostgreSQL migration for Supabase with the following requirements:\n\n`;
    prompt += `**Description:** ${description}\n\n`;
    prompt += `**Requirements:**\n${requirements}\n\n`;

    if (context.existingMigrations.length > 0) {
      prompt += `**Recent Migrations (for context):**\n`;
      prompt += context.existingMigrations.join(', ') + '\n\n';
    }

    if (context.schemaInfo) {
      prompt += `**Current Schema (Drizzle ORM):**\n\`\`\`typescript\n${context.schemaInfo}\n\`\`\`\n\n`;
    }

    prompt += `Generate the SQL migration code now. Include:
1. Transaction block (BEGIN/COMMIT)
2. IF NOT EXISTS checks where appropriate
3. Proper indexes for performance
4. RLS policies if creating tables
5. Comments explaining the changes
6. Both UP migration and DOWN migration sections (commented out)

Output only the SQL code, nothing else.`;

    return prompt;
  }

  private cleanMigrationOutput(output: string): string {
    // Remove markdown code fences if present
    let cleaned = output.replace(/```sql\n?/g, '').replace(/```\n?/g, '');

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Ensure it starts with BEGIN or a comment
    if (!cleaned.startsWith('BEGIN') && !cleaned.startsWith('--')) {
      cleaned = '-- Generated migration\nBEGIN;\n\n' + cleaned + '\n\nCOMMIT;';
    }

    return cleaned;
  }

  async saveMigration(fileName: string, content: string, targetPath?: string): Promise<string> {
    const migrationsPath = targetPath || join(process.cwd(), '..', 'supabase', 'migrations');
    const fullPath = join(migrationsPath, fileName);

    writeFileSync(fullPath, content, 'utf-8');
    console.log(`💾 Saved migration to: ${fullPath}`);

    return fullPath;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx migration-generator.ts <description> <requirements>');
    console.error('Example: tsx migration-generator.ts "Add user preferences" "Create a user_preferences table with columns: user_id (uuid, FK to users), theme (text), language (text)"');
    process.exit(1);
  }

  const [description, requirements] = args;

  const generator = new MigrationGenerator();

  generator
    .generateMigration(description, requirements)
    .then(async ({ fileName, content }) => {
      console.log('\n📝 Generated Migration:\n');
      console.log('─'.repeat(80));
      console.log(content);
      console.log('─'.repeat(80));
      console.log('\n💾 Saving migration...');

      await generator.saveMigration(fileName, content);

      console.log('\n✅ Done! You can now apply the migration with:');
      console.log(`   supabase migration up`);
    })
    .catch(error => {
      console.error('❌ Error generating migration:', error);
      process.exit(1);
    });
}
