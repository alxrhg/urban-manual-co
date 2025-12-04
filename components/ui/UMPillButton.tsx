'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * @deprecated Use Button component with variant="pill" or variant="pill-primary" instead.
 *
 * Migration guide:
 * - UMPillButton variant="default" → <Button variant="pill" size="pill">
 * - UMPillButton variant="primary" → <Button variant="pill-primary" size="pill">
 *
 * Example:
 * Before: <UMPillButton variant="primary">Click me</UMPillButton>
 * After:  <Button variant="pill-primary" size="pill">Click me</Button>
 */
interface UMPillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary';
  className?: string;
  icon?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * @deprecated Use Button component instead. See migration guide above.
 */
export default function UMPillButton({
  children,
  onClick,
  variant = 'default',
  className,
  icon,
  disabled = false,
  type = 'button',
}: UMPillButtonProps) {
  // Map old variants to new Button variants
  const buttonVariant = variant === 'primary' ? 'pill-primary' : 'pill';

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={buttonVariant}
      size="pill"
      className={className}
    >
      {icon && <span className="text-[15px]">{icon}</span>}
      {children}
    </Button>
  );
}

