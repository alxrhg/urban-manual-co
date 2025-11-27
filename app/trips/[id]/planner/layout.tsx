import { ReactNode } from 'react';

interface PlannerLayoutProps {
  children: ReactNode;
}

/**
 * Trip Planner Layout - Editorial Intelligence Theme v3.0.0
 * Minimalist shell with serif typography for titles
 */
export default function PlannerLayout({ children }: PlannerLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#0a0a0a]">
      {children}
    </div>
  );
}
