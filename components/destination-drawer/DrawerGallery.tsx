'use client';

import Image from 'next/image';

interface DrawerGalleryProps {
    imageUrl?: string | null;
    altText: string;
}

export function DrawerGallery({ imageUrl, altText }: DrawerGalleryProps) {
    if (!imageUrl) return null;

    return (
        <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 relative group">
            <Image
                src={imageUrl}
                alt={altText}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                quality={85}
                priority
            />
            {/* TODO: Add lightbox functionality */}
            {/* TODO: Add image carousel for multiple images */}
        </div>
    );
}
