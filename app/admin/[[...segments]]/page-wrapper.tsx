'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Wrapper component that checks Supabase auth before rendering Payload admin
 * This ensures only Supabase-authenticated admins can access Payload
 */
export default function PayloadAdminWrapper() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/auth/login?redirect=/admin')
          return
        }

        // Check if user has admin role
        const role = (session.user.app_metadata as Record<string, any> | null)?.role
        if (role !== 'admin') {
          router.push('/account?error=unauthorized')
          return
        }

        // User is authenticated and is admin
        setIsAuthorized(true)
      } catch (error) {
        console.error('[Payload Admin] Auth check failed:', error)
        router.push('/auth/login?redirect=/admin')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Router will handle redirect
  }

  // Render Payload admin - it will be handled by Payload's Next.js integration
  return null
}

