/**
 * ML Service Status
 *
 * Check the status of the ML microservice.
 */

import { NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Check health endpoint
    const healthResponse = await fetch(
      `${ML_SERVICE_URL}/health`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!healthResponse.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          ml_service: 'unavailable',
          error: healthResponse.statusText
        },
        { status: 503 }
      );
    }

    const healthData = await healthResponse.json();

    // Get model statuses
    const [recommendStatus, forecastStatus] = await Promise.allSettled([
      fetch(`${ML_SERVICE_URL}/api/recommend/model/status`, {
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json()),
      fetch(`${ML_SERVICE_URL}/api/forecast/status`, {
        signal: AbortSignal.timeout(3000),
      }).then(r => r.json())
    ]);

    return NextResponse.json({
      status: 'healthy',
      ml_service: 'available',
      health: healthData,
      models: {
        recommendations: recommendStatus.status === 'fulfilled' ? recommendStatus.value : { status: 'error' },
        forecasting: forecastStatus.status === 'fulfilled' ? forecastStatus.value : { status: 'error' }
      }
    });

  } catch (error) {
    console.error('ML status check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        ml_service: 'unavailable',
        error: 'Connection failed'
      },
      { status: 503 }
    );
  }
}
