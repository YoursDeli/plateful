// Shared by proxy.ts (edge), server actions and pages.
// A visit to /?ref=CODE stores CODE in this cookie (not localStorage, so it
// survives the OTP / Google redirect — docs/pages-referrals-footer.md §5).
export const REF_COOKIE = "plateful_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/;

export function normaliseReferralCode(raw: string | null | undefined) {
  const code = raw?.trim().toUpperCase() ?? "";
  return REFERRAL_CODE_RE.test(code) ? code : null;
}
