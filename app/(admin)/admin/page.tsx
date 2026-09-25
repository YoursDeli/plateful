import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOverview, growth, type PeriodStats } from "@/lib/admin/stats";
import { requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

// Admin home: revenue + orders processed today / this week / this month,
// each with growth vs the same point in the previous period.
export default async function AdminOverviewPage() {
  await requireStaff("/admin");
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-secondary sm:text-3xl">Overview</h1>
        <p className="text-sm text-neutral-dark/65">
          Revenue and orders processed (paid, not cancelled). Lagos time.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {overview.periods.map((p) => (
          <li key={p.key}>
            <PeriodCard stats={p} />
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li>
          <Link href="/admin/orders" className="flex h-full flex-col gap-1 rounded-2xl bg-white card-accent p-5 shadow-sm ring-1 ring-secondary/5 transition hover:ring-secondary/20">
            <span className="text-sm text-neutral-dark/65">Active orders</span>
            <span className="font-display text-3xl font-semibold text-secondary tabular-nums">{overview.activeOrders}</span>
            <span className="text-xs text-neutral-dark/65">Paid and not yet delivered</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/orders?tab=cancelled" className="flex h-full flex-col gap-1 rounded-2xl bg-white card-accent p-5 shadow-sm ring-1 ring-secondary/5 transition hover:ring-secondary/20">
            <span className="text-sm text-neutral-dark/65">Refunds due</span>
            <span className={`font-display text-3xl font-semibold tabular-nums ${overview.refundsDue > 0 ? "text-red-700" : "text-secondary"}`}>
              {overview.refundsDue}
            </span>
            <span className="text-xs text-neutral-dark/65">Cancelled paid orders not yet marked refunded</span>
          </Link>
        </li>
        <li className="flex flex-col gap-1 rounded-2xl bg-white card-accent p-5 shadow-sm ring-1 ring-secondary/5">
          <span className="text-sm text-neutral-dark/65">Average order (this month)</span>
          <span className="font-display text-3xl font-semibold text-secondary tabular-nums">
            {overview.avgOrderValueMonth === null ? "—" : formatNaira(Math.round(overview.avgOrderValueMonth))}
          </span>
          <span className="text-xs text-neutral-dark/65">Revenue ÷ orders processed</span>
        </li>
      </ul>
    </div>
  );
}

function PeriodCard({ stats }: { stats: PeriodStats }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl bg-white card-accent p-5 shadow-sm ring-1 ring-secondary/5">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-dark/65 uppercase">{stats.label}</h2>
      <div>
        <p className="text-xs text-neutral-dark/65">Revenue</p>
        <p className="font-display text-3xl font-semibold text-secondary tabular-nums">{formatNaira(stats.revenue)}</p>
        <Growth value={growth(stats.revenue, stats.prevRevenue)} />
      </div>
      <div>
        <p className="text-xs text-neutral-dark/65">Orders processed</p>
        <p className="font-display text-2xl font-semibold text-neutral-dark tabular-nums">{stats.orders}</p>
        <Growth value={growth(stats.orders, stats.prevOrders)} />
      </div>
      <p className="mt-auto text-xs text-neutral-dark/65">
        {stats.comparedTo}: {formatNaira(stats.prevRevenue)} · {stats.prevOrders} order{stats.prevOrders === 1 ? "" : "s"}
      </p>
    </article>
  );
}

function Growth({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-medium text-neutral-dark/65">New — nothing to compare yet</span>;
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return <span className="text-xs font-medium text-neutral-dark/65">No change</span>;
  }
  const up = rounded > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-green-700" : "text-red-700"}`}>
      <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 ${up ? "" : "rotate-180"}`} fill="currentColor">
        <path d="M6 2 11 9H1z" />
      </svg>
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {Math.abs(rounded)}%
    </span>
  );
}
