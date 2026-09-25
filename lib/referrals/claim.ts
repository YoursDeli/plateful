"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REF_COOKIE, normaliseReferralCode } from "./constants";

// After sign-in: if a referral link was used, link this (brand-new) account
// to the referrer. claim_referral() enforces every rule (new account only,
// no self-referral, once only). The cookie is cleared whatever the outcome.
export async function claimPendingReferral() {
  const store = await cookies();
  const code = normaliseReferralCode(store.get(REF_COOKIE)?.value);
  if (!code) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // keep the cookie until they're actually signed in

  const { data, error } = await supabase.rpc("claim_referral", { p_code: code });
  if (error) console.error("claim_referral failed:", error.message);
  else console.info("claim_referral:", data);
  store.delete(REF_COOKIE);
}
