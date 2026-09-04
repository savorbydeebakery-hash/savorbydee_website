"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Search } from "lucide-react";
import { formatPrice } from "@/lib/cart/math";
import { formatPhone, normalizePhone } from "@/lib/customers/phone";
import { formatIst } from "@/lib/time/ist";

export const dynamic = "force-dynamic";

interface LeaderboardRow {
  phone_key: string;
  name: string | null;
  phone_as_given: string | null;
  order_count: number;
  total_cents: number;
  first_order_at: string;
  last_order_at: string;
}

/**
 * Repeat customers, counted by phone number.
 *
 * Reads the customer_leaderboard view, which groups on the last ten digits
 * rather than the stored text — the same regular is in the orders table as
 * both "9836537447" and "+91 98365 37447", and grouping on the raw value would
 * show them as two people who ordered once each.
 *
 * The view is security_invoker, so RLS on orders still applies: an anonymous
 * caller hitting the same endpoint gets an empty array rather than every
 * customer's name, number and spend.
 */
export default function AdminCustomersPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchRows = useCallback(async () => {
    const { data } = await supabase
      .from("customer_leaderboard")
      .select("*")
      .order("order_count", { ascending: false })
      .limit(500);
    setRows((data as LeaderboardRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchRows]);

  // Search matches a name OR a number in any format, by normalising the query
  // the same way the view does.
  const q = query.trim().toLowerCase();
  const qDigits = normalizePhone(query);
  const visible = rows.filter((r) => {
    if (!q) return true;
    const byName = (r.name ?? "").toLowerCase().includes(q);
    const byPhone = qDigits.length > 0 && r.phone_key.includes(qDigits);
    return byName || byPhone;
  });

  const totalOrders = rows.reduce((sum, r) => sum + Number(r.order_count), 0);
  const repeat = rows.filter((r) => Number(r.order_count) > 1).length;

  if (loading) {
    return <div className="py-20 text-center text-ink-soft">Loading customers...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone who has ordered, counted by phone number. A customer who has used
          two formats of the same number counts once.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <p className="text-2xl font-bold text-ink tabular-nums">{rows.length}</p>
          <p className="text-xs text-ink-soft">Customers</p>
        </Card>
        <Card className="py-4">
          <p className="text-2xl font-bold text-ink tabular-nums">{repeat}</p>
          <p className="text-xs text-ink-soft">Ordered more than once</p>
        </Card>
        <Card className="py-4">
          <p className="text-2xl font-bold text-ink tabular-nums">{totalOrders}</p>
          <p className="text-xs text-ink-soft">Orders in total</p>
        </Card>
      </div>

      <div className="mb-4">
        <Input
          label=""
          placeholder="Search by name or number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <Card className="py-14 text-center">
          <Search className="mx-auto mb-3 text-ink-faint" size={28} />
          <p className="text-sm text-ink-soft">
            {rows.length === 0 ? "No orders yet." : "No customer matches that search."}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-shell/40 text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Last order</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                // Rank comes from the unfiltered list, so searching does not
                // renumber someone from 4th to 1st.
                const rank = rows.indexOf(r) + 1;
                return (
                  <tr key={r.phone_key} className="border-b border-ink/8 last:border-b-0">
                    <td className="px-4 py-3 tabular-nums text-ink-faint">
                      {rank <= 3 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-gold-deep">
                          <Trophy size={13} aria-hidden="true" />
                          {rank}
                        </span>
                      ) : (
                        rank
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {r.name?.trim() || <span className="text-ink-faint">(no name)</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft">
                      <a
                        href={`https://wa.me/91${r.phone_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {formatPhone(r.phone_key)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge color={Number(r.order_count) > 1 ? "mint" : "neutral"}>
                        {r.order_count}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gold-deep">
                      {formatPrice(Number(r.total_cents))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {formatIst(r.last_order_at, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-faint">
        Totals count every order placed, including cancelled and unpaid ones &mdash;
        delivery is settled in cash, so payment status is not a reliable signal yet.
        The order count is the dependable column.
      </p>
    </div>
  );
}
