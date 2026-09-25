import ReactMarkdown from "react-markdown";

// Renders admin-written page content. react-markdown never renders raw HTML,
// so page text can't inject scripts. Styled for readable long-form copy.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed text-neutral-dark/85">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2 className="mt-4 font-display text-3xl font-semibold text-secondary">{children}</h2>,
          h2: ({ children }) => <h2 className="mt-4 font-display text-2xl font-semibold text-secondary">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2 text-lg font-semibold text-secondary">{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-6">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-dark">{children}</strong>,
          em: ({ children }) => <em className="text-neutral-dark/65">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-secondary underline underline-offset-4"
              {...(href?.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
