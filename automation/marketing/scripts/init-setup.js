#!/usr/bin/env node

/**
 * Initialization script for Instagram Marketing Automation
 * Creates necessary directories and files
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔═══════════════════════════════════════════════════╗
║  Instagram Marketing Automation - Setup           ║
╚═══════════════════════════════════════════════════╝
`);

// Define directories to create
const directories = [
  '../approval-queue',
  '../generated-content',
  '../workflows',
  '../config'
];

// Define files to create if they don't exist
const files = [
  {
    path: '../approval-queue/approval-queue.jsonl',
    content: ''
  },
  {
    path: '../approval-queue/approved-queue.jsonl',
    content: ''
  }
];

// Create directories
console.log('📁 Creating directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✓ Created: ${dir}`);
  } else {
    console.log(`  • Already exists: ${dir}`);
  }
});

// Create files
console.log('\n📄 Creating queue files...');
files.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`  ✓ Created: ${file.path}`);
  } else {
    console.log(`  • Already exists: ${file.path}`);
  }
});

// Check for .env file
console.log('\n🔐 Checking environment configuration...');
const envPath = path.join(__dirname, '../../.env');
const envExamplePath = path.join(__dirname, '../../.env.example');

if (!fs.existsSync(envPath)) {
  console.log('  ⚠️  No .env file found!');
  if (fs.existsSync(envExamplePath)) {
    console.log('  ℹ️  Copy .env.example to .env and fill in your credentials:');
    console.log('     cd automation && cp .env.example .env');
  } else {
    console.log('  ℹ️  Create a .env file with your API credentials');
  }
} else {
  console.log('  ✓ .env file exists');

  // Validate required env vars
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['OPENAI_API_KEY', 'INSTAGRAM_BUSINESS_ACCOUNT_ID', 'INSTAGRAM_ACCESS_TOKEN'];
  const missingVars = [];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`${varName}=.+`);
    if (!regex.test(envContent)) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('\n  ⚠️  Missing or empty environment variables:');
    missingVars.forEach(v => console.log(`     - ${v}`));
  } else {
    console.log('  ✓ All required environment variables set');
  }
}

// Check Docker
console.log('\n🐳 Checking Docker...');
const { execSync } = require('child_process');
try {
  execSync('docker --version', { stdio: 'ignore' });
  console.log('  ✓ Docker is installed');

  try {
    execSync('docker ps', { stdio: 'ignore' });
    console.log('  ✓ Docker is running');
  } catch {
    console.log('  ⚠️  Docker is not running. Start Docker Desktop.');
  }
} catch {
  console.log('  ⚠️  Docker is not installed');
  console.log('     Install from: https://www.docker.com/products/docker-desktop');
}

// Final instructions
console.log(`
╔═══════════════════════════════════════════════════╗
║  Setup Complete!                                   ║
╚═══════════════════════════════════════════════════╝

Next steps:

1. Configure your API credentials:
   cd automation && nano .env

2. Start n8n:
   npm run docker:up

3. Access n8n:
   http://localhost:5678

4. Import workflows from:
   automation/marketing/workflows/

5. Start approval server:
   cd automation/marketing && npm start

📚 Read QUICKSTART.md for detailed instructions
`);
