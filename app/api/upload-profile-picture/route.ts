import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  uploadRatelimit,
  memoryUploadRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import {
  validateImageFile,
  getSafeExtension,
} from '@/lib/security/image-validation';
import { withErrorHandling } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Verify user is authenticated
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting: 3 uploads per minute
  const identifier = getIdentifier(request, user.id);
  const ratelimit = isUpstashConfigured() ? uploadRatelimit : memoryUploadRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many upload requests. Please wait a moment.',
      limit,
      remaining,
      reset
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

  // Validate file size first (max 2MB for profile pictures)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File size must be less than 2MB' },
      { status: 400 }
    );
  }

  // Validate image using magic bytes (prevents MIME type spoofing)
  const validation = await validateImageFile(file);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || 'Invalid image file' },
      { status: 400 }
    );
  }

  // Use safe extension from detected MIME type (not user-provided)
  const safeExt = getSafeExtension(validation.detectedMime!);
  const fileName = `profile-${user.id}-${Date.now()}.${safeExt}`;
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
});

