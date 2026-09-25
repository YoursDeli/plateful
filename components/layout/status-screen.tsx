// Shared layout for "not found" / "something went wrong" screens: a short
// headline, one sentence, and a couple of ways back. Text only (client).
export function StatusScreen({
  eyebrow,
  title,
  message,
  children,
}: {
  eyebrow: string;
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center animate-rise-in">
      <p className="text-sm font-semibold tracking-wider text-secondary/80 uppercase">{eyebrow}</p>
      <h1 className="font-display text-3xl font-semibold text-secondary sm:text-4xl">{title}</h1>
      <p className="text-neutral-dark/70">{message}</p>
      <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{children}</div>
    </main>
  );
}

export const primaryAction =
  "rounded-btn bg-primary px-5 py-2.5 text-sm font-medium text-secondary transition hover:brightness-95";
export const secondaryAction =
  "rounded-btn border border-secondary/20 bg-white px-5 py-2.5 text-sm font-medium text-secondary transition hover:bg-primary/20";
