import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const checks = {
    postgres_url: !!process.env.POSTGRES_URL,
    payload_secret: !!process.env.PAYLOAD_SECRET,
    postgres_url_length: process.env.POSTGRES_URL?.length || 0,
    payload_secret_length: process.env.PAYLOAD_SECRET?.length || 0,
  };

  return NextResponse.json({
    status: 'checking',
    environment: {
      ...checks,
      node_env: process.env.NODE_ENV,
    },
    message: checks.postgres_url && checks.payload_secret && checks.payload_secret_length >= 32
      ? 'Environment variables configured correctly'
      : 'Missing or invalid environment variables',
  });
});
