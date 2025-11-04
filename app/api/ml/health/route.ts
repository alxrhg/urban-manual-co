import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'unhealthy', ml_service: 'unavailable' },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json({
      status: 'healthy',
      ml_service: health,
    });
  } catch (error) {
    console.error('Error checking ML service health:', error);
    return NextResponse.json(
      { status: 'unhealthy', ml_service: 'error', error: String(error) },
      { status: 503 }
    );
  }
}
