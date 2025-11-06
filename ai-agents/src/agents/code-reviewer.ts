import { BaseAgent, AgentState } from '../lib/base-agent.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const CODE_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software engineering best practices.

Your responsibilities:
1. Analyze code for bugs, security vulnerabilities, and performance issues
2. Check code quality, readability, and maintainability
3. Ensure adherence to best practices and design patterns
4. Suggest improvements and optimizations
5. Check for edge cases and error handling
6. Review test coverage and suggest additional tests

Review criteria:
- **Correctness**: Does the code work as intended? Any bugs or logic errors?
- **Security**: Any security vulnerabilities? SQL injection, XSS, auth issues?
- **Performance**: Any performance bottlenecks? O(n²) loops, memory leaks?
- **Readability**: Is the code clear and well-documented?
- **Maintainability**: Is it easy to modify and extend?
- **Testing**: Adequate test coverage? Edge cases handled?
- **Best Practices**: Following language/framework conventions?

Provide specific, actionable feedback with:
- Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
- Line numbers (if applicable)
- Explanation of the issue
- Suggested fix or improvement
- Code examples when helpful

Output format:
# Code Review Report

## Summary
[Brief overview of code quality and main findings]

## Issues Found

### CRITICAL Issues
[List critical issues that must be fixed immediately]

### HIGH Priority Issues
[Important issues that should be fixed soon]

### MEDIUM Priority Issues
[Issues that should be addressed when time permits]

### LOW Priority Issues
[Minor improvements and suggestions]

## Positive Aspects
[Things the code does well]

## Recommendations
[Overall suggestions for improvement]

Be constructive, specific, and helpful. Focus on teaching, not just finding faults.`;

interface ReviewContext {
  sourceCode: string;
  fileName: string;
  language: string;
  relatedFiles?: string[];
}

interface ReviewResult {
  summary: string;
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  report: string;
}

export class CodeReviewer extends BaseAgent {
  constructor() {
    super({
      name: 'CodeReviewer',
      description: 'Performs comprehensive code reviews with AI',
      systemPrompt: CODE_REVIEW_SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for consistent, thorough reviews
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    return 'finalize';
  }

  async reviewFile(
    filePath: string,
    options: {
      includeRelated?: boolean;
      focusAreas?: string[];
      outputPath?: string;
    } = {}
  ): Promise<ReviewResult> {
    console.log(`🔍 Reviewing: ${filePath}`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const language = this.detectLanguage(fileName);

    const context: ReviewContext = {
      sourceCode,
      fileName,
      language,
    };

    // Build review prompt
    const prompt = this.buildReviewPrompt(context, options);

    console.log('🤖 Analyzing code with AI reviewer...');

    // Execute agent
    const report = await this.execute(prompt, {
      filePath,
      language,
      focusAreas: options.focusAreas,
    });

    // Parse report to extract metrics
    const issuesCount = this.parseIssuesCounts(report);

    const result: ReviewResult = {
      summary: this.extractSummary(report),
      issuesCount,
      report,
    };

    console.log(`✅ Review complete!`);
    console.log(`   Critical: ${issuesCount.critical}`);
    console.log(`   High: ${issuesCount.high}`);
    console.log(`   Medium: ${issuesCount.medium}`);
    console.log(`   Low: ${issuesCount.low}`);

    return result;
  }

  private detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      js: 'JavaScript',
      jsx: 'JavaScript React',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
      java: 'Java',
      rb: 'Ruby',
      php: 'PHP',
      sql: 'SQL',
    };
    return languageMap[ext || ''] || 'Unknown';
  }

  private buildReviewPrompt(context: ReviewContext, options: any): string {
    let prompt = `Review the following ${context.language} code:\n\n`;
    prompt += `**File:** ${context.fileName}\n\n`;
    prompt += `**Code:**\n\`\`\`${context.language.toLowerCase()}\n${context.sourceCode}\n\`\`\`\n\n`;

    if (options.focusAreas && options.focusAreas.length > 0) {
      prompt += `**Focus Areas:** ${options.focusAreas.join(', ')}\n\n`;
      prompt += `Please pay special attention to these areas in your review.\n\n`;
    }

    prompt += `Provide a comprehensive code review following the format specified in your instructions.`;

    return prompt;
  }

  private extractSummary(report: string): string {
    const summaryMatch = report.match(/## Summary\s*\n([\s\S]*?)(?=\n## |\n###|$)/);
    return summaryMatch ? summaryMatch[1].trim() : 'No summary available';
  }

  private parseIssuesCounts(report: string): ReviewResult['issuesCount'] {
    const criticalCount = (report.match(/### CRITICAL/gi) || []).length;
    const highCount = (report.match(/### HIGH/gi) || []).length;
    const mediumCount = (report.match(/### MEDIUM/gi) || []).length;
    const lowCount = (report.match(/### LOW/gi) || []).length;

    // Also count individual issue markers
    const criticalIssues = (report.match(/\*\*Severity:\s*CRITICAL/gi) || []).length;
    const highIssues = (report.match(/\*\*Severity:\s*HIGH/gi) || []).length;
    const mediumIssues = (report.match(/\*\*Severity:\s*MEDIUM/gi) || []).length;
    const lowIssues = (report.match(/\*\*Severity:\s*LOW/gi) || []).length;

    return {
      critical: Math.max(criticalCount, criticalIssues),
      high: Math.max(highCount, highIssues),
      medium: Math.max(mediumCount, mediumIssues),
      low: Math.max(lowCount, lowIssues),
    };
  }

  async saveReview(fileName: string, report: string, targetPath?: string): Promise<string> {
    const reviewFileName = fileName.replace(/\.(ts|js|py|rs)$/, '.review.md');
    const reviewPath = targetPath
      ? join(targetPath, reviewFileName)
      : join(process.cwd(), reviewFileName);

    writeFileSync(reviewPath, report, 'utf-8');
    console.log(`💾 Saved review to: ${reviewPath}`);

    return reviewPath;
  }

  async reviewMultipleFiles(
    filePaths: string[],
    options: {
      focusAreas?: string[];
      saveReports?: boolean;
      outputDir?: string;
    } = {}
  ): Promise<ReviewResult[]> {
    console.log(`🔍 Reviewing ${filePaths.length} files...\n`);

    const results: ReviewResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.reviewFile(filePath, options);
        results.push(result);

        if (options.saveReports) {
          await this.saveReview(basename(filePath), result.report, options.outputDir);
        }

        console.log(''); // Empty line between files
      } catch (error) {
        console.error(`❌ Failed to review ${filePath}:`, error);
      }
    }

    // Print summary
    const totalIssues = results.reduce(
      (acc, r) => ({
        critical: acc.critical + r.issuesCount.critical,
        high: acc.high + r.issuesCount.high,
        medium: acc.medium + r.issuesCount.medium,
        low: acc.low + r.issuesCount.low,
      }),
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    console.log('📊 Review Summary:');
    console.log(`   Files reviewed: ${results.length}`);
    console.log(`   Critical issues: ${totalIssues.critical}`);
    console.log(`   High priority: ${totalIssues.high}`);
    console.log(`   Medium priority: ${totalIssues.medium}`);
    console.log(`   Low priority: ${totalIssues.low}`);

    return results;
  }

  async reviewPullRequest(
    changedFiles: string[],
    prDescription?: string
  ): Promise<string> {
    console.log(`🔍 Reviewing PR with ${changedFiles.length} changed files...\n`);

    const fileReviews = await this.reviewMultipleFiles(changedFiles);

    // Generate PR-level summary
    const totalIssues = fileReviews.reduce(
      (acc, r) => ({
        critical: acc.critical + r.issuesCount.critical,
        high: acc.high + r.issuesCount.high,
        medium: acc.medium + r.issuesCount.medium,
        low: acc.low + r.issuesCount.low,
      }),
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    let prReview = `# Pull Request Code Review\n\n`;

    if (prDescription) {
      prReview += `## PR Description\n${prDescription}\n\n`;
    }

    prReview += `## Overall Assessment\n\n`;
    prReview += `- **Files Reviewed:** ${changedFiles.length}\n`;
    prReview += `- **Critical Issues:** ${totalIssues.critical}\n`;
    prReview += `- **High Priority:** ${totalIssues.high}\n`;
    prReview += `- **Medium Priority:** ${totalIssues.medium}\n`;
    prReview += `- **Low Priority:** ${totalIssues.low}\n\n`;

    if (totalIssues.critical > 0) {
      prReview += `⛔ **Action Required:** This PR has ${totalIssues.critical} critical issue(s) that must be fixed before merging.\n\n`;
    } else if (totalIssues.high > 0) {
      prReview += `⚠️  **Recommendation:** This PR has ${totalIssues.high} high-priority issue(s). Consider addressing before merging.\n\n`;
    } else {
      prReview += `✅ **Looks Good:** No critical or high-priority issues found.\n\n`;
    }

    prReview += `## File-by-File Review\n\n`;

    for (let i = 0; i < changedFiles.length; i++) {
      const filePath = changedFiles[i];
      const review = fileReviews[i];

      prReview += `### ${basename(filePath)}\n\n`;
      prReview += review.report;
      prReview += `\n\n---\n\n`;
    }

    return prReview;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: tsx code-reviewer.ts <file-path> [focus-areas]');
    console.error('Example: tsx code-reviewer.ts ../src/lib/auth.ts security,performance');
    console.error('\nFocus areas: security, performance, readability, testing, best-practices');
    process.exit(1);
  }

  const [filePath, focusAreasStr] = args;
  const focusAreas = focusAreasStr ? focusAreasStr.split(',') : undefined;

  const reviewer = new CodeReviewer();

  reviewer
    .reviewFile(filePath, { focusAreas })
    .then(async result => {
      console.log('\n📝 Code Review Report:\n');
      console.log('─'.repeat(80));
      console.log(result.report);
      console.log('─'.repeat(80));

      // Save report
      const fileName = basename(filePath);
      await reviewer.saveReview(fileName, result.report);

      console.log('\n✅ Done! Review saved.');
    })
    .catch(error => {
      console.error('❌ Error during code review:', error);
      process.exit(1);
    });
}
