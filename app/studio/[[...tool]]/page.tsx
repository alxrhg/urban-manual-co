'use client'

export default function StudioPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">Sanity Studio</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sanity Studio needs to be deployed separately or run locally.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 text-left">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions:</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-bold">1.</span>
              <span>
                Create a Sanity account at{' '}
                <a href="https://sanity.io" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  sanity.io
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">2.</span>
              <span>Create a new Sanity project in your dashboard</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">3.</span>
              <span>Add environment variables to <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">.env.local</code>:</span>
            </li>
          </ol>
          
          <div className="mt-4 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs font-mono">
            <div>NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id</div>
            <div>NEXT_PUBLIC_SANITY_DATASET=production</div>
            <div>NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01</div>
          </div>
          
          <div className="mt-6 space-y-2">
            <p className="font-semibold">Run Studio locally:</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
              npx sanity start
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Or access your Studio at{' '}
              <a 
                href="https://www.sanity.io/manage" 
                target="_blank" 
                rel="noopener"
                className="text-blue-600 hover:underline"
              >
                sanity.io/manage
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

