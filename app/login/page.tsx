"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Cake, LogIn, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorParam === "unauthorized" ? "You don't have permission to access that page." : null
  );

  const getDestination = (role?: string): string => {
    // Customers should never be sent to /admin.
    if (role !== "admin" && role !== "staff") {
      return next && !next.startsWith("/admin") ? next : "/account";
    }
    return next ?? "/admin";
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Determine role for redirect destination
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = userData.user
      ? await supabase.from("profiles").select("role").eq("id", userData.user.id).single()
      : { data: null };

    const destination = getDestination(profile?.role as string | undefined);
    router.push(destination);
    router.refresh();
  };

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
        },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/account" : undefined,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Auto-confirm is enabled, so the user is already signed in.
      const { data: userData } = await supabase.auth.getUser();
      const destination = userData.user ? "/account" : "/account";
      setMessage("Account created! Welcome to SAVOR.");
      router.push(destination);
      router.refresh();
    } else {
      setMessage("Check your email to confirm your account before signing in.");
      setMode("signin");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    if (mode === "signin") {
      void handleSignIn();
    } else {
      void handleSignUp();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-soft via-white to-lavender-soft px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-soft">
            <Cake className="text-berry" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-ink">SAVOR</h1>
          <p className="text-sm text-ink-soft mt-1">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl bg-mint-soft border border-mint/20 p-3">
            <p className="text-sm text-ink">✅ {message}</p>
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors ${
              mode === "signin" ? "bg-white text-berry shadow-sm" : "text-ink-soft"
            }`}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors ${
              mode === "signup" ? "bg-white text-berry shadow-sm" : "text-ink-soft"
            }`}
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98365 37447"
                required
              />
            </>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading
              ? (mode === "signin" ? "Signing in..." : "Creating account...")
              : (mode === "signin" ? "Sign In" : "Create Account")}
          </Button>
        </form>

        {mode === "signin" && (
          <p className="mt-4 text-center text-xs text-ink-faint">
            Staff &amp; admin use the same sign-in to manage orders.
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-ink-faint hover:text-berry transition-colors">
            ← Back to website
          </Link>
        </div>
      </Card>
    </div>
  );
}
