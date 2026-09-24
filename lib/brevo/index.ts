import "server-only";

// Brevo transactional email (docs/cart-checkout-payment-workflow.md §5).
// Wording/design lives in Brevo dashboard templates (see brevo/templates/),
// referenced by ID with dynamic params — the client can edit copy without a
// redeploy. BREVO_API_KEY is server-only.

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

export function templateId(name: "ORDER_CONFIRMATION" | "NEW_ORDER"): number | null {
  const raw = process.env[`BREVO_TEMPLATE_${name}`];
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function sendTemplateEmail(params: {
  to: { email: string; name?: string };
  templateId: number;
  params: Record<string, unknown>;
  tags?: string[];
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: [{ email: params.to.email, ...(params.to.name ? { name: params.to.name.slice(0, 70) } : {}) }],
      templateId: params.templateId,
      params: params.params,
      tags: params.tags,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Brevo send failed (${res.status}): ${body.code ?? ""} ${body.message ?? ""}`.trim());
  }
  return (await res.json()) as { messageId?: string };
}
