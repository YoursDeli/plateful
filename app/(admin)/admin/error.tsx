"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-medium">Something went wrong.</p>
      <p className="mt-1">{error.message}</p>
      <button type="button" onClick={reset} className="mt-3 underline">
        Try again
      </button>
    </div>
  );
}
