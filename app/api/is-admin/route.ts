import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/is-admin
 * Securely check if the authenticated user is an admin
 * Uses Supabase Auth to verify identity (not just email header)
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user via Supabase Auth
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Must be authenticated
    if (authError || !user || !user.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    // Check if user's email is in admin list
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const isAdmin = adminEmails.includes(user.email.toLowerCase())

    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}


