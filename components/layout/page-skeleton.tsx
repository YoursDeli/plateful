// Placeholder shown while a server-rendered page loads (loading.tsx): a
// heading bar and a few card shapes. Pulses only if motion is allowed.
export function PageSkeleton({
  cards = 3,
  className = "max-w-2xl px-4 py-8 sm:py-12",
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={`mx-auto flex w-full flex-col gap-5 ${className}`}>
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="h-9 w-48 rounded-lg bg-primary/40 motion-safe:animate-pulse" />
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex flex-col gap-3 rounded-xl bg-white card-accent p-4 shadow-sm motion-safe:animate-pulse sm:p-6"
        >
          <div className="h-4 w-1/3 rounded bg-primary/40" />
          <div className="h-3 w-2/3 rounded bg-neutral-dark/10" />
          <div className="h-3 w-1/2 rounded bg-neutral-dark/10" />
        </div>
      ))}
    </div>
  );
}
