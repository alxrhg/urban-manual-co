'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  displayName?: string;
  onUploadComplete: (newAvatarUrl: string) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  displayName = 'User',
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      onUploadComplete(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-800 dark:bg-neutral-800 border border-neutral-700 dark:border-neutral-700 flex items-center justify-center shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-neutral-400 dark:text-neutral-400 text-4xl font-medium">
              {getInitials(displayName)}
            </span>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="Change profile picture"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Click the camera icon to upload a new photo
        <br />
        <span className="text-xs">Max size: 2MB</span>
      </p>
    </div>
  );
}
