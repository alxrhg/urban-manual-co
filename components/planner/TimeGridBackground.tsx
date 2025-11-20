export function TimeGridBackground({ rows }: { rows: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-12 border-b border-dashed border-gray-200 last:border-b-0 dark:border-zinc-800"
        />
      ))}
    </div>
  );
}
