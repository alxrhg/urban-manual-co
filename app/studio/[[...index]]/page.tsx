'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../sanity.config';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  // Check if Sanity is configured
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Sanity Studio Not Configured</h1>
        <p>Please set NEXT_PUBLIC_SANITY_PROJECT_ID in your environment variables.</p>
        <p>If you installed the Vercel Sanity integration, the variables should be set automatically.</p>
      </div>
    );
  }

  return <NextStudio config={config} />;
}

