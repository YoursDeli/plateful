// Unlike the layout, a template remounts on every navigation, so each
// storefront page gets a short fade-in (instant with reduced motion).
export default function StorefrontTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col animate-page-in">{children}</div>;
}
