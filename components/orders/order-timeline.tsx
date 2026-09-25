import type { TimelineStep } from "@/lib/orders/status";

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

// Vertical timeline (docs/ui-components-and-styling.md §1): completed = Velvet
// ✓ + timestamp; current = Lavender with a pulse ring; future = outlined,
// greyed, no timestamp (never a fake one).
export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-9 bottom-0 left-[17px] border-l-2 border-dotted ${
                  step.state === "completed" ? "border-secondary/60" : "border-secondary/20"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                step.state === "completed"
                  ? "bg-secondary text-white"
                  : step.state === "current"
                    ? "bg-primary text-secondary ring-4 ring-primary/40"
                    : "border-2 border-secondary/25 bg-white text-transparent"
              }`}
            >
              {step.state === "current" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
              )}
              <span className="relative">✓</span>
            </span>
            <div className="flex min-w-0 flex-1 flex-col pt-1">
              <p className={`font-semibold ${step.state === "future" ? "text-neutral-dark/60" : "text-neutral-dark"}`}>
                {step.title}
                <span className="sr-only">
                  {step.state === "completed" ? " (done)" : step.state === "current" ? " (current step)" : " (upcoming)"}
                </span>
              </p>
              <p className={`text-sm ${step.state === "future" ? "text-neutral-dark/55" : "text-neutral-dark/65"}`}>
                {step.description}
              </p>
              {step.timestamp && (
                <time dateTime={step.timestamp} className="mt-0.5 text-xs text-neutral-dark/65">
                  {time(step.timestamp)}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
