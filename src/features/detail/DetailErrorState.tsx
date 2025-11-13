import { DestinationDetailIssues } from './data';

interface DetailErrorStateProps {
  slug: string;
  issues?: DestinationDetailIssues;
}

export default function DetailErrorState({ slug, issues }: DetailErrorStateProps) {
  const errorMessage = issues?.destination || issues?.parent || issues?.nested;
  const diagnostics = issues && Object.keys(issues).length > 0 ? issues : { unknown: 'No additional diagnostics' };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <span className="text-2xl" aria-hidden>
          !
        </span>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Something went wrong loading this destination
        </h1>
        <p className="max-w-xl text-sm text-gray-600 dark:text-gray-400">
          We couldn’t load <strong className="font-semibold">{slug}</strong> due to a temporary data issue.
          {errorMessage ? ` ${errorMessage}` : ' Please try again in a few moments.'}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
        <p className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Diagnostic details
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {Object.entries(diagnostics).map(([key, value]) => (
            <li key={key}>
              <span className="font-medium capitalize">{key}:</span> {value || 'Temporarily unavailable'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
