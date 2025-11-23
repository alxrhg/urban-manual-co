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
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer ${
        className || ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-medium text-base text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

