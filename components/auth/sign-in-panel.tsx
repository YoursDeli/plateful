"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { claimPendingReferral } from "@/lib/referrals/claim";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6; // Supabase "Email OTP Length" (Auth → Providers → Email)

const ERROR_TEXT: Record<string, string> = {
  oauth: "Google sign-in didn't complete. Please try again, or use your email instead.",
};

// Email OTP + Google sign-in (docs/branding-security-auth.md §2). No password
// anywhere. Reusable: /login uses it now; checkout embeds it inline in step 6
// so a signed-out shopper never loses their place (accounts doc §1).
// `onSignedIn` lets an embedding page continue in place instead of navigating.
export function SignInPanel({
  next,
  initialError,
  onSignedIn,
}: {
  next: string;
  initialError?: string | null;
  onSignedIn?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"email" | "code" | "google" | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? (ERROR_TEXT[initialError] ?? "Sign-in failed. Please try again.") : null,
  );
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  function finish() {
    if (onSignedIn) onSignedIn();
    else {
      router.replace(next);
      router.refresh();
    }
  }

  async function continueWithGoogle() {
    setPending("google");
    setError(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    // On success the browser is already navigating to Google.
    if (error) {
      setPending(null);
      setError(error.message);
    }
  }

  async function sendCode() {
    setPending("email");
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setPending(null);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode(token: string) {
    setPending("code");
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    if (error) {
      setPending(null);
      setError(
        /expired|invalid/i.test(error.message)
          ? "That code is incorrect or has expired. Check the latest email, or send a new code."
          : error.message,
      );
      return;
    }
    // Link a referral if they arrived via someone's link (no-op otherwise).
    await claimPendingReferral().catch(() => undefined);
    finish();
  }

  const input =
    "w-full rounded-xl border border-secondary/20 bg-white px-4 py-3 text-base outline-none transition focus:border-secondary focus:ring-2 focus:ring-primary";
  const primaryBtn =
    "w-full rounded-btn bg-primary px-5 py-3 font-semibold text-secondary transition hover:brightness-95 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {step === "email" ? (
        <>
          <button
            type="button"
            onClick={() => void continueWithGoogle()}
            disabled={pending !== null}
            className="flex w-full items-center justify-center gap-3 rounded-btn border border-secondary/20 bg-white px-5 py-3 font-medium text-neutral-dark shadow-sm transition hover:bg-neutral-light disabled:opacity-60"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {pending === "google" ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 text-xs font-medium tracking-wider text-neutral-dark/45 uppercase">
            <span className="h-px flex-1 bg-secondary/15" />
            or use your email
            <span className="h-px flex-1 bg-secondary/15" />
          </div>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={input}
              />
            </label>
            <button type="submit" disabled={pending !== null} className={primaryBtn}>
              {pending === "email" ? "Sending code…" : "Email me a code"}
            </button>
            <p className="text-center text-xs text-neutral-dark/55">
              No password needed — we&apos;ll email you a {CODE_LENGTH}-digit code.
            </p>
          </form>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode(code);
          }}
        >
          <p className="text-sm text-neutral-dark/70">
            We sent a {CODE_LENGTH}-digit code to <strong className="text-neutral-dark">{email}</strong>.
            It may take a minute — check spam too.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your code
            <input
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              value={code}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setCode(digits);
                // Auto-submit once a full code is typed or pasted.
                if (digits.length === CODE_LENGTH && pending === null) void verifyCode(digits);
              }}
              className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </label>
          <button type="submit" disabled={pending !== null || code.length < CODE_LENGTH} className={primaryBtn}>
            {pending === "code" ? "Checking…" : "Sign in"}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              className="text-secondary underline-offset-4 hover:underline"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || pending !== null}
              onClick={() => void sendCode()}
              className="text-secondary underline-offset-4 hover:underline disabled:text-neutral-dark/40 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
