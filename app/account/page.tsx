"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/cart/math";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  LogOut,
  Save,
  Check,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { formatIst } from "@/lib/time/ist";

export const dynamic = "force-dynamic";

interface OrderData {
  id: string;
  human_id: string;
  status: string;
  fulfillment: string;
  requested_slot: string;
  payment_status: string;
  total_cents: number;
  created_at: string;
}

const statusColors: Record<string, "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral"> = {
  pending: "yellow",
  confirmed: "sky",
  paid: "mint",
  in_progress: "lavender",
  ready: "peach",
  fulfilled: "mint",
  cancelled: "neutral",
};

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{
    full_name: string;
    phone: string;
    email: string;
    default_address: string;
    default_landmark: string;
    role: string;
  } | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/account");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, email, default_address, default_landmark, role")
        .eq("id", user.id)
        .single();

      const { data: orderData } = await supabase
        .from("orders")
        .select("id, human_id, status, fulfillment, requested_slot, payment_status, total_cents, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (profileData) setProfile(profileData as typeof profile);
      setOrders((orderData ?? []) as OrderData[]);
      setLoading(false);
    };

    void load();
  }, [router, supabase]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        default_address: profile.default_address,
        default_landmark: profile.default_landmark,
      })
      .eq("id", (await supabase.auth.getUser()).data.user?.id as string);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-berry" size={28} />
        <p className="text-ink-soft">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink">My Account</h1>
          <p className="text-ink-soft">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut size={16} /> Sign out
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Profile */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <User size={18} className="text-berry" /> Profile & Delivery Details
        </h2>
        {profile && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={profile.full_name ?? ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
            <Input
              label="Phone Number"
              type="tel"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+91 98365 37447"
            />
            <div className="sm:col-span-2">
              <Input
                label="Email Address"
                type="email"
                value={profile.email ?? ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Default Delivery Address"
                value={profile.default_address ?? ""}
                onChange={(e) => setProfile({ ...profile, default_address: e.target.value })}
                placeholder="House/Flat number, Street, Area, City, PIN code"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Landmark (optional)"
                value={profile.default_landmark ?? ""}
                onChange={(e) => setProfile({ ...profile, default_landmark: e.target.value })}
                placeholder="Near..."
              />
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveProfile} variant="primary" disabled={saving}>
            {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> {saving ? "Saving..." : "Save Profile"}</>}
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Your saved details will auto-fill at checkout next time.
        </p>
      </Card>

      {/* Order history */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <Package size={18} className="text-berry" /> Order History
        </h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShoppingBag className="text-ink-faint" size={40} />
            <p className="text-ink-soft">You haven&rsquo;t placed any orders yet.</p>
            <Button onClick={() => router.push("/menu")} variant="primary">
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-4"
              >
                <div>
                  <Link
                    href={`/orders/${order.human_id}?email=${encodeURIComponent(profile?.email ?? "")}&phone=${encodeURIComponent(profile?.phone ?? "")}`}
                  >
                    <p className="font-semibold text-ink hover:text-berry">{order.human_id}</p>
                  </Link>
                  <p className="text-xs text-ink-faint">
                    {formatIst(order.created_at, {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gold-deep">{formatPrice(order.total_cents)}</p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge color={statusColors[order.status] ?? "neutral"}>{order.status}</Badge>
                    <Badge color={order.payment_status === "paid" ? "mint" : "yellow"}>
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
