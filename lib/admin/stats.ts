import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

// Admin overview numbers. "Processed" = orders customers actually paid for
// and that weren't cancelled (paid → delivered). Revenue = money taken for
// them (order total, i.e. after any referral bonus). Times are Lagos time.
// Each period is compared with the SAME elapsed point of the previous period
// (today so far vs yesterday up to this time), so mornings don't look like a
// collapse against a full previous day.

const PROCESSED: OrderStatus[] = ["paid", "preparing", "ready", "out_for_delivery", "delivered"];
const LAGOS_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos is UTC+1 all year (no DST)

export type PeriodStats = {
  key: "day" | "week" | "month";
  label: string;
  comparedTo: string;
  revenue: number;
  orders: number;
  prevRevenue: number;
  prevOrders: number;
};

export type AdminOverview = {
  periods: PeriodStats[];
  activeOrders: number;
  refundsDue: number;
  avgOrderValueMonth: number | null;
};

// Wall-clock helpers in Lagos time, returned as real UTC instants.
function lagosParts(now: Date) {
  const l = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(), dow: l.getUTCDay() };
}
const lagosMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - LAGOS_OFFSET_MS);

function periodBounds(now: Date) {
  const { y, m, d, dow } = lagosParts(now);
  const dayStart = lagosMidnight(y, m, d);
  const mondayOffset = (dow + 6) % 7; // weeks start Monday
  const weekStart = lagosMidnight(y, m, d - mondayOffset);
  const monthStart = lagosMidnight(y, m, 1);

  const DAY = 24 * 60 * 60 * 1000;
  const elapsedDay = now.getTime() - dayStart.getTime();
  const elapsedWeek = now.getTime() - weekStart.getTime();
  const prevMonthStart = lagosMidnight(y, m - 1, 1);
  // Same day-of-month + time last month, capped to that month's length.
  const prevMonthEnd = new Date(
    Math.min(prevMonthStart.getTime() + (now.getTime() - monthStart.getTime()), monthStart.getTime()),
  );

  return {
    day: { start: dayStart, prevStart: new Date(dayStart.getTime() - DAY), prevEnd: new Date(dayStart.getTime() - DAY + elapsedDay) },
    week: { start: weekStart, prevStart: new Date(weekStart.getTime() - 7 * DAY), prevEnd: new Date(weekStart.getTime() - 7 * DAY + elapsedWeek) },
    month: { start: monthStart, prevStart: prevMonthStart, prevEnd: prevMonthEnd },
    earliest: prevMonthStart < new Date(weekStart.getTime() - 7 * DAY) ? prevMonthStart : new Date(weekStart.getTime() - 7 * DAY),
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const b = periodBounds(now);
  const supabase = await createClient(); // staff session — RLS allows all orders

  const [{ data: paid, error }, active, refunds] = await Promise.all([
    supabase
      .from("orders")
      .select("total, paid_at")
      .in("status", PROCESSED)
      .gte("paid_at", b.earliest.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "preparing", "ready", "out_for_delivery"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled")
      .not("paid_at", "is", null)
      .is("refunded_at", null),
  ]);
  if (error) throw new Error("Couldn't load sales figures.");

  const rows = (paid ?? []).filter((r) => r.paid_at).map((r) => ({ t: new Date(r.paid_at!).getTime(), total: r.total }));
  const sum = (from: Date, to: Date) => {
    const inRange = rows.filter((r) => r.t >= from.getTime() && r.t < to.getTime());
    return { revenue: inRange.reduce((s, r) => s + r.total, 0), orders: inRange.length };
  };

  const period = (
    key: PeriodStats["key"],
    label: string,
    comparedTo: string,
    x: { start: Date; prevStart: Date; prevEnd: Date },
  ): PeriodStats => {
    const cur = sum(x.start, new Date(now.getTime() + 1));
    const prev = sum(x.prevStart, x.prevEnd);
    return { key, label, comparedTo, revenue: cur.revenue, orders: cur.orders, prevRevenue: prev.revenue, prevOrders: prev.orders };
  };

  const periods = [
    period("day", "Today", "vs same time yesterday", b.day),
    period("week", "This week", "vs same point last week", b.week),
    period("month", "This month", "vs same point last month", b.month),
  ];
  const month = periods[2];

  return {
    periods,
    activeOrders: active.count ?? 0,
    refundsDue: refunds.count ?? 0,
    avgOrderValueMonth: month.orders > 0 ? month.revenue / month.orders : null,
  };
}

// % change, or null when there's nothing to compare against.
export function growth(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
