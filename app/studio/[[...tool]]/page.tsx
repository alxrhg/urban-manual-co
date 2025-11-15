'use client'

import { useEffect, useState } from 'react'

export default function StudioPage() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ryd11bal'
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if environment variables are actually set
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/sanity-health')
        const data = await response.json()
        setIsConfigured(data.environment?.sanity_project_id && data.environment?.sanity_dataset)
      } catch (error) {
        setIsConfigured(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkConfig()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Sanity Studio...</p>
        </div>
      </div>
    )
  }

  if (isConfigured) {
    // If configured, redirect to Sanity's hosted Studio
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="max-w-2xl w-full text-center space-y-6">
          <h1 className="text-3xl font-bold">Sanity Studio</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sanity CMS is configured! Access your Studio below.
          </p>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Configured</span>
                </div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <div><strong>Project ID:</strong> {projectId}</div>
                  <div><strong>Dataset:</strong> {dataset}</div>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={`https://www.sanity.io/manage/project/${projectId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity text-center font-medium"
                >
                  Open Sanity Studio →
                </a>
                
                <p className="text-xs text-gray-500">
                  Opens in Sanity's hosted Studio at sanity.io
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold mb-2">Or run Studio locally:</p>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono text-left">
                  npx sanity start
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Starts at <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">http://localhost:3333</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show setup instructions if not configured
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">Sanity Studio Setup Required</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Environment variables are not configured. Follow the steps below.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 text-left">
          <h2 className="text-xl font-semibold mb-4">Project Information:</h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="text-sm space-y-1">
              <div><strong>Project ID:</strong> <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">{projectId}</code></div>
              <div><strong>Dataset:</strong> <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">{dataset}</code></div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4">Setup Instructions:</h2>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">🚀 For Deployed Environments (Vercel, Netlify, etc.):</h3>
            <ol className="space-y-2 text-sm text-amber-900 dark:text-amber-200">
              <li><strong>1.</strong> Go to your hosting dashboard (Vercel, Netlify, etc.)</li>
              <li><strong>2.</strong> Add these environment variables:</li>
            </ol>
            <div className="mt-2 bg-white dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
              <div>NEXT_PUBLIC_SANITY_PROJECT_ID={projectId}</div>
              <div>NEXT_PUBLIC_SANITY_DATASET={dataset}</div>
              <div>NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01</div>
            </div>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
              <strong>3.</strong> Redeploy your application after adding the variables
            </p>
          </div>

          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-sm">💻 For Local Development (click to expand)</summary>
            <ol className="space-y-4 text-sm mt-4">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <div>
                  <strong>Create or access your Sanity account:</strong>
                  <br />
                  Go to{' '}
                  <a href="https://sanity.io/manage" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                    sanity.io/manage
                  </a>
                </div>
              </li>
              
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <div>
                  <strong>Initialize Sanity in this project:</strong>
                  <div className="mt-2 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
                    npm create sanity@latest -- --project {projectId} --dataset {dataset} --template clean
                  </div>
                </div>
              </li>
              
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <div>
                  <strong>Add environment variables to <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">.env.local</code>:</strong>
                  <div className="mt-2 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs font-mono">
                    <div>NEXT_PUBLIC_SANITY_PROJECT_ID={projectId}</div>
                    <div>NEXT_PUBLIC_SANITY_DATASET={dataset}</div>
                    <div>NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01</div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="font-bold">4.</span>
                <div>
                  <strong>Run Studio locally:</strong>
                  <div className="mt-2 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
                    npx sanity start
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    This will start the Studio at <code>http://localhost:3333</code>
                  </p>
                </div>
              </li>
            </ol>
          </details>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Or manage your project directly at{' '}
              <a 
                href={`https://www.sanity.io/manage/project/${projectId}`}
                target="_blank" 
                rel="noopener"
                className="text-blue-600 hover:underline"
              >
                sanity.io/manage/project/{projectId}
              </a>
            </p>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          See <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">SANITY_SETUP.md</code> for detailed instructions.
        </div>
      </div>
    </div>
  )
}

