import type { Faq } from "@/lib/supabase/types";

// FAQ accordion (/faq page and checkout). Native <details>: keyboard and
// screen-reader friendly, works without JavaScript. "{brand}" in a question
// or answer becomes the business name.
export function FaqList({ faqs, brandName }: { faqs: Faq[]; brandName: string }) {
  const brand = (text: string) => text.replaceAll("{brand}", brandName);
  return (
    <ul className="flex flex-col divide-y divide-secondary/10">
      {faqs.map((faq) => (
        <li key={faq.id}>
          <details className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 font-medium text-secondary [&::-webkit-details-marker]:hidden">
              <span>{brand(faq.question)}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4 shrink-0 transition group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="pb-4 text-sm leading-relaxed whitespace-pre-line text-neutral-dark/80">{brand(faq.answer)}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
