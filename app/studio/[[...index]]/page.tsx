'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../sanity.config';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  // Check if Sanity is configured
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  
  if (!projectId) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Sanity Studio Not Configured
        </h1>
        <p style={{ marginBottom: '0.5rem' }}>
          Please set <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>NEXT_PUBLIC_SANITY_PROJECT_ID</code> in your environment variables.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          If you installed the Vercel Sanity integration, the variables should be set automatically.
        </p>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Check your Vercel project settings → Environment Variables to ensure the Sanity integration has configured the required variables.
        </p>
      </div>
    );
  }

  // Validate project ID format (should be alphanumeric, typically 8-12 characters)
  if (projectId === 'placeholder' || projectId.length < 8) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Invalid Sanity Project ID
        </h1>
        <p style={{ marginBottom: '0.5rem' }}>
          The Sanity Project ID appears to be invalid: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>{projectId}</code>
        </p>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Please verify your Sanity project ID in Vercel environment variables. It should match your project ID from the Sanity dashboard.
        </p>
      </div>
    );
  }

  return <NextStudio config={config} />;
}

