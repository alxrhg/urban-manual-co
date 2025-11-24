import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Get build version from environment or package.json
export async function GET() {
  // Try multiple sources for build number/commit SHA (in order of preference):
  // 1. GitHub Actions build number (GITHUB_RUN_NUMBER)
  // 2. GitHub Actions commit SHA (GITHUB_SHA)
  // 3. Vercel's build environment variables
  // 4. Git command (for local development)
  const githubRunNumber = process.env.GITHUB_RUN_NUMBER;
  const githubSha = process.env.GITHUB_SHA;
  const vercelCommitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const vercelEnv = process.env.VERCEL_ENV;
  
  // Read package.json version
  let packageVersion = '0.1.0';
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    packageVersion = packageJson.version || '0.1.0';
  } catch (error) {
    console.error('Error reading package.json:', error);
  }
  
  // Get commit SHA from various sources
  let commitSha: string | null = githubSha || vercelCommitSha || null;
  
  // If no commit SHA from environment, try to get it from git (local dev only)
  if (!commitSha) {
    try {
      commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      // Git command failed (not a git repo or git not available)
      // This is expected in some deployment environments
    }
  }
  
  const shortSha = commitSha ? commitSha.substring(0, 7) : null;
  
  // Prioritize GitHub build number, then commit SHA, then fallback
  let buildVersion: string;
  if (githubRunNumber) {
    // Use GitHub build number if available
    buildVersion = `#${githubRunNumber}`;
    if (shortSha) {
      buildVersion += ` (${shortSha})`;
    }
  } else if (commitSha) {
    // Use commit SHA if available
    buildVersion = shortSha + (vercelEnv && vercelEnv !== 'production' ? ` (${vercelEnv})` : '');
  } else {
    // Fallback to package version or env variable
    buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || `${packageVersion}-dev`;
  }

  return NextResponse.json({ 
    version: buildVersion,
    commitSha: commitSha || null,
    shortSha: shortSha || null,
    buildNumber: githubRunNumber || null,
    packageVersion,
    environment: vercelEnv || null
  });
}

