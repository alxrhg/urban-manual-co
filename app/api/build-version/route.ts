import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyCors, corsOptionsResponse } from '@/lib/cors';

// Get build version from environment or package.json
export function OPTIONS(request: Request) {
  return corsOptionsResponse(request);
}

export async function GET(request: Request) {
  // Try Vercel's build environment variables first
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
  
  // Return commit SHA as the build version (preferred) or fallback
  const commitSha = vercelCommitSha || process.env.VERCEL_GIT_COMMIT_SHA || null;
  const shortSha = commitSha ? commitSha.substring(0, 7) : null;
  
  const buildVersion = commitSha 
    ? shortSha + (vercelEnv && vercelEnv !== 'production' ? ` (${vercelEnv})` : '')
    : (process.env.NEXT_PUBLIC_BUILD_VERSION || `${packageVersion}-dev`);

  const response = NextResponse.json({
    version: buildVersion,
    commitSha: commitSha || null,
    shortSha: shortSha || null,
    packageVersion,
    environment: vercelEnv || null
  });

  return applyCors(request, response);
}

