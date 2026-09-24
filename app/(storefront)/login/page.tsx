import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-redirect";
import { OtpLoginForm } from "./otp-login-form";

export const metadata: Metadata = { title: "Sign in" };

// Minimal Email OTP sign-in, pulled forward from Build Order step 5 so the
// admin dashboard is reachable. Google Sign-In, cart merge, and styling polish
// are still step 5 work.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 font-display text-3xl font-semibold text-secondary">Sign in</h1>
      <OtpLoginForm next={safeNextPath(next)} />
    </main>
  );
}
