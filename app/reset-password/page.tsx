"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * Where the "set a new password" email lands (from /forgot-password).
 *
 * The link arrives in one of two shapes, and both are handled:
 *   ?token_hash=…&type=recovery  the recommended email template
 *                                (docs/password-reset.md); works on any
 *                                device, so a link requested on a laptop can
 *                                be opened on a phone
 *   ?code=…                      Supabase's default template; only works in
 *                                the browser that asked for the link
 * Either way the visitor ends up signed in for this one purpose, and the form
 * below sets the new password on that session.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

type Stage = "checking" | "ready" | "bad-link" | "done";

function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const finish = (s: Stage) => {
      if (!done) {
        done = true;
        setStage(s);
      }
    };
    const tokenHash = params.get("token_hash");
    const code = params.get("code");
    void (async () => {
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        return finish(error ? "bad-link" : "ready");
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return finish(error ? "bad-link" : "ready");
      }
      // An older link style puts the session in the URL hash; the client picks
      // it up by itself and reports PASSWORD_RECOVERY.
      const { data } = await supabase.auth.getSession();
      if (data.session) return finish("ready");
      window.setTimeout(() => finish("bad-link"), 2500);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") finish("ready");
    });
    return () => sub.subscription.unsubscribe();
  }, [params, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Use at least 6 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(
        /different from the old/i.test(error.message)
          ? "That's your current password. Choose a new one."
          : "We couldn't save it. Please ask for a new link and try again."
      );
      return;
    }
    setStage("done");
  };

  const goOn = async () => {
    const { data } = await supabase.auth.getUser();
    const { data: profile } = data.user
      ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
      : { data: null };
    router.push(profile?.role === "admin" || profile?.role === "staff" ? "/admin" : "/account");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-soft via-white to-lavender-soft px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-soft">
            <KeyRound className="text-berry" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
        </div>

        {stage === "checking" && <p className="text-center text-sm text-ink-soft">Checking your link…</p>}

        {stage === "bad-link" && (
          <div className="rounded-xl bg-yellow-soft px-4 py-4 text-sm leading-relaxed text-ink">
            <p className="font-semibold">This link has expired or was already used.</p>
            <p className="mt-1">
              Links work once, for one hour, in the browser that asked for them.{" "}
              <Link href="/forgot-password" className="font-semibold text-berry underline">
                Ask for a new link
              </Link>
              .
            </p>
          </div>
        )}

        {stage === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PasswordInput
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              autoFocus
            />
            <PasswordInput
              label="Type it again"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={saving}>
              {saving ? "Saving…" : "Save new password"}
            </Button>
          </form>
        )}

        {stage === "done" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-mint-soft px-4 py-4 text-sm text-ink">
              <strong>Done.</strong> Your new password is saved and you&rsquo;re signed in.
            </p>
            <Button variant="primary" size="lg" onClick={() => void goOn()}>
              Continue
            </Button>
          </div>
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
