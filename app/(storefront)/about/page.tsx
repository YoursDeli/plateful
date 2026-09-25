import type { Metadata } from "next";
import { ContentPage, contentPageTitle } from "@/components/content/content-page";

// Admin-editable (/admin/pages). Cached; saving in admin revalidates it.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return { title: await contentPageTitle("about") };
}

export default function Page() {
  return <ContentPage slug="about" />;
}
