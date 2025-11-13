import { ReactNode } from 'react';

interface HomeHeroShellProps {
  header: ReactNode;
  filters?: ReactNode;
  controls: ReactNode;
}

export function HomeHeroShell({ header, filters, controls }: HomeHeroShellProps) {
  return (
    <section className="min-h-[65vh] flex flex-col px-6 md:px-10 lg:px-12 py-16 md:py-24 pb-8 md:pb-12">
      {header}
      {filters ? <div className="mt-10">{filters}</div> : null}
      <div className="mt-8 md:mt-12">{controls}</div>
    </section>
  );
}
