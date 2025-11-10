"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProfileAvatar({ avatarUrl, initials, onUpload }: {
  avatarUrl?: string | null;
  initials?: string;
  onUpload?: (file: File) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      await onUpload(file);
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center um-transition">
      <div
        className="relative group w-36 h-36 rounded-[6px] overflow-hidden bg-neutral-800 border border-neutral-700 um-transition cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill className="object-cover um-image" />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 text-3xl font-medium">
            {initials}
          </div>
        )}

        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition-opacity var(--motion-medium) var(--ease-soft)">
          Change Photo
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm um-transition" onClick={() => setOpen(false)} />
          <div className="relative bg-neutral-900 p-6 rounded-xl w-full max-w-md um-transition">
            <p className="text-neutral-300 text-sm mb-4">Upload a new profile photo</p>
            <input type="file" accept="image/*" onChange={handleFile} className="text-neutral-300 text-sm" />
            <div className="mt-6 flex justify-end">
              <button className="text-neutral-300 hover:text-white um-transition" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

