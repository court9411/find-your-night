"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

const RESEND_COOLDOWN = 120; // seconds

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("error") === "link_expired";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
      // No emailRedirectTo — OTP code flow, not magic link
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setStep("code");
    startCooldown();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: "email",
    });

    setLoading(false);

    if (verifyError) {
      const msg = verifyError.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) {
        setError("That code is wrong or has expired. Request a new one below.");
      } else {
        setError(verifyError.message);
      }
      return;
    }

    router.push("/profile");
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setCode("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    startCooldown();
  }

  // ── Step 1: email ──────────────────────────────────────────────────────────
  if (step === "email") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-1">
          <h1 className="font-display font-extrabold text-5xl tracking-tight text-center">
            Find Your <span className="text-accent">Night.</span>
          </h1>
          <p className="text-muted text-sm text-center">
            Sign in to save events and personalize your picks.
          </p>
        </div>

        {expired && (
          <div className="w-full max-w-sm rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-3">
            <p className="text-red-300 text-sm text-center">
              That link expired. Enter your email to get a new code.
            </p>
          </div>
        )}

        <form onSubmit={handleSendCode} className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            inputMode="email"
            required
            className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3.5 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
          />

          {error && (
            <div className="rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-2.5">
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send Code"}
          </button>
        </form>

        <p className="text-xs text-muted/50 text-center max-w-xs">
          We&apos;ll email you a 6-digit code. No password needed.
        </p>

        <Link href="/" className="text-xs text-muted/60 hover:text-muted transition-colors">
          ← Back to app
        </Link>
      </main>
    );
  }

  // ── Step 2: 6-digit code ───────────────────────────────────────────────────
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-1">
        <span className="text-4xl mb-1">📬</span>
        <h1 className="font-display font-extrabold text-4xl tracking-tight text-center">
          Check your email
        </h1>
        <p className="text-muted text-sm text-center">
          Enter the 6-digit code we sent to{" "}
          <span className="text-white font-semibold">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(val);
            if (error) setError("");
          }}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-4 text-center text-2xl font-display tracking-[0.5em] placeholder:text-muted/30 focus:outline-none focus:border-accent/50 transition-colors"
        />

        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-2.5">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-xs text-muted/60 hover:text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          onClick={() => { setStep("email"); setCode(""); setError(""); }}
          className="text-xs text-muted/60 hover:text-muted transition-colors"
        >
          Use a different email
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
