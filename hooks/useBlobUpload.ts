'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UploadContext = 'trip-photo' | 'itinerary-attachment';

interface UploadOptions {
  context?: UploadContext;
  tripId?: string;
  prefix?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

interface UseBlobUploadReturn {
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult | null>;
  uploadMultiple: (files: File[], options?: UploadOptions) => Promise<UploadResult[]>;
  deleteBlob: (url: string) => Promise<boolean>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  clearError: () => void;
  requiresAuth: boolean;
}

// File size limits (must match server)
const MAX_SIZES: Record<UploadContext, number> = {
  'trip-photo': 10 * 1024 * 1024, // 10MB
  'itinerary-attachment': 5 * 1024 * 1024, // 5MB
};

// Allowed types (must match server)
const ALLOWED_TYPES: Record<UploadContext, string[]> = {
  'trip-photo': ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  'itinerary-attachment': [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
};

/**
 * Hook for uploading files to Vercel Blob storage
 * Handles authentication, validation, and progress tracking
 *
 * @example
 * ```tsx
 * const { upload, isUploading, error } = useBlobUpload();
 *
 * const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     const result = await upload(file, {
 *       context: 'trip-photo',
 *       tripId: 'my-trip-id',
 *       onSuccess: (result) => console.log('Uploaded:', result.url),
 *     });
 *   }
 * };
 * ```
 */
export function useBlobUpload(): UseBlobUploadReturn {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback(
    (file: File, context: UploadContext): string | null => {
      const allowedTypes = ALLOWED_TYPES[context];
      if (!allowedTypes.includes(file.type)) {
        return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
      }

      const maxSize = MAX_SIZES[context];
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      return null;
    },
    []
  );

  /**
   * Upload a single file to Vercel Blob
   */
  const upload = useCallback(
    async (file: File, options: UploadOptions = {}): Promise<UploadResult | null> => {
      const {
        context = 'trip-photo',
        tripId,
        prefix,
        onProgress,
        onSuccess,
        onError,
      } = options;

      // Reset state
      setError(null);
      setProgress(0);

      // Client-side validation
      const validationError = validateFile(file, context);
      if (validationError) {
        const err = new Error(validationError);
        setError(err);
        onError?.(err);
        return null;
      }

      setIsUploading(true);
      abortControllerRef.current = new AbortController();

      try {
        // Build form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', context);
        if (tripId) formData.append('tripId', tripId);
        if (prefix) formData.append('prefix', prefix);

        // Simulate progress (actual XHR progress not available with fetch)
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            const next = Math.min(prev + 10, 90);
            onProgress?.(next);
            return next;
          });
        }, 100);

        const response = await fetch('/api/upload/blob', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Upload failed');
        }

        const result: UploadResult = await response.json();

        setProgress(100);
        onProgress?.(100);
        onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        if (error.name !== 'AbortError') {
          setError(error);
          onError?.(error);
        }
        return null;
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [validateFile]
  );

  /**
   * Upload multiple files in sequence
   */
  const uploadMultiple = useCallback(
    async (files: File[], options: UploadOptions = {}): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileProgress = (i / totalFiles) * 100;

        const result = await upload(file, {
          ...options,
          onProgress: (p) => {
            const overallProgress = fileProgress + (p / totalFiles);
            options.onProgress?.(overallProgress);
          },
        });

        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [upload]
  );

  /**
   * Delete a blob by URL
   */
  const deleteBlob = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/upload/blob?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Delete failed');
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Delete failed');
      setError(error);
      return false;
    }
  }, []);

  return {
    upload,
    uploadMultiple,
    deleteBlob,
    isUploading,
    progress,
    error,
    clearError,
    requiresAuth: !user,
  };
}
