/**
 * Skip Navigation Component
 *
 * Provides keyboard users quick access to main content sections.
 * Visible only when focused.
 */

'use client';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipNavigationProps {
  /** Additional skip links beyond main content */
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
];

export function SkipNavigation({ links = defaultLinks }: SkipNavigationProps) {
  const allLinks = links.length > 0 ? links : defaultLinks;

  return (
    <div className="skip-navigation">
      {allLinks.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-black focus:text-white dark:focus:bg-white dark:focus:text-black focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white focus:font-medium focus:text-sm"
          style={{
            left: `${16 + index * 200}px`,
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Landmark region component for accessibility
 */
interface LandmarkProps {
  as?: 'main' | 'nav' | 'aside' | 'section' | 'article' | 'header' | 'footer';
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  children: React.ReactNode;
}

export function Landmark({
  as: Component = 'main',
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  children,
}: LandmarkProps) {
  return (
    <Component
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * Main content wrapper with skip target
 */
interface MainContentProps {
  className?: string;
  children: React.ReactNode;
}

export function MainContent({ className, children }: MainContentProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={className}
      // Remove outline when focused via skip link
      style={{ outline: 'none' }}
    >
      {children}
    </main>
  );
}
