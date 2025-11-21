/**
 * Fallback Conversation API Route
 * Handles requests to /api/conversation without user_id parameter
 * Returns helpful error message guiding users to the correct endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Return error indicating user_id is required
  return NextResponse.json(
    {
      error: 'User ID required in path',
      message: 'Please use /api/conversation/{user_id} or /api/conversation/guest',
      suggestion: 'If you are a guest user, use /api/conversation/guest',
    },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  // Return error indicating user_id is required
  return NextResponse.json(
    {
      error: 'User ID required in path',
      message: 'Please use /api/conversation/{user_id} or /api/conversation/guest',
      suggestion: 'If you are a guest user, use /api/conversation/guest',
    },
    { status: 404 }
  );
}
