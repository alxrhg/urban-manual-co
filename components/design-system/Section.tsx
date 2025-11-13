import * as React from 'react';
import { cn } from '@/lib/utils';
import { spacingTokens, typographyTokens } from './tokens';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements;
  bleed?: boolean;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ as: Component = 'section', className, bleed = false, ...props }, ref) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          'w-full',
          spacingTokens.sectionY,
          bleed ? null : spacingTokens.inlinePadding,
          className
        )}
        {...props}
      />
    );
  }
);
Section.displayName = 'Section';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const SectionHeader = React.forwardRef<HTMLHeadingElement, SectionHeaderProps>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn(typographyTokens.sectionTitle, className)} {...props} />
  )
);
SectionHeader.displayName = 'SectionHeader';

export interface SectionDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const SectionDescription = React.forwardRef<HTMLParagraphElement, SectionDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('max-w-2xl', typographyTokens.sectionDescription, className)} {...props} />
  )
);
SectionDescription.displayName = 'SectionDescription';
