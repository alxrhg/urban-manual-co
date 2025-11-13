import { ReactNode } from 'react';

export function HomeResultContainer({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 md:px-10 lg:px-12 pb-16 md:pb-24">
      <div className="max-w-6xl mx-auto w-full">{children}</div>
    </div>
  );
}
