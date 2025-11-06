# Urban Manual AI Agents 🤖

Autonomous AI agents powered by **LangGraph** and **Claude Sonnet** (most admired LLM in Stack Overflow 2025 Survey!) for automating repetitive development tasks in the Urban Manual project.

## Features

### 🗃️ Migration Generator
Automatically generates Supabase/PostgreSQL database migrations:
- Analyzes existing schema and migrations
- Generates idempotent, production-ready SQL
- Follows Supabase best practices (RLS, indexes, constraints)
- Includes both UP and DOWN migrations
- Adds helpful comments

### 🧪 Test Generator
Automatically generates comprehensive test suites:
- Unit tests, integration tests, and E2E tests
- Supports Vitest, Jest, and Playwright
- Tests happy paths, edge cases, and error scenarios
- Follows testing best practices (AAA pattern, proper mocking)
- Extends existing tests when present

### 🔮 Future Agents
- **Code Review Agent**: Automated code reviews with suggestions
- **Documentation Agent**: Generate README and API docs
- **Refactoring Agent**: Suggest and apply refactorings
- **Performance Agent**: Identify and fix performance issues

## Why AI Agents?

Based on Stack Overflow 2025 Survey:
- **69% of AI agent users** report increased productivity
- **70% agree** agents reduce time on specific development tasks
- **63% agree** agents help automate repetitive tasks

## Technology Stack

- **LangGraph** - Agent orchestration framework
- **LangChain** - LLM integration and tools
- **Claude Sonnet** - Primary LLM (67.5% admired, #1 in survey!)
- **OpenAI GPT-4** - Fallback LLM
- **TypeScript** - Type-safe agent development
- **Commander** - CLI interface

## Installation

### Prerequisites

```bash
# Node.js 18+
node --version

# npm or pnpm
npm --version
```

### Setup

```bash
cd ai-agents

# Install dependencies
npm install

# Or use pnpm
pnpm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys
# Recommended: Get Anthropic API key for Claude Sonnet
nano .env
```

### Get API Keys

**Option 1: Anthropic Claude (Recommended)**
1. Visit https://console.anthropic.com/
2. Sign up and create API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

**Option 2: OpenAI (Fallback)**
1. Visit https://platform.openai.com/
2. Create API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

**Database**
- Use your existing `DATABASE_URL` or `POSTGRES_URL` from Supabase

## Usage

### CLI Commands

The `urban-agent` CLI provides easy access to all agents:

```bash
# Check configuration
npm run agent config

# Generate migration
npm run agent migrate <description> <requirements>

# Generate tests
npm run agent test <source-file>

# Generate tests for directory
npm run agent test-dir <directory>
```

### Migration Generator

#### Basic Usage

```bash
# Generate a migration
npm run agent migrate \
  "Add user preferences table" \
  "Create user_preferences table with user_id (uuid FK), theme (text), language (text), timezone (text)"
```

#### Advanced Usage

```bash
# Specify custom paths
npm run agent migrate \
  "Add indexes for performance" \
  "Add indexes on destinations table for city and category columns" \
  --path ../supabase/migrations \
  --schema ../src/db/schema.ts
```

#### Programmatic Usage

```typescript
import { MigrationGenerator } from './agents/migration-generator.js';

const generator = new MigrationGenerator();

const { fileName, content } = await generator.generateMigration(
  'Add user analytics',
  `Create a user_analytics table with:
   - id (uuid primary key)
   - user_id (uuid FK to users)
   - event_type (text)
   - event_data (jsonb)
   - created_at (timestamptz)

   Add indexes on user_id and created_at.
   Set up RLS policies.`
);

// Save the migration
await generator.saveMigration(fileName, content);

console.log('Migration created:', fileName);
```

#### Example Output

```sql
-- Generated migration for user preferences
BEGIN;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

COMMIT;

-- DOWN migration (uncomment to rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- COMMIT;
```

### Test Generator

#### Basic Usage

```bash
# Generate unit tests for a file
npm run agent test ../src/lib/utils.ts

# Generate integration tests
npm run agent test ../src/api/destinations.ts --type integration

# Generate E2E tests
npm run agent test ../src/pages/home.tsx --type e2e --framework playwright
```

#### Batch Generate Tests

```bash
# Generate tests for all files in a directory
npm run agent test-dir ../src/lib --type unit --recursive

# Generate integration tests for API routes
npm run agent test-dir ../src/api --type integration
```

#### Programmatic Usage

```typescript
import { TestGenerator } from './agents/test-generator.js';

const generator = new TestGenerator();

// Generate tests for a single file
const { fileName, content } = await generator.generateTests(
  '../src/lib/date-utils.ts',
  {
    testType: 'unit',
    framework: 'vitest',
  }
);

// Save the tests
await generator.saveTests(fileName, content, '../src/lib/');

console.log('Tests created:', fileName);

// Generate tests for entire directory
const results = await generator.generateTestsForDirectory(
  '../src/lib',
  {
    testType: 'unit',
    framework: 'vitest',
    recursive: true,
  }
);

console.log(`Generated ${results.length} test files`);
```

#### Example Output

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { formatDate, parseDate, isValidDate } from './date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const result = formatDate(date, 'iso');
      expect(result).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should format date to readable string', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const result = formatDate(date, 'readable');
      expect(result).toBe('January 15, 2025');
    });

    it('should handle invalid dates', () => {
      const result = formatDate(new Date('invalid'), 'iso');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const result = parseDate('2025-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle invalid date strings', () => {
      const result = parseDate('not a date');
      expect(result).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date('2025-01-15'))).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });
  });
});
```

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Anthropic Claude (Primary - Recommended!)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI (Fallback)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Database
DATABASE_URL=postgresql://...

# Agent Settings
AGENT_VERBOSE=true          # Show detailed logs
AGENT_TEMPERATURE=0.7       # LLM creativity (0-1)
AGENT_MAX_ITERATIONS=10     # Max agent iterations
```

### Model Selection

The agents automatically prefer Claude Sonnet when available (most admired LLM!), falling back to OpenAI if needed.

**Why Claude Sonnet?**
- 67.5% admiration rate in Stack Overflow 2025 Survey
- Better at code generation and reasoning tasks
- More reliable outputs with fewer hallucinations
- Longer context window (200k tokens)

## Architecture

```
ai-agents/
├── src/
│   ├── agents/                    # Agent implementations
│   │   ├── migration-generator.ts # Database migration agent
│   │   └── test-generator.ts      # Test generation agent
│   ├── lib/
│   │   └── base-agent.ts          # Base agent class (LangGraph)
│   ├── config.ts                  # Configuration management
│   └── cli.ts                     # CLI interface
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Agent Flow (LangGraph)

```
START
  ↓
[Process Node]
  ↓
  Analyze context (schema, code, etc.)
  ↓
  Generate with LLM (Claude/OpenAI)
  ↓
  Validate output
  ↓
[Should Continue?]
  ├─→ Yes: Loop back to Process
  └─→ No: Continue to Finalize
      ↓
    [Finalize Node]
      ↓
    Clean and format output
      ↓
    END
```

## Development

### Running Agents Directly

```bash
# Run migration generator
tsx src/agents/migration-generator.ts "description" "requirements"

# Run test generator
tsx src/agents/test-generator.ts ../src/lib/utils.ts unit
```

### Creating Custom Agents

Extend the `BaseAgent` class:

```typescript
import { BaseAgent, AgentState } from '../lib/base-agent.js';

export class CustomAgent extends BaseAgent {
  constructor() {
    super({
      name: 'CustomAgent',
      description: 'Does something custom',
      systemPrompt: 'You are an expert at...',
      temperature: 0.5,
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    // Custom logic for multi-iteration agents
    return 'finalize';
  }

  async doSomething(input: string): Promise<string> {
    const result = await this.execute(input, { customContext: 'value' });
    return result;
  }
}
```

### Testing

```bash
# Run tests (when available)
npm test

# Run type checking
npm run type-check
```

## Performance

### Migration Generator

- **Average time**: 5-10 seconds per migration
- **Context analyzed**:
  - Last 5 migrations
  - Current schema file (~10KB)
  - Custom requirements

### Test Generator

- **Average time**: 8-15 seconds per file
- **Context analyzed**:
  - Source code (~5-10KB per file)
  - Existing tests (if present)
  - Import dependencies

### Cost Estimates

**Claude Sonnet:**
- Migration: ~$0.015 per generation
- Tests: ~$0.025 per file

**OpenAI GPT-4:**
- Migration: ~$0.020 per generation
- Tests: ~$0.030 per file

## Troubleshooting

### Agent fails with "Configuration error"

```bash
# Check your .env file
cat .env

# Ensure you have at least one API key
# ANTHROPIC_API_KEY or OPENAI_API_KEY

# Test configuration
npm run agent config
```

### "Context too long" errors

- Reduce the amount of context being sent
- Use more specific file paths
- Split large files into smaller modules

### Poor quality output

- Try adjusting `AGENT_TEMPERATURE` (0.3-0.7 recommended)
- Provide more specific requirements
- Use Claude Sonnet instead of GPT-4 (better for code)

### Import errors

```bash
# Ensure dependencies are installed
npm install

# Check Node.js version (need 18+)
node --version

# Try clearing cache
rm -rf node_modules package-lock.json
npm install
```

## Roadmap

### Phase 1: Core Agents ✅
- [x] Migration Generator
- [x] Test Generator
- [x] LangGraph infrastructure
- [x] CLI interface

### Phase 2: Enhanced Agents 🚧
- [ ] Code Review Agent
- [ ] Documentation Agent
- [ ] Refactoring Agent

### Phase 3: Integration 📅
- [ ] CI/CD integration
- [ ] GitHub Actions workflow
- [ ] VS Code extension
- [ ] Web UI dashboard

### Phase 4: Advanced Features 📅
- [ ] Multi-agent collaboration
- [ ] Learning from feedback
- [ ] Custom agent training
- [ ] Agent marketplace

## Best Practices

### When to Use Agents

**✅ Good use cases:**
- Generating boilerplate migrations
- Creating test scaffolding
- Documenting existing code
- Refactoring similar patterns

**❌ Not recommended for:**
- Critical business logic
- Security-sensitive code
- Complex algorithms (review carefully!)
- Production hotfixes (too slow)

### Review All Generated Code

**Always review and test generated code before committing!**

- Agents can make mistakes
- Test generated migrations on staging first
- Run generated tests to ensure they pass
- Adjust prompts for better output

### Iterative Improvement

1. Start with simple requirements
2. Review the output
3. Refine your prompt
4. Regenerate with better context
5. Build a library of effective prompts

## Contributing

1. Follow TypeScript best practices
2. Add tests for new agents
3. Update documentation
4. Test with both Claude and OpenAI

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain TypeScript](https://js.langchain.com/)
- [Claude API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs)

## License

Part of the Urban Manual project.

---

**Built with ❤️ using Claude Sonnet - The Most Admired LLM of 2025! 🏆**
