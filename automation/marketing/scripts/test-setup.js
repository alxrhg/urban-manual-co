#!/usr/bin/env node

/**
 * Test script for Instagram Marketing Automation
 * Validates configuration and connectivity
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log(`
╔═══════════════════════════════════════════════════╗
║  Instagram Marketing Automation - Tests           ║
╚═══════════════════════════════════════════════════╝
`);

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = fn();
    if (result) {
      console.log('✓ PASS');
      testsPassed++;
      return true;
    } else {
      console.log('✗ FAIL');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 1: Check config files exist
test('Config files exist', () => {
  const brandConfig = path.join(__dirname, '../config/brand-aesthetic.json');
  const promptsConfig = path.join(__dirname, '../config/ai-prompts.json');
  return fs.existsSync(brandConfig) && fs.existsSync(promptsConfig);
});

// Test 2: Check workflow files exist
test('Workflow files exist', () => {
  const workflow1 = path.join(__dirname, '../workflows/1-content-generation.json');
  const workflow2 = path.join(__dirname, '../workflows/2-auto-post-approved.json');
  return fs.existsSync(workflow1) && fs.existsSync(workflow2);
});

// Test 3: Check approval dashboard exists
test('Approval dashboard exists', () => {
  const dashboard = path.join(__dirname, '../approval-queue/approval-dashboard.html');
  const server = path.join(__dirname, '../approval-queue/approval-server.js');
  return fs.existsSync(dashboard) && fs.existsSync(server);
});

// Test 4: Check directories
test('Required directories exist', () => {
  const dirs = [
    path.join(__dirname, '../approval-queue'),
    path.join(__dirname, '../generated-content'),
    path.join(__dirname, '../workflows'),
    path.join(__dirname, '../config')
  ];
  return dirs.every(dir => fs.existsSync(dir));
});

// Test 5: Validate brand config JSON
test('Brand config is valid JSON', () => {
  const configPath = path.join(__dirname, '../config/brand-aesthetic.json');
  const content = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(content);
  return config.visualStyle && config.captionStyle && config.contentPillars;
});

// Test 6: Validate AI prompts JSON
test('AI prompts config is valid JSON', () => {
  const configPath = path.join(__dirname, '../config/ai-prompts.json');
  const content = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(content);
  return config.imageGeneration && config.captionGeneration;
});

// Test 7: Check .env file
const envExists = test('Environment file exists', () => {
  const envPath = path.join(__dirname, '../../.env');
  return fs.existsSync(envPath);
});

// Test 8: Validate environment variables
if (envExists) {
  test('OpenAI API key is set', () => {
    const envPath = path.join(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    return /OPENAI_API_KEY=sk-/.test(content);
  });

  test('Instagram credentials are set', () => {
    const envPath = path.join(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    return /INSTAGRAM_BUSINESS_ACCOUNT_ID=.+/.test(content) &&
           /INSTAGRAM_ACCESS_TOKEN=.+/.test(content);
  });
}

// Test 9: Check Docker
const { execSync } = require('child_process');
test('Docker is available', () => {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

test('Docker is running', () => {
  try {
    execSync('docker ps', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

// Test 10: Check if n8n is running
test('n8n container is running', () => {
  try {
    const output = execSync('docker ps --filter name=urban-manual-n8n --format "{{.Names}}"', {
      encoding: 'utf8'
    });
    return output.includes('urban-manual-n8n');
  } catch {
    return false;
  }
});

// Test 11: Test OpenAI API (if configured)
async function testOpenAI() {
  return new Promise((resolve) => {
    const envPath = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) {
      console.log('Testing OpenAI API... ⊘ SKIP (no .env)');
      resolve();
      return;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/OPENAI_API_KEY=(sk-[^\s\n]+)/);

    if (!match) {
      console.log('Testing OpenAI API... ⊘ SKIP (no API key)');
      resolve();
      return;
    }

    process.stdout.write('Testing OpenAI API... ');

    const apiKey = match[1];
    const postData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_tokens: 5
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': postData.length
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✓ PASS');
        testsPassed++;
      } else {
        console.log(`✗ FAIL (status: ${res.statusCode})`);
        testsFailed++;
      }
      resolve();
    });

    req.on('error', (error) => {
      console.log(`✗ FAIL: ${error.message}`);
      testsFailed++;
      resolve();
    });

    req.on('timeout', () => {
      console.log('✗ FAIL: timeout');
      testsFailed++;
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// Run async tests
(async () => {
  await testOpenAI();

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════╗
║  Test Results                                      ║
╚═══════════════════════════════════════════════════╝

Tests passed: ${testsPassed}
Tests failed: ${testsFailed}

${testsFailed === 0 ? '✓ All tests passed! System is ready.' : '⚠️  Some tests failed. Check the output above.'}
`);

  if (testsFailed > 0) {
    console.log('Run "npm run init" to set up missing components.\n');
    process.exit(1);
  }
})();
