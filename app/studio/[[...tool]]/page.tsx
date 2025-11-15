'use client'

export default function StudioPage() {
  const projectId = 'ryd11bal'
  const dataset = 'production'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">Sanity Studio Setup</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your Sanity Studio needs to be configured. Follow the steps below.
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
          <ol className="space-y-4 text-sm">
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
                <p className="mt-2 text-gray-600 dark:text-gray-400 text-xs">
                  This will link to the existing project or create it if it doesn't exist.
                </p>
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
          </ol>
          
          <div className="mt-6 space-y-2">
            <p className="font-semibold">Run Studio locally:</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono">
              npx sanity start
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This will start the Studio at <code>http://localhost:3333</code>
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Or manage your project at{' '}
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
        
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-2">⚠️ Not Working?</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Make sure you've completed all steps above, especially adding the environment variables.
            After adding variables, restart your Next.js dev server.
          </p>
        </div>
        
        <div className="text-sm text-gray-500">
          See <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">SANITY_SETUP.md</code> for detailed instructions.
        </div>
      </div>
    </div>
  )
}

