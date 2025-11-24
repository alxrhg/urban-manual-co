"use client";

import { ReactNode } from "react";

interface UMSectionTitleProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section Title (editorial muted uppercase)
 */
export default function UMSectionTitle({ children, className }: UMSectionTitleProps) {
  return (
    <p className={`text-xs font-medium tracking-widest text-neutral-500 dark:text-neutral-400 uppercase ${className || ''}`}>
      {children}
    </p>
  );
}

