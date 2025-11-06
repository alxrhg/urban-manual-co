import { BaseAgent, AgentState } from '../lib/base-agent.js';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, extname } from 'path';

const DOCUMENTATION_SYSTEM_PROMPT = `You are an expert technical documentation writer specializing in software documentation.

Your responsibilities:
1. Generate clear, comprehensive documentation from source code
2. Create README files, API documentation, and inline comments
3. Write user guides and developer documentation
4. Document code architecture and design decisions
5. Create examples and usage guides
6. Ensure documentation is accurate, up-to-date, and helpful

Documentation types you can generate:
- **README.md**: Project overview, setup, usage
- **API Docs**: Function/class/endpoint documentation
- **Inline Comments**: JSDoc, docstrings, etc.
- **Architecture Docs**: System design, data flow
- **User Guides**: How-to guides for end users
- **Developer Guides**: Contributing, development setup

Documentation standards:
- Clear, concise language
- Code examples for complex concepts
- Proper formatting (Markdown, JSDoc, etc.)
- Include parameters, return types, errors
- Explain the "why", not just the "what"
- Use proper headings and structure
- Add diagrams where helpful (as Markdown)

Output format depends on documentation type requested.
For README: Use standard README structure with badges, TOC, etc.
For API: Use appropriate doc format (JSDoc, TSDoc, Python docstrings)
For guides: Use clear sections with examples`;

interface DocContext {
  sourceCode?: string;
  fileName?: string;
  language?: string;
  existingDocs?: string;
  projectInfo?: {
    name: string;
    description: string;
    version: string;
  };
}

export class DocumentationGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'DocumentationGenerator',
      description: 'Generates comprehensive documentation automatically',
      systemPrompt: DOCUMENTATION_SYSTEM_PROMPT,
      temperature: 0.4, // Slightly higher for creative examples
    });
  }

  protected override shouldContinue(state: AgentState): 'continue' | 'finalize' {
    return 'finalize';
  }

  async generateReadme(
    projectPath: string,
    options: {
      includeExamples?: boolean;
      includeBadges?: boolean;
      includeContributing?: boolean;
    } = {}
  ): Promise<string> {
    console.log(`📚 Generating README for project: ${projectPath}`);

    // Gather project information
    const packageJson = this.readPackageJson(projectPath);
    const sourceFiles = this.scanSourceFiles(projectPath);

    const context: DocContext = {
      projectInfo: packageJson
        ? {
            name: packageJson.name || basename(projectPath),
            description: packageJson.description || 'No description',
            version: packageJson.version || '0.0.0',
          }
        : {
            name: basename(projectPath),
            description: 'No description',
            version: '0.0.0',
          },
    };

    // Read some source files for context
    const sampleCode = sourceFiles.slice(0, 3).map(f => {
      try {
        return {
          file: basename(f),
          content: readFileSync(f, 'utf-8').slice(0, 1000), // First 1000 chars
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    const prompt = this.buildReadmePrompt(context, sampleCode, options);

    console.log('🤖 Generating README with AI...');
    const readme = await this.execute(prompt, { projectPath, ...options });

    console.log('✅ README generated!');
    return this.cleanMarkdownOutput(readme);
  }

  async generateApiDocs(
    filePath: string,
    options: {
      format?: 'jsdoc' | 'tsdoc' | 'docstring';
      includeExamples?: boolean;
    } = {}
  ): Promise<string> {
    console.log(`📚 Generating API documentation for: ${filePath}`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const language = this.detectLanguage(fileName);
    const format = options.format || this.getDefaultDocFormat(language);

    const context: DocContext = {
      sourceCode,
      fileName,
      language,
    };

    const prompt = this.buildApiDocsPrompt(context, format, options);

    console.log(`🤖 Generating ${format} documentation...`);
    const docs = await this.execute(prompt, { filePath, format, ...options });

    console.log('✅ API documentation generated!');
    return docs;
  }

  async generateInlineComments(
    filePath: string,
    options: {
      style?: 'jsdoc' | 'tsdoc' | 'docstring' | 'rustdoc';
      verbose?: boolean;
    } = {}
  ): Promise<string> {
    console.log(`💬 Adding inline comments to: ${filePath}`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const language = this.detectLanguage(fileName);
    const style = options.style || this.getDefaultDocFormat(language);

    const context: DocContext = {
      sourceCode,
      fileName,
      language,
    };

    const prompt = this.buildInlineCommentsPrompt(context, style, options);

    console.log('🤖 Generating inline comments...');
    const commentedCode = await this.execute(prompt, { filePath, style, ...options });

    console.log('✅ Inline comments added!');
    return this.cleanCodeOutput(commentedCode);
  }

  async generateArchitectureDocs(
    projectPath: string,
    options: {
      includeDataFlow?: boolean;
      includeDiagrams?: boolean;
    } = {}
  ): Promise<string> {
    console.log(`🏗️  Generating architecture documentation for: ${projectPath}`);

    const sourceFiles = this.scanSourceFiles(projectPath);
    const structure = this.analyzeProjectStructure(projectPath);

    let codeContext = '';
    for (const file of sourceFiles.slice(0, 10)) {
      try {
        const content = readFileSync(file, 'utf-8');
        codeContext += `\n\n### ${file}\n\`\`\`\n${content.slice(0, 500)}\n\`\`\`\n`;
      } catch {
        continue;
      }
    }

    const prompt = this.buildArchitecturePrompt(structure, codeContext, options);

    console.log('🤖 Analyzing architecture...');
    const docs = await this.execute(prompt, { projectPath, ...options });

    console.log('✅ Architecture documentation generated!');
    return this.cleanMarkdownOutput(docs);
  }

  private detectLanguage(fileName: string): string {
    const ext = extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.rs': 'Rust',
      '.go': 'Go',
    };
    return map[ext] || 'Unknown';
  }

  private getDefaultDocFormat(language: string): string {
    const map: Record<string, string> = {
      TypeScript: 'tsdoc',
      JavaScript: 'jsdoc',
      Python: 'docstring',
      Rust: 'rustdoc',
    };
    return map[language] || 'jsdoc';
  }

  private readPackageJson(projectPath: string): any {
    try {
      const pkgPath = join(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        return JSON.parse(readFileSync(pkgPath, 'utf-8'));
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private scanSourceFiles(projectPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs'];

    const scan = (dir: string) => {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            scan(fullPath);
          } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    scan(projectPath);
    return files.slice(0, 50); // Limit to 50 files
  }

  private analyzeProjectStructure(projectPath: string): any {
    const structure: any = {
      directories: [],
      mainFiles: [],
      configFiles: [],
    };

    try {
      const entries = readdirSync(projectPath);
      for (const entry of entries) {
        const fullPath = join(projectPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          structure.directories.push(entry);
        } else if (stat.isFile()) {
          if (['package.json', 'tsconfig.json', 'Cargo.toml', 'pyproject.toml'].includes(entry)) {
            structure.configFiles.push(entry);
          }
          if (['index.ts', 'main.ts', 'app.ts', 'server.ts', 'index.js'].includes(entry)) {
            structure.mainFiles.push(entry);
          }
        }
      }
    } catch {
      // Ignore
    }

    return structure;
  }

  private buildReadmePrompt(context: DocContext, sampleCode: any[], options: any): string {
    let prompt = `Generate a comprehensive README.md file for this project:\n\n`;
    prompt += `**Project Name:** ${context.projectInfo?.name}\n`;
    prompt += `**Description:** ${context.projectInfo?.description}\n`;
    prompt += `**Version:** ${context.projectInfo?.version}\n\n`;

    if (sampleCode.length > 0) {
      prompt += `**Sample Source Files:**\n`;
      sampleCode.forEach(s => {
        if (s) {
          prompt += `\n${s.file}:\n\`\`\`\n${s.content}\n...\n\`\`\`\n`;
        }
      });
    }

    prompt += `\n\nGenerate a README with:\n`;
    prompt += `1. Title and description\n`;
    if (options.includeBadges !== false) {
      prompt += `2. Badges (build status, version, license, etc.)\n`;
    }
    prompt += `3. Features list\n`;
    prompt += `4. Installation instructions\n`;
    prompt += `5. Quick start / Usage guide\n`;
    if (options.includeExamples !== false) {
      prompt += `6. Examples\n`;
    }
    prompt += `7. API overview\n`;
    prompt += `8. Configuration\n`;
    if (options.includeContributing !== false) {
      prompt += `9. Contributing guidelines\n`;
    }
    prompt += `10. License\n\n`;

    prompt += `Use proper Markdown formatting with headers, code blocks, and lists.`;

    return prompt;
  }

  private buildApiDocsPrompt(context: DocContext, format: string, options: any): string {
    let prompt = `Generate ${format} documentation for this ${context.language} code:\n\n`;
    prompt += `**File:** ${context.fileName}\n\n`;
    prompt += `**Code:**\n\`\`\`${context.language?.toLowerCase()}\n${context.sourceCode}\n\`\`\`\n\n`;

    prompt += `Generate documentation that includes:\n`;
    prompt += `1. Function/class descriptions\n`;
    prompt += `2. Parameters with types\n`;
    prompt += `3. Return types and values\n`;
    prompt += `4. Thrown errors/exceptions\n`;
    if (options.includeExamples) {
      prompt += `5. Usage examples\n`;
    }
    prompt += `\nUse ${format} format. Output as Markdown.`;

    return prompt;
  }

  private buildInlineCommentsPrompt(context: DocContext, style: string, options: any): string {
    let prompt = `Add comprehensive ${style} inline comments to this ${context.language} code:\n\n`;
    prompt += `\`\`\`${context.language?.toLowerCase()}\n${context.sourceCode}\n\`\`\`\n\n`;

    prompt += `Add comments for:\n`;
    prompt += `1. All functions/methods with ${style} comments\n`;
    prompt += `2. Complex logic with explanatory comments\n`;
    prompt += `3. All parameters and return values\n`;
    prompt += `4. Any non-obvious behavior\n\n`;

    if (options.verbose) {
      prompt += `Be verbose and thorough in explanations.\n\n`;
    }

    prompt += `Output the complete code WITH comments. Preserve all original code.`;

    return prompt;
  }

  private buildArchitecturePrompt(structure: any, codeContext: string, options: any): string {
    let prompt = `Generate architecture documentation for this project:\n\n`;
    prompt += `**Project Structure:**\n`;
    prompt += `Directories: ${structure.directories.join(', ')}\n`;
    prompt += `Main Files: ${structure.mainFiles.join(', ')}\n`;
    prompt += `Config Files: ${structure.configFiles.join(', ')}\n\n`;

    prompt += `**Code Samples:**${codeContext}\n\n`;

    prompt += `Generate documentation covering:\n`;
    prompt += `1. Overall architecture overview\n`;
    prompt += `2. Major components and their responsibilities\n`;
    prompt += `3. Directory structure explanation\n`;
    if (options.includeDataFlow) {
      prompt += `4. Data flow and interactions\n`;
    }
    if (options.includeDiagrams) {
      prompt += `5. Architecture diagrams (as Markdown/ASCII)\n`;
    }
    prompt += `6. Key design decisions\n`;
    prompt += `7. Technology stack\n\n`;

    prompt += `Use Markdown format with proper sections and formatting.`;

    return prompt;
  }

  private cleanMarkdownOutput(output: string): string {
    return output.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim();
  }

  private cleanCodeOutput(output: string): string {
    const match = output.match(/```[\w]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : output.trim();
  }

  async saveDocs(fileName: string, content: string, targetPath?: string): Promise<string> {
    const docsPath = targetPath || join(process.cwd(), fileName);
    writeFileSync(docsPath, content, 'utf-8');
    console.log(`💾 Saved documentation to: ${docsPath}`);
    return docsPath;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage:');
    console.error('  tsx documentation-generator.ts readme <project-path>');
    console.error('  tsx documentation-generator.ts api <file-path>');
    console.error('  tsx documentation-generator.ts comments <file-path>');
    console.error('  tsx documentation-generator.ts architecture <project-path>');
    process.exit(1);
  }

  const [command, path] = args;
  const generator = new DocumentationGenerator();

  if (command === 'readme') {
    generator
      .generateReadme(path)
      .then(async readme => {
        console.log('\n📚 Generated README:\n');
        console.log('─'.repeat(80));
        console.log(readme);
        console.log('─'.repeat(80));
        await generator.saveDocs('README.md', readme, path);
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else if (command === 'api') {
    generator
      .generateApiDocs(path)
      .then(async docs => {
        console.log('\n📚 Generated API Docs:\n');
        console.log('─'.repeat(80));
        console.log(docs);
        console.log('─'.repeat(80));
        await generator.saveDocs(`${basename(path)}.api.md`, docs, dirname(path));
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else if (command === 'comments') {
    generator
      .generateInlineComments(path)
      .then(async code => {
        console.log('\n💬 Code with Comments:\n');
        console.log('─'.repeat(80));
        console.log(code);
        console.log('─'.repeat(80));
        const newPath = path.replace(/(\.[^.]+)$/, '.commented$1');
        await generator.saveDocs(basename(newPath), code, dirname(path));
      })
      .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else if (command === 'architecture') {
    generator
      .generateArchitectureDocs(path)
      .then(async docs => {
        console.log('\n🏗️  Architecture Documentation:\n');
        console.log('─'.repeat(80));
        console.log(docs);
        console.log('─'.repeat(80));
        await generator.saveDocs('ARCHITECTURE.md', docs, path);
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
