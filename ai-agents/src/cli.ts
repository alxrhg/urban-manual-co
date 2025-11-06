#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { MigrationGenerator } from './agents/migration-generator.js';
import { TestGenerator } from './agents/test-generator.js';
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
