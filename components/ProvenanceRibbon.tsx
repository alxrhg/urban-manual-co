interface ProvenanceRibbonProps {
  variant?: 'default' | 'compact';
}

export function ProvenanceRibbon({ variant = 'default' }: ProvenanceRibbonProps) {
  const className =
    variant === 'compact'
      ? 'provenance-ribbon text-[0.55rem] px-2 py-1'
      : 'provenance-ribbon text-[0.65rem] px-3 py-1.5';

  return (
    <span className={`${className} slide-up`}>
      <span className="compass-indicator" aria-hidden />
      <span>AI-assisted • Editor-approved</span>
    </span>
  );
}
