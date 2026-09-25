"use client";

// Last-resort screen if the root layout itself fails. It replaces the whole
// document, so it can't rely on the site's fonts, theme or settings.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#fbf8f3",
          color: "#1a1a1a",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ color: "#3b2a60", fontSize: "1.75rem", margin: "0 0 0.75rem" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 1.5rem" }}>The site didn&apos;t load properly. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#d3c5f6",
              color: "#3b2a60",
              border: 0,
              borderRadius: 12,
              padding: "0.65rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
