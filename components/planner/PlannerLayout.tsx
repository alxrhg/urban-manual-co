import { PropsWithChildren } from "react";

type PlannerLayoutComponent = (({ children }: PropsWithChildren) => JSX.Element) & {
  Windows: typeof WindowsContainer;
};

const PlannerLayoutBase = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-zinc-950 dark:text-white">
      <div className="mx-auto max-w-7xl space-y-4">{children}</div>
    </div>
  );
};

function WindowsContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      <div className="flex h-full flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-full w-full gap-4 p-4">{children}</div>
      </div>
    </div>
  );
}

const PlannerLayout = PlannerLayoutBase as PlannerLayoutComponent;
PlannerLayout.Windows = WindowsContainer;

export { PlannerLayout };
