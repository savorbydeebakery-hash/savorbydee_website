"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Package,
  Tag,
  Image as ImageIcon,
  Megaphone,
  Settings,
  Cake,
  Users,
  LogOut,
  Menu,
  X,
  Star,
  Camera,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/menu-items", label: "Menu Items", icon: Tag },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/banners", label: "Promo Banners", icon: Megaphone },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/behind-the-scenes", label: "Behind the Scenes", icon: Camera },
  { href: "/admin/custom-cakes", label: "Custom Cakes", icon: Cake },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/accounts", label: "Accounts", icon: Users },
];

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
        router.push("/login?next=/admin&error=unauthorized");
        return;
      }

      setUser({ email: profile.email ?? user.email });
      setRole(profile.role);
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-soft/30">
        <div className="animate-pulse text-ink-soft">Loading admin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-soft/10">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink/8 bg-white px-4 lg:hidden">
        <Link href="/admin" className="font-bold text-ink">
          SAVOR Admin
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-ink-soft hover:bg-pink-soft"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-30 h-full w-64 border-r border-ink/8 bg-white transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-ink/8 px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-bold text-ink">SAVOR</span>
            <span className="text-xs font-medium text-pink">Admin</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-pink-soft text-pink"
                    : "text-ink-soft hover:bg-pink-soft/50 hover:text-ink"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-ink/8 p-3">
          <div className="mb-2 px-3 text-xs text-ink-faint">
            {user?.email} ({role})
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
