"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

/**
 * Forgot password: emails a link to /reset-password (client request,
 * 2026-10-31).
 *
 * The email itself is sent by Supabase Auth, through the SMTP settings in the
 * Supabase dashboard. Without custom SMTP, Supabase only delivers to members
 * of the project's team, so customers would never get it: see
 * docs/password-reset.md for the one-time setup.
 *
 * Always answers the same way, whether or not the address has an account, so
 * this page can't be used to find out who shops here.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    // Too many requests is the one error worth showing; anything else would
    // say whether the address exists.
    if (error && /rate|too many|seconds/i.test(error.message)) {
      setError("Please wait a minute before asking for another link.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-soft via-white to-lavender-soft px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-soft">
            <KeyRound className="text-berry" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter the email you signed up with and we&rsquo;ll send you a link to set a new one.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-mint-soft px-4 py-4 text-sm leading-relaxed text-ink">
            <p className="font-semibold">Check your email.</p>
            <p className="mt-1">
              If <strong>{email.trim()}</strong> has an account, a link to set a new password is on
              its way. It works for one hour. Can&rsquo;t see it after a few minutes? Look in Spam
              or Promotions, or{" "}
              <button type="button" onClick={() => setSent(false)} className="font-semibold text-berry underline">
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={sending}>
              {sending ? "Sending…" : "Send me a link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-ink-faint transition-colors hover:text-berry">
            ← Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
