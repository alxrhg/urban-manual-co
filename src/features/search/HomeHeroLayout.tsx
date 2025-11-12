import { ReactNode } from 'react';
import clsx from 'clsx';

interface HomeHeroLayoutProps {
  children: ReactNode;
  bottomSlot?: ReactNode;
  overlay?: ReactNode;
  className?: string;
}

export function HomeHeroLayout({ children, bottomSlot, overlay, className }: HomeHeroLayoutProps) {
  return (
    <section
      className={clsx(
        'min-h-[65vh] flex flex-col px-6 md:px-10 lg:px-12 py-16 md:py-24 pb-8 md:pb-12',
        className
      )}
    >
      <div className="w-full flex md:justify-start flex-1 items-center">
        <div className="relative w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
          <div className="flex-1 flex items-center">
            <div className="relative w-full">
              {children}
              {overlay}
            </div>
          </div>
          {bottomSlot}
        </div>
      </div>
    </section>
  );
}
