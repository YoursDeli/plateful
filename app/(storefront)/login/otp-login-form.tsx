"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

export function OtpLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setPending(false);
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-dark/20 bg-white px-3 py-2.5 text-base outline-none focus:border-secondary focus:ring-2 focus:ring-primary";
  const buttonClass =
    "w-full rounded-full bg-primary px-5 py-2.5 font-medium text-secondary disabled:opacity-60";

  if (step === "email") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verifyCode();
      }}
    >
      <p className="text-sm text-neutral-dark/70">
        We sent a code to <strong>{email}</strong>.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputClass} tracking-widest`}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Verifying…" : "Verify"}
      </button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-secondary underline"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Change email
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || pending}
          onClick={() => void sendCode()}
          className="text-secondary underline disabled:text-neutral-dark/40 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
