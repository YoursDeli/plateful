import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={2} className="max-w-6xl px-4 py-8 sm:py-12" />;
}
