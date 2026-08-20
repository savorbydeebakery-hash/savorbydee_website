import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, Cake, Tag, Image as ImageIcon, TrendingUp, Clock, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: unacknowledgedOrders },
    { count: totalMenuItems },
    { count: totalInquiries },
    { data: recentOrders },
    { data: upcomingSlots },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("*", { count: "exact", head: true }).is("acknowledged_at", null),
    supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("custom_cake_inquiries").select("*", { count: "exact", head: true }).neq("status", "confirmed").neq("status", "declined"),
    supabase.from("orders").select("human_id, guest_name, total_cents, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("human_id, guest_name, requested_slot, fulfillment, status").gte("requested_slot", today).lt("requested_slot", tomorrow).order("requested_slot").limit(10),
  ]);

  const stats = [
    { label: "Total Orders", value: totalOrders ?? 0, icon: Package, color: "bg-pink-soft text-pink" },
    { label: "Pending", value: pendingOrders ?? 0, icon: Clock, color: "bg-yellow-soft text-yellow" },
    { label: "Unacknowledged", value: unacknowledgedOrders ?? 0, icon: TrendingUp, color: "bg-peach-soft text-peach" },
    { label: "Menu Items", value: totalMenuItems ?? 0, icon: Tag, color: "bg-mint-soft text-mint" },
    { label: "Active Inquiries", value: totalInquiries ?? 0, icon: Cake, color: "bg-lavender-soft text-lavender" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-ink mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex flex-col gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-ink-soft">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-pink hover:underline">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentOrders && recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.human_id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-ink">{order.human_id}</span>
                    <span className="text-ink-soft ml-2">{order.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-soft">₹{(order.total_cents / 100).toFixed(0)}</span>
                    <Badge color="neutral">{order.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-faint text-center py-4">No orders yet</p>
            )}
          </div>
        </Card>

        {/* Upcoming slots today */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Today&rsquo;s Slots</h2>
            <Link href="/admin/orders" className="text-sm text-pink hover:underline">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {upcomingSlots && upcomingSlots.length > 0 ? (
              upcomingSlots.map((slot) => (
                <div key={slot.human_id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-ink">{slot.human_id}</span>
                    <span className="text-ink-soft ml-2">{slot.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-soft">
                      {new Date(slot.requested_slot).toLocaleTimeString("en-IN", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <Badge color="neutral">{slot.fulfillment}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-faint text-center py-4">No slots today</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: "/admin/menu-items", label: "Manage Menu", icon: Tag },
          { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
          { href: "/admin/custom-cakes", label: "Custom Cakes", icon: Cake },
          { href: "/admin/settings", label: "Settings", icon: Settings },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card hover className="flex flex-col items-center gap-2 py-6 text-center">
                <Icon className="text-pink" size={24} />
                <span className="text-sm font-medium text-ink">{link.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
