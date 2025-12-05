'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface DestinationHeroProps {
  image: string | null | undefined;
  name: string;
}

export function DestinationHero({ image, name }: DestinationHeroProps) {
  if (!image) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-gray-800">
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 420px"
        priority={false}
        quality={85}
      />
    </div>
  );
}
