import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { applyRateLimit, getRateLimitHeaders, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rateLimit';
import { logger, logSecurityEvent, logError, startTimer } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const timer = startTimer();

  try {
    // 1. Verify user is authenticated
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logSecurityEvent('upload_unauthorized', {
        ip: request.headers.get('x-forwarded-for') || undefined,
        success: false,
        reason: 'Not authenticated',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info({ userId: user.id, type: 'upload' }, 'Profile picture upload started');

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

    // Validate file size (max 2MB for profile pictures)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      logger.warn({
        userId: user.id,
        fileSize: file.size,
        maxSize: MAX_SIZE,
      }, 'File size exceeded');
      return NextResponse.json({
        error: 'File size must be less than 2MB',
        size: file.size,
        maxSize: MAX_SIZE
      }, { status: 400 });
    }

    // ✅ SECURITY ENHANCEMENT: Magic byte verification
    // Convert file to buffer for analysis
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify actual file type using magic bytes (not relying on client MIME type)
    const { fileTypeFromBuffer } = await import('file-type');
    const detectedType = await fileTypeFromBuffer(buffer);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

    if (!detectedType) {
      logSecurityEvent('upload_invalid_file', {
        userId: user.id,
        fileName: file.name,
        claimedType: file.type,
        success: false,
        reason: 'Could not detect file type',
      });
      return NextResponse.json({
        error: 'Invalid or corrupted image file',
      }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(detectedType.mime) || !ALLOWED_EXTENSIONS.includes(detectedType.ext)) {
      logSecurityEvent('upload_type_mismatch', {
        userId: user.id,
        fileName: file.name,
        claimedType: file.type,
        detectedType: detectedType.mime,
        detectedExt: detectedType.ext,
        success: false,
        reason: 'File type not allowed or mismatch',
      });
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed',
        detected: detectedType.mime,
        allowed: ALLOWED_TYPES,
      }, { status: 400 });
    }

    logger.info({
      userId: user.id,
      detectedType: detectedType.mime,
      detectedExt: detectedType.ext,
      fileSize: buffer.length,
    }, 'File validation passed');

    // Generate unique filename using detected extension
    const fileName = `profile-${user.id}-${Date.now()}.${detectedType.ext}`;
    const filePath = `profiles/${fileName}`;

    // Upload to Supabase Storage
    if (!supabaseAdmin) {
      logError(new Error('Service role client not available'), { userId: user.id });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(filePath, buffer, {
        contentType: detectedType.mime,
        cacheControl: '3600',
        upsert: true // Overwrite existing profile picture
      });

    if (uploadError) {
      logError(uploadError, {
        userId: user.id,
        filePath,
        operation: 'storage_upload',
      });
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    logger.info({
      userId: user.id,
      filePath,
      fileSize: buffer.length,
    }, 'File uploaded to storage');

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
      logError(updateError, {
        userId: user.id,
        operation: 'profile_update',
      });
      // Still return the URL even if update fails
    }

    const duration = timer.done('Profile picture upload completed');

    logger.info({
      userId: user.id,
      url: urlData.publicUrl,
      duration,
    }, 'Profile picture uploaded successfully');

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    });

  } catch (error: any) {
    logError(error, {
      operation: 'upload_profile_picture',
      userId: error.userId,
    });
    return NextResponse.json({
      error: 'Upload failed',
      // Only expose error details in development
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    }, { status: 500 });
  }
}

