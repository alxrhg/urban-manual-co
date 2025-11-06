import { BaseAgent, AgentState } from '../lib/base-agent.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const REFACTORING_SYSTEM_PROMPT = `You are an expert software refactoring specialist with deep knowledge of code quality and design patterns.

Your responsibilities:
1. Identify code smells and suggest refactorings
2. Apply design patterns where appropriate
3. Improve code readability and maintainability
4. Optimize performance without changing behavior
5. Reduce code duplication (DRY principle)
6. Improve error handling and edge cases
7. Ensure refactored code follows language/framework best practices

Refactoring principles:
- **Preserve behavior**: Refactored code must work exactly the same
- **Small steps**: Make incremental, focused changes
- **Tests**: Ensure tests still pass after refactoring
- **Readability**: Code should be clearer after refactoring
- **Performance**: Avoid performance regressions
- **Maintainability**: Make code easier to extend and modify

Common refactoring patterns:
- Extract function/method
- Extract variable
- Rename for clarity
- Remove duplication
- Simplify conditionals
- Replace magic numbers with constants
- Apply design patterns (Strategy, Factory, etc.)
- Improve error handling
- Add type safety

Output format:
# Refactoring Report

## Analysis
[Explanation of identified issues and refactoring opportunities]

## Proposed Refactorings
[List of specific refactorings to apply]

## Refactored Code
\`\`\`[language]
[Complete refactored code]
\`\`\`

## Changes Made
1. [Description of change 1]
2. [Description of change 2]
...

## Benefits
[Expected improvements from refactoring]

## Testing Recommendations
[Suggested tests to verify behavior is preserved]

Be careful, precise, and ensure the refactored code is production-ready.`;

interface RefactoringContext {
  sourceCode: string;
  fileName: string;
  language: string;
  focusAreas?: string[];
  existingTests?: string;
}

interface RefactoringResult {
  original: string;
  refactored: string;
  analysis: string;
  changes: string[];
  benefits: string[];
}

export class RefactoringAgent extends BaseAgent {
  constructor() {
    super({
      name: 'RefactoringAgent',
      description: 'Refactors code to improve quality and maintainability',
      systemPrompt: REFACTORING_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for consistent, safe refactorings
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    return 'finalize';
  }

  async refactorFile(
    filePath: string,
    options: {
      focusAreas?: string[];
      preserveComments?: boolean;
      aggressiveRefactoring?: boolean;
    } = {}
  ): Promise<RefactoringResult> {
    console.log(`🔧 Refactoring: ${filePath}`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const language = this.detectLanguage(fileName);

    // Check for existing tests
    let existingTests: string | undefined;
    const testPath = this.findTestFile(filePath);
    if (testPath && existsSync(testPath)) {
      console.log(`📋 Found tests: ${testPath}`);
      existingTests = readFileSync(testPath, 'utf-8');
    }

    const context: RefactoringContext = {
      sourceCode,
      fileName,
      language,
      focusAreas: options.focusAreas,
      existingTests,
    };

    const prompt = this.buildRefactoringPrompt(context, options);

    console.log('🤖 Analyzing and refactoring with AI...');

    const report = await this.execute(prompt, {
      filePath,
      language,
      ...options,
    });

    const result = this.parseRefactoringReport(report, sourceCode);

    console.log(`✅ Refactoring complete!`);
    console.log(`   Changes made: ${result.changes.length}`);
    console.log(`   Expected benefits: ${result.benefits.length}`);

    return result;
  }

  private detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      rs: 'Rust',
    };
    return languageMap[ext || ''] || 'Unknown';
  }

  private findTestFile(filePath: string): string | null {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    const name = basename(filePath, filePath.substring(filePath.lastIndexOf('.')));

    const testPatterns = [
      `${dir}/${name}.test.ts`,
      `${dir}/${name}.test.js`,
      `${dir}/${name}.spec.ts`,
      `${dir}/${name}.spec.js`,
      `${dir}/__tests__/${name}.test.ts`,
      `${dir}/__tests__/${name}.test.js`,
    ];

    for (const pattern of testPatterns) {
      if (existsSync(pattern)) {
        return pattern;
      }
    }

    return null;
  }

  private buildRefactoringPrompt(context: RefactoringContext, options: any): string {
    let prompt = `Refactor the following ${context.language} code to improve quality:\n\n`;
    prompt += `**File:** ${context.fileName}\n\n`;
    prompt += `**Current Code:**\n\`\`\`${context.language.toLowerCase()}\n${context.sourceCode}\n\`\`\`\n\n`;

    if (context.existingTests) {
      prompt += `**Existing Tests:**\n\`\`\`${context.language.toLowerCase()}\n${context.existingTests.slice(0, 2000)}\n\`\`\`\n\n`;
      prompt += `IMPORTANT: The refactored code must pass all existing tests. Do not change behavior.\n\n`;
    }

    if (context.focusAreas && context.focusAreas.length > 0) {
      prompt += `**Focus Areas:** ${context.focusAreas.join(', ')}\n\n`;
      prompt += `Pay special attention to these aspects when refactoring.\n\n`;
    }

    prompt += `Refactoring goals:\n`;
    prompt += `1. Improve code readability and clarity\n`;
    prompt += `2. Remove code duplication (DRY)\n`;
    prompt += `3. Simplify complex logic\n`;
    prompt += `4. Add type safety where missing\n`;
    prompt += `5. Improve error handling\n`;
    prompt += `6. Apply appropriate design patterns\n`;

    if (options.preserveComments) {
      prompt += `7. Preserve existing comments\n`;
    }

    if (options.aggressiveRefactoring) {
      prompt += `\nBe aggressive with refactoring. Suggest major structural changes if beneficial.\n`;
    } else {
      prompt += `\nFocus on safe, incremental refactorings.\n`;
    }

    prompt += `\nProvide the complete refactored code and explain all changes made.`;

    return prompt;
  }

  private parseRefactoringReport(report: string, originalCode: string): RefactoringResult {
    // Extract refactored code
    const codeMatch = report.match(/```[\w]*\n([\s\S]*?)```/);
    const refactored = codeMatch ? codeMatch[1].trim() : originalCode;

    // Extract analysis
    const analysisMatch = report.match(/## Analysis\s*\n([\s\S]*?)(?=\n## )/);
    const analysis = analysisMatch ? analysisMatch[1].trim() : '';

    // Extract changes
    const changesMatch = report.match(/## Changes Made\s*\n([\s\S]*?)(?=\n## |$)/);
    const changesText = changesMatch ? changesMatch[1] : '';
    const changes = changesText
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    // Extract benefits
    const benefitsMatch = report.match(/## Benefits\s*\n([\s\S]*?)(?=\n## |$)/);
    const benefitsText = benefitsMatch ? benefitsMatch[1] : '';
    const benefits = benefitsText
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());

    return {
      original: originalCode,
      refactored,
      analysis,
      changes,
      benefits,
    };
  }

  async saveRefactored(
    originalPath: string,
    refactoredCode: string,
    options: {
      backup?: boolean;
      suffix?: string;
    } = {}
  ): Promise<string> {
    // Create backup if requested
    if (options.backup) {
      const backupPath = `${originalPath}.backup`;
      const original = readFileSync(originalPath, 'utf-8');
      writeFileSync(backupPath, original, 'utf-8');
      console.log(`💾 Backup saved to: ${backupPath}`);
    }

    // Save refactored code
    const outputPath = options.suffix
      ? originalPath.replace(/(\.[^.]+)$/, `.${options.suffix}$1`)
      : originalPath;

    writeFileSync(outputPath, refactoredCode, 'utf-8');
    console.log(`💾 Saved refactored code to: ${outputPath}`);

    return outputPath;
  }

  async generateRefactoringReport(result: RefactoringResult): Promise<string> {
    let report = `# Refactoring Report\n\n`;
    report += `## Analysis\n\n${result.analysis}\n\n`;

    if (result.changes.length > 0) {
      report += `## Changes Made\n\n`;
      result.changes.forEach((change, i) => {
        report += `${i + 1}. ${change}\n`;
      });
      report += `\n`;
    }

    if (result.benefits.length > 0) {
      report += `## Benefits\n\n`;
      result.benefits.forEach(benefit => {
        report += `- ${benefit}\n`;
      });
      report += `\n`;
    }

    // Calculate metrics
    const originalLines = result.original.split('\n').length;
    const refactoredLines = result.refactored.split('\n').length;
    const lineChange = refactoredLines - originalLines;
    const changePercent = ((lineChange / originalLines) * 100).toFixed(1);

    report += `## Metrics\n\n`;
    report += `- **Original Lines:** ${originalLines}\n`;
    report += `- **Refactored Lines:** ${refactoredLines}\n`;
    report += `- **Change:** ${lineChange > 0 ? '+' : ''}${lineChange} (${changePercent}%)\n`;
    report += `- **Changes Count:** ${result.changes.length}\n\n`;

    report += `## Diff Preview\n\n`;
    report += `### Before (first 20 lines)\n\`\`\`\n`;
    report += result.original.split('\n').slice(0, 20).join('\n');
    report += `\n...\n\`\`\`\n\n`;
    report += `### After (first 20 lines)\n\`\`\`\n`;
    report += result.refactored.split('\n').slice(0, 20).join('\n');
    report += `\n...\n\`\`\`\n\n`;

    return report;
  }

  async suggestRefactorings(filePath: string): Promise<string[]> {
    console.log(`💡 Suggesting refactorings for: ${filePath}`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const language = this.detectLanguage(fileName);

    const prompt = `Analyze this ${language} code and suggest specific refactorings:\n\n` +
      `\`\`\`${language.toLowerCase()}\n${sourceCode}\n\`\`\`\n\n` +
      `List 5-10 concrete refactoring suggestions. For each suggestion, provide:\n` +
      `1. Brief title\n` +
      `2. Description of the issue\n` +
      `3. Proposed solution\n\n` +
      `Format as a numbered list.`;

    const response = await this.execute(prompt, { filePath });

    // Parse suggestions
    const suggestions = response
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    console.log(`✅ Found ${suggestions.length} refactoring suggestions`);

    return suggestions;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage:');
    console.error('  tsx refactoring-agent.ts refactor <file-path> [focus-areas]');
    console.error('  tsx refactoring-agent.ts suggest <file-path>');
    console.error('\nFocus areas: readability, performance, dry, types, error-handling');
    console.error('\nExamples:');
    console.error('  tsx refactoring-agent.ts refactor ../src/lib/utils.ts readability,dry');
    console.error('  tsx refactoring-agent.ts suggest ../src/lib/utils.ts');
    process.exit(1);
  }

  const [command, filePath, focusAreasStr] = args;
  const focusAreas = focusAreasStr ? focusAreasStr.split(',') : undefined;

  const agent = new RefactoringAgent();

  if (command === 'refactor') {
    agent
      .refactorFile(filePath, { focusAreas, preserveComments: true })
      .then(async result => {
        console.log('\n🔧 Refactoring Report:\n');
        console.log('─'.repeat(80));

        const report = await agent.generateRefactoringReport(result);
        console.log(report);

        console.log('\n💾 Save refactored code? [y/n]');
        // In real CLI, would prompt for input
        console.log('   Use agent.saveRefactored() to save the result');
        console.log('   With backup: await agent.saveRefactored(filePath, result.refactored, { backup: true })');

        console.log('─'.repeat(80));
      })
      .catch(error => {
        console.error('❌ Error during refactoring:', error);
        process.exit(1);
      });
  } else if (command === 'suggest') {
    agent
      .suggestRefactorings(filePath)
      .then(suggestions => {
        console.log('\n💡 Refactoring Suggestions:\n');
        console.log('─'.repeat(80));
        suggestions.forEach((suggestion, i) => {
          console.log(`${i + 1}. ${suggestion}`);
        });
        console.log('─'.repeat(80));
        console.log(`\n✅ ${suggestions.length} suggestions`);
        console.log('\nTo apply refactorings:');
        console.log(`  tsx refactoring-agent.ts refactor ${filePath}`);
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else {
    console.error('Unknown command:', command);
    process.exit(1);
  }
}
