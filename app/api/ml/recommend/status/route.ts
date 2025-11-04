import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/recommend/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'unavailable', trained: false },
        { status: 503 }
      );
    }

    const status = await response.json();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking ML service status:', error);
    return NextResponse.json(
      { status: 'error', trained: false },
      { status: 500 }
    );
  }
}
