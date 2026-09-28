import "server-only";
import { cache } from "react";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DeliveryZone, Faq } from "@/lib/supabase/types";

// Public reads for checkout and the FAQ page (cookie-less anon client, so
// pages stay cacheable; admin edits revalidate them).

// Active delivery areas, in the admin's order.
export const getDeliveryZones = cache(async (): Promise<DeliveryZone[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) {
    console.error("delivery_zones load failed:", error.message);
    return [];
  }
  return data;
});

// Published FAQs, in the admin's order.
export const getFaqs = cache(async (): Promise<Faq[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error("faqs load failed:", error.message);
    return [];
  }
  return data;
});
