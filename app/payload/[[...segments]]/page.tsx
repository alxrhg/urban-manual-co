'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Payload Admin Page with Supabase Authentication
 * 
 * This page protects Payload's admin UI with your existing Supabase authentication.
 * Only users with admin role in Supabase can access Payload CMS.
 * 
 * Route: /payload
 */
export default function PayloadAdminPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/auth/login?redirect=/payload')
          return
        }

        // Check if user has admin role
        const role = (session.user.app_metadata as Record<string, any> | null)?.role
        if (role !== 'admin') {
          router.push('/account?error=unauthorized')
          return
        }

        // User is authenticated and is admin - allow access to Payload
        setIsAuthorized(true)
      } catch (error) {
        console.error('[Payload Admin] Auth check failed:', error)
        router.push('/auth/login?redirect=/payload')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Router will handle redirect
  }

  // Payload's admin UI will be rendered by Next.js integration
  // The actual admin UI is served by Payload's internal routing
  return null
}

