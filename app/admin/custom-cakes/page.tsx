"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatPrice } from "@/lib/cart/math";
import { Cake, Phone, Mail, Calendar, Pencil } from "lucide-react";
import { formatIstDate } from "@/lib/time/ist";

export const dynamic = "force-dynamic";

interface Inquiry {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  cake_type: string;
  flavor: string | null;
  weight: string | null;
  decoration: string | null;
  message_on_cake: string | null;
  description: string | null;
  requested_date: string | null;
  status: string;
  quote_cents: number | null;
  staff_notes: string | null;
  reference_image_url: string | null;
  created_at: string;
}

const statusColors: Record<string, "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral"> = {
  submitted: "yellow",
  reviewed: "sky",
  quoted: "lavender",
  confirmed: "mint",
  declined: "neutral",
};

export default function AdminCustomCakesPage() {
  const supabase = createClient();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [quoteCents, setQuoteCents] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const fetchInquiries = useCallback(async () => {
    const { data } = await supabase.from("custom_cake_inquiries").select("*").order("created_at", { ascending: false });
    setInquiries((data as Inquiry[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchInquiries(); }, 0);
    return () => clearTimeout(id);
  }, [fetchInquiries]);

  const openEdit = (inquiry: Inquiry) => {
    setEditing(inquiry);
    setQuoteCents(inquiry.quote_cents?.toString() ?? "");
    setStaffNotes(inquiry.staff_notes ?? "");
    setNewStatus(inquiry.status);
  };

  const handleSave = async () => {
    if (!editing) return;
    await supabase.from("custom_cake_inquiries").update({
      quote_cents: quoteCents ? parseInt(quoteCents) : null,
      staff_notes: staffNotes,
      status: newStatus,
    }).eq("id", editing.id);
    setEditing(null);
    fetchInquiries();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-ink mb-6">Custom Cake Inquiries</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cake className="text-lavender" size={20} />
                <div>
                  <h3 className="font-semibold text-ink">{inquiry.customer_name}</h3>
                  <p className="text-xs text-ink-faint">{inquiry.cake_type}</p>
                </div>
              </div>
              <Badge color={statusColors[inquiry.status] ?? "neutral"}>{inquiry.status}</Badge>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2 text-ink-soft">
                <Phone size={14} /> {inquiry.customer_phone}
              </div>
              <div className="flex items-center gap-2 text-ink-soft">
                <Mail size={14} /> {inquiry.customer_email}
              </div>
              {inquiry.requested_date && (
                <div className="flex items-center gap-2 text-ink-soft">
                  <Calendar size={14} /> {formatIstDate(inquiry.requested_date)}
                </div>
              )}
            </div>

            {inquiry.flavor && <p className="text-sm text-ink-soft">Flavor: {inquiry.flavor}</p>}
            {inquiry.weight && <p className="text-sm text-ink-soft">Weight: {inquiry.weight}</p>}
            {inquiry.decoration && <p className="text-sm text-ink-soft">Decoration: {inquiry.decoration}</p>}
            {inquiry.message_on_cake && <p className="text-sm text-ink-soft">Message: &ldquo;{inquiry.message_on_cake}&rdquo;</p>}
            {inquiry.description && <p className="text-sm text-ink-soft italic">&ldquo;{inquiry.description}&rdquo;</p>}

            {inquiry.quote_cents && (
              <div className="rounded-lg bg-mint-soft p-2">
                <span className="text-sm font-semibold text-mint">Quote: {formatPrice(inquiry.quote_cents)}</span>
              </div>
            )}

            {inquiry.reference_image_url && (
              <div className="aspect-video overflow-hidden rounded-xl bg-pink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={inquiry.reference_image_url} alt="Reference" className="h-full w-full object-cover" />
              </div>
            )}

            <Button size="sm" variant="outline" onClick={() => openEdit(inquiry)}>
              <Pencil size={14} /> Review & Quote
            </Button>
          </Card>
        ))}
        {inquiries.length === 0 && (
          <div className="col-span-full text-center py-12 text-ink-faint">
            No custom cake inquiries yet.
          </div>
        )}
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Review: ${editing.customer_name}`} size="md">
          <div className="flex flex-col gap-4">
            <Select label="Status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="quoted">Quoted</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </Select>

            <Input
              label="Quote Amount (in paise, e.g. 150000 = ₹1500)"
              type="number"
              value={quoteCents}
              onChange={(e) => setQuoteCents(e.target.value)}
              placeholder="150000"
            />

            <Textarea
              label="Staff Notes"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this inquiry..."
            />

            <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
