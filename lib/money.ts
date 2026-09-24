// Prices are stored in naira (numeric) in the DB; convert to kobo only when
// talking to Paystack. Format to a display string only at render time.

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatNaira(amount: number) {
  return nairaFormatter.format(amount);
}

export function nairaToKobo(amount: number) {
  return Math.round(amount * 100);
}
