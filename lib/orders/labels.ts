import type { Order, OrderItem } from "@/lib/supabase/types";

// "Jollof Rice (Large)" — an order line with its bowl size, if any.
export function orderLineName(item: Pick<OrderItem, "name" | "size_name">) {
  return item.size_name ? `${item.name} (${item.size_name})` : item.name;
}

// "Delivering to: <address> (Uvwie)" / "Pickup order".
export function deliverySummary(order: Pick<Order, "fulfillment" | "delivery_address" | "delivery_zone">) {
  if (order.fulfillment === "pickup") return "Pickup order";
  return `Delivering to: ${order.delivery_address ?? ""}${order.delivery_zone ? ` (${order.delivery_zone})` : ""}`;
}
