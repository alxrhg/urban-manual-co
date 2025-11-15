import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const checks = {
      sanity_project_id: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      sanity_dataset: !!process.env.NEXT_PUBLIC_SANITY_DATASET,
      sanity_api_version: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    }

    return NextResponse.json({
      status: 'checking',
      environment: {
        ...checks,
        sanity_project_id: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || null,
        sanity_dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
        node_env: process.env.NODE_ENV,
      },
      message: checks.sanity_project_id && checks.sanity_dataset
        ? 'Sanity CMS configured correctly'
        : 'Missing Sanity environment variables',
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 })
  }
}
