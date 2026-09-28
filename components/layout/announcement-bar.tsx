// Continuously scrolling notice under the header (client). Text comes from
// site_settings.announcement_text (Admin → Settings); blank hides the bar.
// The moving copies are hidden from screen readers, which get the text once.
// With reduced motion the text sits still and wraps instead.
export function AnnouncementBar({ text }: { text: string | null }) {
  const message = text?.trim();
  if (!message) return null;

  // Repeat within each half so the strip stays full on wide screens.
  const half = (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {[0, 1, 2].map((i) => (
        <span key={i} className="whitespace-nowrap">
          {message}
        </span>
      ))}
    </div>
  );

  return (
    <div role="region" aria-label="Announcement" className="overflow-hidden bg-secondary text-sm font-medium text-primary">
      <p className="sr-only">{message}</p>
      <div
        aria-hidden="true"
        className="flex w-max animate-marquee py-2 motion-reduce:hidden"
        style={{ "--marquee-duration": `${Math.max(20, message.length * 0.45)}s` } as React.CSSProperties}
      >
        {half}
        {half}
      </div>
      <p aria-hidden="true" className="hidden px-4 py-2 text-center motion-reduce:block">
        {message}
      </p>
    </div>
  );
}
