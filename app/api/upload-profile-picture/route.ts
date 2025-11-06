import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { applyRateLimit, getRateLimitHeaders, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ SECURITY FIX: Apply rate limiting (prevent upload abuse)
    const identifier = getRateLimitIdentifier(request, user.id);
    const { success, ...rateLimit } = await applyRateLimit(identifier, RATE_LIMITS.UPLOAD);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Upload rate limit exceeded. Please try again later.',
          limit: rateLimit.limit,
          reset: new Date(rateLimit.reset).toISOString(),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // 2. Use service role client for storage operations
    const supabaseAdmin = createServiceRoleClient();

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ✅ SECURITY FIX: Strict file type validation (whitelist approach)
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed',
        provided: file.type
      }, { status: 400 });
    }

    // Validate file size (max 2MB for profile pictures)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({
        error: 'File size must be less than 2MB',
        size: file.size,
        maxSize: MAX_SIZE
      }, { status: 400 });
    }

    // TODO: For production, consider adding magic byte verification with 'file-type' package
    // or image validation with 'sharp' package to prevent file type spoofing

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `profile-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Upload to Supabase Storage
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Overwrite existing profile picture
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    // Update user profile with avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Update error:', updateError);
      // Still return the URL even if update fails
    }

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: filePath
    });

  } catch (error: any) {
    console.error('[Upload Profile Picture] Error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      // Only expose error details in development
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    }, { status: 500 });
  }
}

