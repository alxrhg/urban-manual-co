"use client";

import { ReactNode } from "react";

interface UMSectionTitleProps {
  children: ReactNode;
}

/**
 * Section Title (editorial muted uppercase)
 */
export default function UMSectionTitle({ children }: UMSectionTitleProps) {
  return (
    <p className="um-eyebrow text-[11px] tracking-[0.35em]">
      {children}
    </p>
  );
}

