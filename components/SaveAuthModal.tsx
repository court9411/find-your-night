"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SaveAuthModalProps {
  onClose: () => void;
  onAuthed: (user: User) => void;
}

export default function SaveAuthModal({ onClose, onAuthed }: SaveAuthModalProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setStep("code");
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
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: "email",
    });

    setLoading(false);

    if (verifyError || !data.user) {
      setError("That code is wrong or has expired. Request a new one below.");
      return;
    }

    onAuthed(data.user);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5 overflow-y-auto py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-sm max-h-full overflow-y-auto bg-[#0f0f16] border border-card-border rounded-3xl p-6 flex flex-col gap-4 animate-fadeUp my-auto">
        {step === "email" ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-bold text-xl tracking-tight">
                Enter your email to save this
              </h2>
              <p className="text-muted text-sm">
                We&apos;ll send a 6-digit code. No password needed, and it saves across all your devices.
              </p>
            </div>
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                inputMode="email"
                autoFocus
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
                className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send Code"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted/60 hover:text-muted transition-colors text-center"
              >
                Cancel
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-bold text-xl tracking-tight">Check your email</h2>
              <p className="text-muted text-sm">
                Enter the 6-digit code we sent to{" "}
                <span className="text-white font-semibold">{email}</span>
              </p>
            </div>
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
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
                autoFocus
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
                className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify & Save"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="text-xs text-muted/60 hover:text-muted transition-colors text-center"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
