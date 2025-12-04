import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { createServerClient } from '@/lib/supabase/server';
import {
  uploadRatelimit,
  memoryUploadRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { withErrorHandling } from '@/lib/errors';
import { CustomError, ErrorCode } from '@/lib/errors/types';

// Allowed file types for different upload contexts
const ALLOWED_TYPES: Record<string, string[]> = {
  'trip-photo': ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  'itinerary-attachment': [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
};

// Max file sizes (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  'trip-photo': 10 * 1024 * 1024, // 10MB for photos
  'itinerary-attachment': 5 * 1024 * 1024, // 5MB for attachments
};

// Default limits
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type UploadContext = 'trip-photo' | 'itinerary-attachment';

interface UploadResponse {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * POST /api/upload/blob
 * Upload a file to Vercel Blob storage
 *
 * Form data:
 * - file: File (required) - The file to upload
 * - context: string (optional) - Upload context: 'trip-photo' | 'itinerary-attachment'
 * - tripId: string (optional) - Associated trip ID for organizing files
 * - prefix: string (optional) - Custom path prefix
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Verify user is authenticated
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CustomError(
      ErrorCode.UNAUTHORIZED,
      'You must be logged in to upload files',
      401
    );
  }

  // 2. Apply rate limiting (10 uploads per minute per user)
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

  // 3. Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const context = (formData.get('context') as UploadContext) || 'trip-photo';
  const tripId = formData.get('tripId') as string | null;
  const customPrefix = formData.get('prefix') as string | null;

  // 4. Validate file presence
  if (!file) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      'No file provided',
      400
    );
  }

  // 5. Validate file type
  const allowedTypes = ALLOWED_TYPES[context] || DEFAULT_ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      400
    );
  }

  // 6. Validate file size
  const maxSize = MAX_FILE_SIZES[context] || DEFAULT_MAX_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      `File size exceeds ${maxSizeMB}MB limit`,
      400
    );
  }

  // 7. Generate file path
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  let pathname: string;
  if (customPrefix) {
    pathname = `${customPrefix}/${timestamp}-${randomSuffix}.${fileExt}`;
  } else if (tripId) {
    pathname = `trips/${tripId}/${context}/${timestamp}-${randomSuffix}.${fileExt}`;
  } else {
    pathname = `users/${user.id}/${context}/${timestamp}-${randomSuffix}.${fileExt}`;
  }

  // 8. Upload to Vercel Blob
  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: false, // We already added our own suffix
  });

  // 9. Return upload result
  const response: UploadResponse = {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
  };

  return NextResponse.json(response);
});

/**
 * DELETE /api/upload/blob
 * Delete a file from Vercel Blob storage
 *
 * Query params:
 * - url: string (required) - The blob URL to delete
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  // 1. Verify user is authenticated
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CustomError(
      ErrorCode.UNAUTHORIZED,
      'You must be logged in to delete files',
      401
    );
  }

  // 2. Get URL to delete
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('url');

  if (!blobUrl) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      'No URL provided',
      400
    );
  }

  // 3. Verify the URL belongs to the user (basic security check)
  // The pathname should contain the user ID for user-owned files
  const urlObj = new URL(blobUrl);
  const pathname = urlObj.pathname;

  // Allow deletion if:
  // - Path contains user's ID (their own uploads)
  // - User is admin (can delete any file)
  const isOwnFile = pathname.includes(`/users/${user.id}/`);
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  if (!isOwnFile && !isAdmin) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'You can only delete your own files',
      403
    );
  }

  // 4. Delete from Vercel Blob
  await del(blobUrl);

  return NextResponse.json({ success: true });
});
