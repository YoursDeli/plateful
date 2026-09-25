import { PageSkeleton } from "@/components/layout/page-skeleton";

// Inside the admin <main>, which already has padding.
export default function Loading() {
  return <PageSkeleton cards={4} className="max-w-5xl" />;
}
