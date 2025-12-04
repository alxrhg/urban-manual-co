"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

export default function ProfileAvatar({ avatarUrl, initials, onUpload }: {
  avatarUrl?: string | null;
  initials?: string;
  onUpload?: (file: File) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      await onUpload(file);
      setOpen(false);
    }
  };

  // Focus management for modal
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div className="flex flex-col items-center text-center um-transition">
      <button
        type="button"
        className="relative group w-36 h-36 rounded-[6px] overflow-hidden bg-gray-800 border border-gray-700 um-transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
        onClick={() => setOpen(true)}
        aria-label={`Change profile photo${initials ? ` for ${initials}` : ''}`}
      >
        {avatarUrl && !imageError ? (
          <Image
            src={avatarUrl}
            alt="Profile avatar"
            fill
            className="object-cover um-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-3xl font-medium" aria-hidden="true">
            {initials}
          </div>
        )}

        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition-opacity var(--motion-medium) var(--ease-soft)" aria-hidden="true">
          Change Photo
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-upload-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm um-transition cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close dialog"
          />
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative bg-gray-900 p-6 rounded-xl w-full max-w-md um-transition focus:outline-none"
          >
            <p id="profile-upload-title" className="text-gray-300 text-sm mb-4">Upload a new profile photo</p>
            <label htmlFor="profile-photo-input" className="sr-only">Choose profile photo</label>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="text-gray-300 text-sm"
            />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="text-gray-300 hover:text-white um-transition focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

