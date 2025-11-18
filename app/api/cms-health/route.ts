import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const checks = {
      postgres_url: !!process.env.POSTGRES_URL,
      sanity_project_id: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      postgres_url_length: process.env.POSTGRES_URL?.length || 0,
      sanity_project_id_length: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.length || 0,
    }

    return NextResponse.json({
      status: 'checking',
      environment: {
        ...checks,
        node_env: process.env.NODE_ENV,
      },
      message: checks.postgres_url && checks.sanity_project_id && checks.sanity_project_id_length > 0
        ? 'Environment variables configured correctly'
        : 'Missing or invalid environment variables',
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 })
  }
}
