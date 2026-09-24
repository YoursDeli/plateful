import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Paystack REST helpers. PAYSTACK_SECRET_KEY is server-only and is also the
// key Paystack signs webhooks with (there's no separate webhook secret).

const API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as PaystackResponse<T> | null;
  if (!res.ok || !body?.status) {
    throw new Error(`Paystack ${path.split("?")[0]} failed: ${body?.message ?? res.status}`);
  }
  return body.data;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        currency: "NGN",
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    },
  );
}

export type VerifiedTransaction = {
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number; // kobo
  currency: string;
  gateway_response: string;
};

export async function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// x-paystack-signature = HMAC-SHA512(raw body, secret key), hex. Compared in
// constant time, and BEFORE the payload is parsed or trusted.
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !isPaystackConfigured()) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
