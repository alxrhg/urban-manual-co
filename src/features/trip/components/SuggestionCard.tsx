'use client';

import React from 'react';

interface SuggestionCardProps {
  icon: string;
  title: string;
  detail: string;
  onClick?: () => void;
  className?: string;
}

export default function SuggestionCard({
  icon,
  title,
  detail,
  onClick,
  className,
}: SuggestionCardProps) {
  return (
    <div
      className={`rounded-[var(--um-radius-lg)] border border-[var(--um-border)] p-5 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer ${
        className || ''
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3 items-start">
        <div className="text-xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-[500] text-[16px] text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-[var(--um-text-muted)] mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

