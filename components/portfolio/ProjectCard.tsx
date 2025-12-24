'use client';

import { memo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Project } from '@/types/portfolio';

interface ProjectCardProps {
  project: Project;
  index?: number;
}

export const ProjectCard = memo(function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger the animation based on index
          const delay = (index % 6) * 50;
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  const href = project.slug ? `/portfolio/project/${project.slug}` : '#';

  return (
    <div
      ref={cardRef}
      className={`group transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <Link href={href} className="block">
        {/* Image container */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--editorial-bg-secondary)]">
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800" />
          )}

          <Image
            src={project.image}
            alt={project.title}
            fill
            className={`object-cover transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } group-hover:scale-105`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onLoad={() => setImageLoaded(true)}
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        </div>

        {/* Card info */}
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium leading-snug text-[var(--editorial-text-primary)] line-clamp-2 transition-colors group-hover:text-[var(--editorial-accent)]">
            {project.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[var(--editorial-text-secondary)]">
            <span>{project.year}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-current" />
            <span>{project.category}</span>
          </div>
        </div>
      </Link>
    </div>
  );
});

export default ProjectCard;
