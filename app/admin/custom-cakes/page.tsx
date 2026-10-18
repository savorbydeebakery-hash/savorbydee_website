"use client";

import { useEffect, useState, useCallback } from "react";
import { describeWriteError } from "@/lib/admin/write-error";
import { paiseToRupeeInput, rupeeInputToPaise } from "@/lib/admin/money";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatPrice } from "@/lib/cart/math";
import { Cake, Phone, Mail, Calendar, Pencil, Plus, Lock } from "lucide-react";
import { formatIst, formatIstDate } from "@/lib/time/ist";

export const dynamic = "force-dynamic";

interface Inquiry {
  id: string;
  customer_name: string;
  customer_phone: string;
  /** No longer collected; only older enquiries have one. */
  customer_email: string | null;
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

/** The editable fields, as the form holds them (quote in rupees, as typed). */
interface InquiryForm {
  customer_name: string;
  customer_phone: string;
  requested_date: string;
  flavor: string;
  weight: string;
  decoration: string;
  message_on_cake: string;
  description: string;
  status: string;
  quote: string;
  staff_notes: string;
}

const EMPTY_FORM: InquiryForm = {
  customer_name: "",
  customer_phone: "",
  requested_date: "",
  flavor: "",
  weight: "",
  decoration: "",
  message_on_cake: "",
  description: "",
  status: "submitted",
  quote: "",
  staff_notes: "",
};

function toForm(i: Inquiry): InquiryForm {
  return {
    customer_name: i.customer_name,
    customer_phone: i.customer_phone,
    requested_date: i.requested_date ?? "",
    flavor: i.flavor ?? "",
    weight: i.weight ?? "",
    decoration: i.decoration ?? "",
    message_on_cake: i.message_on_cake ?? "",
    description: i.description ?? "",
    status: i.status,
    // Shown in rupees. The box used to take paise — "150000 = ₹1500" — so
    // typing the price you meant quoted the customer a hundredth of it.
    quote: paiseToRupeeInput(i.quote_cents),
    staff_notes: i.staff_notes ?? "",
  };
}

/** Empty boxes are saved as null, not "", so the cards hide them. */
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/**
 * Custom cake requests. Admin only (changed 2026-10-18): staff are alerted
 * to a new request on the Orders page and pass it to the owner, who handles
 * it here. Migration 00047 enforces the same rule in the database.
 *
 * Admins can also add a request that came in by phone or WhatsApp, and edit
 * every detail of one, not only its status and quote.
 */
export default function AdminCustomCakesPage() {
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  // null = closed, "new" = adding, otherwise the request being edited.
  const [editing, setEditing] = useState<Inquiry | "new" | null>(null);
  const [form, setForm] = useState<InquiryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // This page ignored the result of its only write, so a refused quote closed
  // the modal and looked saved.
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    const { data } = await supabase.from("custom_cake_inquiries").select("*").order("created_at", { ascending: false });
    setInquiries((data as Inquiry[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: profile } = user
          ? await supabase.from("profiles").select("role").eq("id", user.id).single()
          : { data: null };
        const r = profile?.role ?? "";
        setRole(r);
        if (r === "admin") await fetchInquiries();
        else setLoading(false);
      })();
    }, 0);
    return () => clearTimeout(id);
  }, [supabase, fetchInquiries]);

  const openNew = () => {
    setEditing("new");
    setForm(EMPTY_FORM);
    setSaveError(null);
  };

  const openEdit = (inquiry: Inquiry) => {
    setEditing(inquiry);
    setForm(toForm(inquiry));
    setSaveError(null);
  };

  const set = (field: keyof InquiryForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!editing) return;
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setSaveError("Please enter the customer's name and phone number.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const row = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      requested_date: form.requested_date || null,
      flavor: orNull(form.flavor),
      weight: orNull(form.weight),
      decoration: orNull(form.decoration),
      message_on_cake: orNull(form.message_on_cake),
      description: orNull(form.description),
      status: form.status,
      quote_cents: rupeeInputToPaise(form.quote),
      staff_notes: orNull(form.staff_notes),
    };
    const { error } =
      editing === "new"
        ? await supabase.from("custom_cake_inquiries").insert({ ...row, cake_type: "fully_custom" })
        : await supabase.from("custom_cake_inquiries").update(row).eq("id", editing.id);
    setSaving(false);
    if (error) {
      setSaveError(describeWriteError(error, "this custom cake"));
      return;
    }
    setEditing(null);
    void fetchInquiries();
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Lock className="mx-auto mb-4 text-ink-faint" size={32} />
        <h1 className="text-xl font-bold text-ink mb-2">Custom cakes are for admins</h1>
        <p className="text-ink-soft">
          When a new custom cake request comes in, the Orders page rings and shows a
          notice. Please let the owner know.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Custom Cake Inquiries</h1>
        <Button variant="primary" onClick={openNew}>
          <Plus size={16} /> Add Custom Cake
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cake className="text-lavender" size={20} />
                <div>
                  <h3 className="font-semibold text-ink">{inquiry.customer_name}</h3>
                  <p className="text-xs text-ink-faint">
                    Received {formatIst(inquiry.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {inquiry.cake_type === "configured" && " · from the menu options"}
                  </p>
                </div>
              </div>
              <Badge color={statusColors[inquiry.status] ?? "neutral"}>{inquiry.status}</Badge>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2 text-ink-soft">
                <Phone size={14} /> {inquiry.customer_phone}
              </div>
              {inquiry.customer_email && (
                <div className="flex items-center gap-2 text-ink-soft">
                  <Mail size={14} /> {inquiry.customer_email}
                </div>
              )}
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
            {inquiry.staff_notes && <p className="text-sm text-ink-faint">Notes: {inquiry.staff_notes}</p>}

            {inquiry.quote_cents != null && (
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
              <Pencil size={14} /> Edit & Quote
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
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Add Custom Cake" : `Edit: ${editing.customer_name}`}
          size="md"
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Customer name" value={form.customer_name} onChange={set("customer_name")} required />
              <Input label="Phone" type="tel" value={form.customer_phone} onChange={set("customer_phone")} required />
            </div>
            <Input label="Date needed" type="date" value={form.requested_date} onChange={set("requested_date")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Flavor" value={form.flavor} onChange={set("flavor")} />
              <Input label="Weight" value={form.weight} onChange={set("weight")} placeholder="1 kg" />
            </div>
            <Input label="Decoration" value={form.decoration} onChange={set("decoration")} />
            <Input label="Message on cake" value={form.message_on_cake} onChange={set("message_on_cake")} />
            <Textarea label="Description" value={form.description} onChange={set("description")} rows={3} />

            <div className="grid grid-cols-1 gap-4 border-t border-ink/8 pt-4 sm:grid-cols-2">
              <Select label="Status" value={form.status} onChange={set("status")}>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="quoted">Quoted</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
              </Select>
              <Input
                label="Quote (₹)"
                type="number"
                step="1"
                min={0}
                value={form.quote}
                onChange={set("quote")}
                placeholder="1500"
              />
            </div>

            <Textarea
              label="Staff Notes"
              value={form.staff_notes}
              onChange={set("staff_notes")}
              rows={3}
              placeholder="Internal notes about this inquiry..."
            />

            {saveError && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 border-t border-ink/8 pt-4">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
