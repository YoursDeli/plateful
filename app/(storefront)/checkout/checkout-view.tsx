"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { CtaButton } from "@/components/ui/cta-button";
import { useCartRefresh } from "@/components/cart/use-cart-refresh";
import { cartSubtotal, useCart } from "@/lib/cart/store";
import { amountToFreeDelivery, deliveryFeeFor } from "@/lib/delivery";
import { formatPoints, pointsForAmount } from "@/lib/loyalty";
import { formatNaira } from "@/lib/money";
import type { Fulfillment, Profile, SiteSettings } from "@/lib/supabase/types";
import { placeOrder, type CheckoutState } from "./actions";

type Pricing = Pick<SiteSettings, "delivery_fee" | "free_delivery_threshold">;
type Loyalty = Pick<SiteSettings, "loyalty_enabled" | "loyalty_points_per_1000">;

const input =
  "w-full rounded-xl border border-secondary/20 bg-white px-4 py-3 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary";

export function CheckoutView({
  signedIn,
  email,
  profile,
  pricing,
  loyalty,
}: {
  signedIn: boolean;
  email: string | null;
  profile: Profile | null;
  pricing: Pricing;
  loyalty: Loyalty;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const hasHydrated = useCart((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <p className="py-16 text-center text-neutral-dark/50">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-secondary/20 px-6 py-14 text-center">
        <p className="font-display text-2xl text-secondary">Your cart is empty</p>
        <Link href="/menu" className="rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-secondary">
          Browse the menu
        </Link>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section className="rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-secondary">Sign in to check out</h2>
          <p className="mt-1 mb-6 text-sm text-neutral-dark/65">
            You&apos;ll need an account to track your order. Your cart is saved — you&apos;ll pick up right here.
          </p>
          {/* Inline sign-in: re-render this page with the new session. */}
          <SignInPanel next="/checkout" onSignedIn={() => router.refresh()} />
        </section>
        <OrderSummary fulfillment="delivery" pricing={pricing} />
      </div>
    );
  }

  return <CheckoutForm email={email} profile={profile} pricing={pricing} loyalty={loyalty} />;
}

function CheckoutForm({
  email,
  profile,
  pricing,
  loyalty,
}: {
  email: string | null;
  profile: Profile | null;
  pricing: Pricing;
  loyalty: Loyalty;
}) {
  const items = useCart((s) => s.items);
  const notices = useCart((s) => s.notices);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  const [fulfillment, setFulfillment] = useState<Fulfillment>(
    (v?.fulfillment as Fulfillment | undefined) ?? "delivery",
  );
  // Re-check prices/availability on arrival, and again whenever the server
  // says a dish sold out while they were filling the form.
  useCartRefresh(true, state.code === "items_unavailable" ? state : null);

  const blocked = items.some(
    (i) => notices[i.menuItemId] === "unavailable" || notices[i.menuItemId] === "removed",
  );
  const [applyReferral, setApplyReferral] = useState(false);
  const [applyPoints, setApplyPoints] = useState(false);
  const referralBalance = profile?.referral_balance ?? 0;
  const pointsBalance = profile?.loyalty_points_balance ?? 0;
  const subtotal = cartSubtotal(items);
  // Display mirror of create_order(): referral bonus first, then points
  // (₦1 each) — together capped at the food subtotal.
  const bonus = applyReferral ? Math.min(referralBalance, subtotal) : 0;
  const points =
    applyPoints && loyalty.loyalty_enabled ? Math.max(0, Math.min(pointsBalance, Math.floor(subtotal - bonus))) : 0;
  const total = subtotal - bonus - points + deliveryFeeFor(subtotal, fulfillment, pricing);
  const willEarn = pointsForAmount(total, loyalty);
  const payload = JSON.stringify(items.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="fulfillment" value={fulfillment} />
      <input type="hidden" name="apply_referral" value={applyReferral ? "on" : ""} />
      <input type="hidden" name="apply_loyalty" value={applyPoints ? "on" : ""} />

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7">
          <h2 className="font-display text-2xl font-semibold text-secondary">How would you like it?</h2>
          <div role="radiogroup" aria-label="Delivery or pickup" className="grid grid-cols-2 gap-3">
            {(["delivery", "pickup"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={fulfillment === option}
                onClick={() => setFulfillment(option)}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  fulfillment === option
                    ? "border-secondary bg-primary/40"
                    : "border-secondary/15 hover:border-secondary/40"
                }`}
              >
                <span className="block font-semibold text-secondary">
                  {option === "delivery" ? "Delivery" : "Pickup"}
                </span>
                <span className="text-xs text-neutral-dark/60">
                  {option === "delivery" ? "Brought to your door" : "Collect from us"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-7">
          <h2 className="font-display text-2xl font-semibold text-secondary">Your details</h2>
          <Field label="Full name" error={errors.contact_name}>
            <input
              name="contact_name"
              required
              maxLength={120}
              autoComplete="name"
              defaultValue={v ? v.contact_name : (profile?.full_name ?? "")}
              className={input}
            />
          </Field>
          <Field label="Phone" hint="For delivery updates about this order." error={errors.contact_phone}>
            <input
              name="contact_phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="0803 123 4567"
              defaultValue={v ? v.contact_phone : (profile?.phone ?? "")}
              className={input}
            />
          </Field>
          {email && <p className="text-sm text-neutral-dark/60">Receipt goes to <strong>{email}</strong>.</p>}
          {fulfillment === "delivery" && (
            <Field label="Delivery address" error={errors.delivery_address}>
              <textarea
                name="delivery_address"
                rows={3}
                required
                maxLength={500}
                autoComplete="street-address"
                placeholder="House number, street, area, landmark"
                defaultValue={v ? v.delivery_address : (profile?.default_address ?? "")}
                className={input}
              />
            </Field>
          )}
          <Field label="Order notes (optional)" hint="Allergies, gate code, delivery instructions…" error={errors.notes}>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              defaultValue={v ? v.notes : ""}
              className={input}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="save_details" defaultChecked className="size-4 accent-secondary" />
            Save these details to my account
          </label>
        </section>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <OrderSummary fulfillment={fulfillment} pricing={pricing} bonus={bonus} points={points} />
        {/* Rewards (accounts doc §2 "CheckoutRewardsSection"): shown even at
            ₦0 — disabled, not hidden — so customers know they exist. The
            points toggle is hidden only when the program is switched off. */}
        <section aria-label="Rewards" className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm">
          <label
            className={`flex items-center justify-between gap-3 text-sm ${
              referralBalance > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            }`}
          >
            <span>
              <span className="block font-medium">Apply referral bonus</span>
              <span className="text-xs text-neutral-dark/60">{formatNaira(referralBalance)} available</span>
            </span>
            <input
              type="checkbox"
              checked={applyReferral}
              disabled={referralBalance <= 0}
              onChange={(e) => setApplyReferral(e.target.checked)}
              className="size-5 accent-secondary"
            />
          </label>
          {loyalty.loyalty_enabled && (
            <label
              className={`flex items-center justify-between gap-3 border-t border-secondary/10 pt-4 text-sm ${
                pointsBalance > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              <span>
                <span className="block font-medium">Apply loyalty points</span>
                <span className="text-xs text-neutral-dark/60">
                  {formatPoints(pointsBalance)} available (₦1 each)
                </span>
              </span>
              <input
                type="checkbox"
                checked={applyPoints}
                disabled={pointsBalance <= 0}
                onChange={(e) => setApplyPoints(e.target.checked)}
                className="size-5 accent-secondary"
              />
            </label>
          )}
          {willEarn > 0 && (
            <p className="text-xs text-secondary">
              You&apos;ll earn {formatPoints(willEarn)} when this order is delivered.
            </p>
          )}
        </section>
        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </p>
        )}
        {blocked && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            Some dishes are sold out — <Link href="/cart" className="underline">edit your cart</Link> to continue.
          </p>
        )}
        <CtaButton type="submit" size="lg" fullWidth disabled={pending || blocked}>
          {pending
            ? total === 0
              ? "Placing your order…"
              : "Taking you to Paystack…"
            : total === 0
              ? "Place order"
              : `Pay ${formatNaira(total)}`}
        </CtaButton>
        <p className="text-center text-xs text-neutral-dark/55">
          {total === 0 ? "Covered by your rewards." : "Secure payment by Paystack."} By placing this order you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </form>
  );
}

function OrderSummary({
  fulfillment,
  pricing,
  bonus = 0,
  points = 0,
}: {
  fulfillment: Fulfillment;
  pricing: Pricing;
  bonus?: number;
  points?: number;
}) {
  const items = useCart((s) => s.items);
  const notices = useCart((s) => s.notices);
  const subtotal = cartSubtotal(items);
  const fee = deliveryFeeFor(subtotal, fulfillment, pricing);
  const toFree = fulfillment === "delivery" ? amountToFreeDelivery(subtotal, pricing) : null;

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-4 rounded-3xl bg-white card-accent p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="summary-heading" className="font-display text-xl font-semibold text-secondary">Order summary</h2>
        <Link href="/cart" className="text-sm text-secondary underline-offset-4 hover:underline">Edit</Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.menuItemId} className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-primary/30">
              {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-neutral-dark/55">× {item.quantity}</p>
              {notices[item.menuItemId] === "price_changed" && (
                <p className="text-xs text-amber-700">Price updated</p>
              )}
              {(notices[item.menuItemId] === "unavailable" || notices[item.menuItemId] === "removed") && (
                <p className="text-xs text-red-700">Sold out</p>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatNaira(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-secondary/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-dark/65">Subtotal</dt>
          <dd className="tabular-nums">{formatNaira(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-dark/65">{fulfillment === "pickup" ? "Pickup" : "Delivery"}</dt>
          <dd className="tabular-nums">{fee === 0 ? "Free" : formatNaira(fee)}</dd>
        </div>
        {toFree !== null && (
          <p className="text-xs text-secondary">Add {formatNaira(toFree)} more for free delivery.</p>
        )}
        {bonus > 0 && (
          <div className="flex justify-between text-secondary">
            <dt>Referral bonus</dt>
            <dd className="tabular-nums">−{formatNaira(bonus)}</dd>
          </div>
        )}
        {points > 0 && (
          <div className="flex justify-between text-secondary">
            <dt>Loyalty points</dt>
            <dd className="tabular-nums">−{formatNaira(points)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-secondary/10 pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatNaira(subtotal - bonus - points + fee)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error ? (
        <span className="text-xs font-normal text-red-700">{error[0]}</span>
      ) : (
        hint && <span className="text-xs font-normal text-neutral-dark/55">{hint}</span>
      )}
    </label>
  );
}
