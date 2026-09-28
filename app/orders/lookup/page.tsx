"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function FindMyOrderPage() {
  const router = useRouter();
  const [humanId, setHumanId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanId || !phone) {
      setError("Both fields are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ id: humanId, phone });
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Order not found");
      }
      const data = (await res.json()) as { order: { human_id: string } };
      // Straight to the order page, which carries the payment panel. This
      // page used to render its own copy of the order, with raw "pending" /
      // "unpaid" badges and no way to pay — a customer who closed the tab
      // before paying came back here and was stuck.
      router.push(
        `/orders/${encodeURIComponent(data.order.human_id)}?phone=${encodeURIComponent(phone)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center mb-8">
        <Search className="mx-auto mb-4 text-berry" size={40} />
        <h1 className="text-h1 text-ink mb-2">Find My Order</h1>
        <p className="text-ink-soft">
Enter your order number and the phone number you ordered with.
        </p>
      </div>

      {/* Search form */}
      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <Input
            label="Order number"
            value={humanId}
            onChange={(e) => setHumanId(e.target.value.toUpperCase())}
            placeholder="SAV-260820-0001"
            required
          />
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? "Searching..." : "Find My Order"}
          </Button>
        </form>
      </Card>

    </div>
  );
}
