'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthFormShellProps {
  title: string;
  subtitle?: string;
  notice?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  showDivider?: boolean;
  backHref?: string;
}

export function AuthFormShell({
  title,
  subtitle,
  notice,
  actions,
  children,
  footer,
  className,
  showDivider = true,
  backHref = '/',
}: AuthFormShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white px-6 py-20 dark:bg-gray-900 md:px-10">
      <div className={cn('mx-auto w-full max-w-md', className)}>
        <button
          onClick={() => router.push(backHref)}
          className="mb-12 flex items-center gap-2 text-xs text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          <span>Back</span>
        </button>

        <div className="mb-10">
          <h1 className="mb-2 text-2xl font-light">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>

        {notice && <div className="mb-6 space-y-4">{notice}</div>}

        {actions && (
          <div className="mb-6 space-y-3">
            {actions}
          </div>
        )}

        {actions && showDivider && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 dark:bg-gray-950 dark:text-gray-500">Or</span>
            </div>
          </div>
        )}

        <div className="space-y-4">{children}</div>

        {footer && <div className="mt-12 text-center text-xs text-gray-400 dark:text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}
