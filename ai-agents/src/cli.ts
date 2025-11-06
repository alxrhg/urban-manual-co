#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { MigrationGenerator } from './agents/migration-generator.js';
import { TestGenerator } from './agents/test-generator.js';
import { CodeReviewer } from './agents/code-reviewer.js';
import { DocumentationGenerator } from './agents/documentation-generator.js';
import { RefactoringAgent } from './agents/refactoring-agent.js';
import { validateConfig } from './config.js';

program
  .name('urban-agent')
  .description('AI Agent CLI for Urban Manual - automate migrations, tests, and more')
  .version('0.1.0');

// Migration generation command
program
  .command('migrate')
  .description('Generate a Supabase database migration')
  .argument('<description>', 'Migration description')
  .argument('<requirements>', 'Migration requirements')
  .option('-p, --path <path>', 'Migrations directory path')
  .option('-s, --schema <path>', 'Schema file path')
  .option('--save', 'Save the migration file', true)
  .action(async (description, requirements, options) => {
    const spinner = ora('Initializing migration generator...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const generator = new MigrationGenerator();

      spinner.start('Generating migration...');
      const result = await generator.generateMigration(description, requirements, {
        migrationsPath: options.path,
        schemaPath: options.schema,
      });

      spinner.succeed(`Migration generated: ${chalk.cyan(result.fileName)}`);

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(result.content);
      console.log(chalk.gray('─'.repeat(80) + '\n'));

      if (options.save) {
        spinner.start('Saving migration...');
        await generator.saveMigration(result.fileName, result.content, options.path);
        spinner.succeed(`Migration saved to: ${chalk.green(result.fileName)}`);

        console.log(chalk.yellow('\n💡 To apply this migration, run:'));
        console.log(chalk.cyan('   supabase migration up\n'));
      }
    } catch (error) {
      spinner.fail('Failed to generate migration');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Test generation command
program
  .command('test')
  .description('Generate tests for a source file')
  .argument('<source-file>', 'Path to source file')
  .option('-t, --type <type>', 'Test type: unit, integration, or e2e', 'unit')
  .option('-f, --framework <framework>', 'Testing framework: jest, vitest, or playwright', 'vitest')
  .option('-o, --output <path>', 'Output directory path')
  .option('--save', 'Save the test file', true)
  .action(async (sourceFile, options) => {
    const spinner = ora('Initializing test generator...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const generator = new TestGenerator();

      spinner.start(`Generating ${options.type} tests...`);
      const result = await generator.generateTests(sourceFile, {
        testType: options.type,
        framework: options.framework,
        outputPath: options.output,
      });

      spinner.succeed(`Tests generated: ${chalk.cyan(result.fileName)}`);

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(result.content);
      console.log(chalk.gray('─'.repeat(80) + '\n'));

      if (options.save) {
        spinner.start('Saving tests...');
        await generator.saveTests(result.fileName, result.content, options.output);
        spinner.succeed(`Tests saved to: ${chalk.green(result.fileName)}`);

        console.log(chalk.yellow('\n💡 To run these tests:'));
        console.log(chalk.cyan(`   npm test ${result.fileName}\n`));
      }
    } catch (error) {
      spinner.fail('Failed to generate tests');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Batch test generation command
program
  .command('test-dir')
  .description('Generate tests for all files in a directory')
  .argument('<directory>', 'Directory path')
  .option('-t, --type <type>', 'Test type: unit or integration', 'unit')
  .option('-f, --framework <framework>', 'Testing framework: jest or vitest', 'vitest')
  .option('-r, --recursive', 'Process subdirectories recursively', false)
  .action(async (directory, options) => {
    const spinner = ora('Initializing test generator...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const generator = new TestGenerator();

      spinner.start(`Generating ${options.type} tests for directory...`);
      const results = await generator.generateTestsForDirectory(directory, {
        testType: options.type,
        framework: options.framework,
        recursive: options.recursive,
      });

      spinner.succeed(`Generated ${results.length} test files`);

      console.log(chalk.green(`\n✅ Generated ${results.length} test files:`));
      results.forEach(r => console.log(chalk.cyan(`   - ${r.fileName}`)));

      console.log(chalk.yellow('\n💡 To run all tests:'));
      console.log(chalk.cyan('   npm test\n'));
    } catch (error) {
      spinner.fail('Failed to generate tests');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Code review command
program
  .command('review')
  .description('Perform AI-powered code review')
  .argument('<file-path>', 'File to review')
  .option('-f, --focus <areas>', 'Focus areas (comma-separated): security,performance,readability')
  .option('-o, --output <path>', 'Output directory for review report')
  .option('--save', 'Save review report', true)
  .action(async (filePath, options) => {
    const spinner = ora('Initializing code reviewer...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const reviewer = new CodeReviewer();

      spinner.start('Reviewing code...');
      const focusAreas = options.focus ? options.focus.split(',') : undefined;
      const result = await reviewer.reviewFile(filePath, { focusAreas });

      spinner.succeed('Review complete');

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(result.report);
      console.log(chalk.gray('─'.repeat(80) + '\n'));

      if (options.save) {
        await reviewer.saveReview(filePath.split('/').pop() || 'file', result.report, options.output);
      }
    } catch (error) {
      spinner.fail('Failed to review code');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Documentation generation commands
program
  .command('docs')
  .description('Generate documentation')
  .argument('<type>', 'Documentation type: readme, api, comments, architecture')
  .argument('<path>', 'Project or file path')
  .option('-o, --output <path>', 'Output path')
  .action(async (type, path, options) => {
    const spinner = ora('Initializing documentation generator...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const generator = new DocumentationGenerator();

      spinner.start(`Generating ${type} documentation...`);

      let docs: string;
      let fileName: string;

      if (type === 'readme') {
        docs = await generator.generateReadme(path);
        fileName = 'README.md';
      } else if (type === 'api') {
        docs = await generator.generateApiDocs(path);
        fileName = `${path.split('/').pop()}.api.md`;
      } else if (type === 'comments') {
        docs = await generator.generateInlineComments(path);
        fileName = path.split('/').pop() || 'file.ts';
      } else if (type === 'architecture') {
        docs = await generator.generateArchitectureDocs(path);
        fileName = 'ARCHITECTURE.md';
      } else {
        throw new Error(`Unknown documentation type: ${type}`);
      }

      spinner.succeed('Documentation generated');

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(docs.slice(0, 1000) + (docs.length > 1000 ? '\n...(truncated)' : ''));
      console.log(chalk.gray('─'.repeat(80) + '\n'));

      await generator.saveDocs(fileName, docs, options.output || path);
    } catch (error) {
      spinner.fail('Failed to generate documentation');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Refactoring command
program
  .command('refactor')
  .description('Refactor code with AI suggestions')
  .argument('<file-path>', 'File to refactor')
  .option('-f, --focus <areas>', 'Focus areas: readability,performance,dry,types')
  .option('--aggressive', 'Enable aggressive refactoring', false)
  .option('--backup', 'Create backup before saving', true)
  .option('--save', 'Save refactored code', false)
  .action(async (filePath, options) => {
    const spinner = ora('Initializing refactoring agent...').start();

    try {
      validateConfig();
      spinner.succeed('Configuration validated');

      const agent = new RefactoringAgent();

      spinner.start('Analyzing and refactoring code...');
      const focusAreas = options.focus ? options.focus.split(',') : undefined;
      const result = await agent.refactorFile(filePath, {
        focusAreas,
        aggressiveRefactoring: options.aggressive,
        preserveComments: true,
      });

      spinner.succeed('Refactoring complete');

      const report = await agent.generateRefactoringReport(result);

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(report);
      console.log(chalk.gray('─'.repeat(80) + '\n'));

      if (options.save) {
        spinner.start('Saving refactored code...');
        await agent.saveRefactored(filePath, result.refactored, { backup: options.backup });
        spinner.succeed('Refactored code saved');
      } else {
        console.log(chalk.yellow('💡 To save the refactored code, use the --save flag'));
      }
    } catch (error) {
      spinner.fail('Failed to refactor code');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Suggest refactorings command
program
  .command('suggest')
  .description('Suggest refactorings for a file')
  .argument('<file-path>', 'File to analyze')
  .action(async (filePath) => {
    const spinner = ora('Analyzing code...').start();

    try {
      validateConfig();
      const agent = new RefactoringAgent();

      const suggestions = await agent.suggestRefactorings(filePath);

      spinner.succeed(`Found ${suggestions.length} suggestions`);

      console.log(chalk.green('\n💡 Refactoring Suggestions:\n'));
      suggestions.forEach((suggestion, i) => {
        console.log(chalk.cyan(`${i + 1}. ${suggestion}`));
      });

      console.log(chalk.yellow('\n💡 To apply refactorings:'));
      console.log(chalk.cyan(`   urban-agent refactor ${filePath} --save\n`));
    } catch (error) {
      spinner.fail('Failed to analyze code');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config check command
program
  .command('config')
  .description('Check configuration')
  .action(() => {
    try {
      validateConfig();
      console.log(chalk.green('✅ Configuration is valid!'));
    } catch (error) {
      console.error(chalk.red('❌ Configuration error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
