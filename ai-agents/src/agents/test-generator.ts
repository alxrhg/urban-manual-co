import { BaseAgent, AgentState } from '../lib/base-agent.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';

const TEST_SYSTEM_PROMPT = `You are an expert TypeScript test generator specializing in modern web applications.

Your responsibilities:
1. Analyze source code and generate comprehensive test suites
2. Follow testing best practices and patterns
3. Generate unit tests, integration tests, and E2E tests as appropriate
4. Use appropriate testing frameworks (Jest, Vitest, Playwright, etc.)
5. Ensure high code coverage and edge case handling
6. Write clear, maintainable test code with good descriptions

When generating tests:
- Use proper setup/teardown (beforeEach, afterEach, etc.)
- Mock external dependencies appropriately
- Test both happy paths and error cases
- Use descriptive test names (describe/it blocks)
- Follow AAA pattern (Arrange, Act, Assert)
- Include edge cases and boundary conditions
- Add comments for complex test scenarios

Output only the TypeScript test code, without markdown formatting or explanation text.
The tests should be production-ready and executable.`;

interface TestContext {
  sourceCode: string;
  sourceFileName: string;
  existingTests?: string;
  framework: 'jest' | 'vitest' | 'playwright';
}

export class TestGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'TestGenerator',
      description: 'Generates comprehensive test suites automatically',
      systemPrompt: TEST_SYSTEM_PROMPT,
      temperature: 0.4, // Slightly higher for more creative test scenarios
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    return 'finalize';
  }

  async generateTests(
    sourceFilePath: string,
    options: {
      testType?: 'unit' | 'integration' | 'e2e';
      framework?: 'jest' | 'vitest' | 'playwright';
      outputPath?: string;
    } = {}
  ): Promise<{ fileName: string; content: string }> {
    const testType = options.testType || 'unit';
    const framework = options.framework || 'vitest';

    console.log(`🔍 Analyzing source file: ${sourceFilePath}`);

    // Read source code
    if (!existsSync(sourceFilePath)) {
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }

    const sourceCode = readFileSync(sourceFilePath, 'utf-8');
    const sourceFileName = basename(sourceFilePath);

    // Check for existing tests
    const testFileName = this.generateTestFileName(sourceFilePath, testType);
    const testFilePath = options.outputPath
      ? join(options.outputPath, testFileName)
      : join(dirname(sourceFilePath), testFileName);

    let existingTests: string | undefined;
    if (existsSync(testFilePath)) {
      console.log(`📋 Found existing tests: ${testFilePath}`);
      existingTests = readFileSync(testFilePath, 'utf-8');
    }

    // Build context
    const context: TestContext = {
      sourceCode,
      sourceFileName,
      existingTests,
      framework,
    };

    // Build prompt
    const prompt = this.buildPrompt(testType, context);

    console.log(`🤖 Generating ${testType} tests with AI agent...`);

    // Execute agent
    const testCode = await this.execute(prompt, {
      sourceFilePath,
      testType,
      framework,
    });

    console.log(`✅ Tests generated: ${testFileName}`);

    return {
      fileName: testFileName,
      content: this.cleanTestOutput(testCode),
    };
  }

  private generateTestFileName(sourceFilePath: string, testType: string): string {
    const base = basename(sourceFilePath, '.ts');
    const ext = testType === 'e2e' ? '.e2e.ts' : '.test.ts';

    if (testType === 'e2e' && !sourceFilePath.includes('.e2e')) {
      return `${base}.e2e.spec.ts`;
    }

    return `${base}.test.ts`;
  }

  private buildPrompt(testType: string, context: TestContext): string {
    let prompt = `Generate comprehensive ${testType} tests for the following TypeScript code:\n\n`;
    prompt += `**Source File:** ${context.sourceFileName}\n\n`;
    prompt += `**Testing Framework:** ${context.framework}\n\n`;
    prompt += `**Source Code:**\n\`\`\`typescript\n${context.sourceCode}\n\`\`\`\n\n`;

    if (context.existingTests) {
      prompt += `**Existing Tests (extend these):**\n\`\`\`typescript\n${context.existingTests}\n\`\`\`\n\n`;
      prompt += `Please extend the existing tests with additional test cases, edge cases, and error scenarios.\n\n`;
    }

    prompt += `Generate ${testType} tests that:\n`;

    if (testType === 'unit') {
      prompt += `1. Test all exported functions/classes/components
2. Test happy paths and error cases
3. Test edge cases and boundary conditions
4. Mock external dependencies (database, APIs, etc.)
5. Use proper setup/teardown
6. Achieve high code coverage\n\n`;
    } else if (testType === 'integration') {
      prompt += `1. Test interactions between components/modules
2. Test API endpoints and data flows
3. Use realistic test data
4. Test error handling and edge cases
5. Mock only external services (not internal dependencies)\n\n`;
    } else if (testType === 'e2e') {
      prompt += `1. Test complete user flows
2. Test UI interactions and navigation
3. Test form submissions and validations
4. Test responsive behavior
5. Use Playwright best practices\n\n`;
    }

    prompt += `Output only the TypeScript test code, nothing else. Use ${context.framework} syntax.`;

    return prompt;
  }

  private cleanTestOutput(output: string): string {
    // Remove markdown code fences if present
    let cleaned = output.replace(/```typescript\n?/g, '').replace(/```ts\n?/g, '').replace(/```\n?/g, '');

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Ensure proper imports are present
    if (!cleaned.includes('import') && !cleaned.includes('describe')) {
      cleaned = `import { describe, it, expect, beforeEach, afterEach } from 'vitest';\n\n` + cleaned;
    }

    return cleaned;
  }

  async saveTests(fileName: string, content: string, targetPath?: string): Promise<string> {
    const testPath = targetPath
      ? join(targetPath, fileName)
      : join(process.cwd(), '..', 'src', fileName);

    writeFileSync(testPath, content, 'utf-8');
    console.log(`💾 Saved tests to: ${testPath}`);

    return testPath;
  }

  async generateTestsForDirectory(
    directoryPath: string,
    options: {
      testType?: 'unit' | 'integration';
      framework?: 'jest' | 'vitest';
      recursive?: boolean;
    } = {}
  ): Promise<{ fileName: string; content: string }[]> {
    const { readdirSync, statSync } = await import('fs');
    const results: { fileName: string; content: string }[] = [];

    const processDirectory = async (dirPath: string) => {
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && options.recursive) {
          await processDirectory(fullPath);
        } else if (stat.isFile() && entry.endsWith('.ts') && !entry.includes('.test.') && !entry.includes('.spec.')) {
          try {
            console.log(`\n📝 Processing: ${fullPath}`);
            const result = await this.generateTests(fullPath, options);
            results.push(result);
          } catch (error) {
            console.error(`❌ Failed to generate tests for ${fullPath}:`, error);
          }
        }
      }
    };

    await processDirectory(directoryPath);
    return results;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: tsx test-generator.ts <source-file-path> [unit|integration|e2e] [output-path]');
    console.error('Example: tsx test-generator.ts ../src/lib/utils.ts unit ../src/lib/');
    process.exit(1);
  }

  const [sourceFilePath, testType = 'unit', outputPath] = args;

  const generator = new TestGenerator();

  generator
    .generateTests(sourceFilePath, {
      testType: testType as 'unit' | 'integration' | 'e2e',
      outputPath,
    })
    .then(async ({ fileName, content }) => {
      console.log('\n📝 Generated Tests:\n');
      console.log('─'.repeat(80));
      console.log(content);
      console.log('─'.repeat(80));
      console.log('\n💾 Saving tests...');

      await generator.saveTests(fileName, content, outputPath);

      console.log('\n✅ Done! You can now run the tests with:');
      console.log(`   npm test ${fileName}`);
    })
    .catch(error => {
      console.error('❌ Error generating tests:', error);
      process.exit(1);
    });
}
