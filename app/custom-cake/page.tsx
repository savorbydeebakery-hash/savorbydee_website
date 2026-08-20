"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Upload, Check, X } from "lucide-react";
import { uploadFile } from "@/lib/storage/upload-helper";

export const dynamic = "force-dynamic";

export default function CustomCakePage() {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    cake_type: "configured",
    flavor: "",
    weight: "",
    decoration: "",
    message_on_cake: "",
    description: "",
    requested_date: "",
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFile("custom-cake-refs", file);
    setUploading(false);
    if (result.url) setReferenceUrl(result.url);
    else setError(result.error ?? "Upload failed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("custom_cake_inquiries").insert({
        ...form,
        requested_date: form.requested_date || null,
        reference_image_url: referenceUrl,
      });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft">
          <Check className="text-mint" size={36} />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Inquiry Submitted! 🎂</h1>
        <p className="text-ink-soft mb-6">
          Thank you for your interest! Our team will review your request and contact you
          within 24 hours with a quote.
        </p>
        <Button onClick={() => { setSubmitted(false); setForm({ customer_name: "", customer_phone: "", customer_email: "", cake_type: "configured", flavor: "", weight: "", decoration: "", message_on_cake: "", description: "", requested_date: "" }); setReferenceUrl(null); }} variant="outline">
          Submit Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center mb-8">
        <Cake className="mx-auto mb-4 text-lavender" size={40} />
        <Badge color="lavender" className="mb-3">5 Days Advance Notice</Badge>
        <h1 className="text-3xl font-bold text-ink mb-3">Custom Cake Inquiry</h1>
        <p className="text-ink-soft max-w-lg mx-auto">
          Dreaming of something special? Tell us your vision and we&rsquo;ll craft it for you.
          Custom cakes need at least 5 days notice.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Your Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            <Input label="Phone" type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} required />
          </div>
          <Input label="Email" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required />

          <Select label="Cake Type" value={form.cake_type} onChange={(e) => setForm({ ...form, cake_type: e.target.value })}>
            <option value="configured">Configured (pick from our options)</option>
            <option value="fully_custom">Fully Custom (describe your vision)</option>
          </Select>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Flavor Preference" value={form.flavor} onChange={(e) => setForm({ ...form, flavor: e.target.value })} placeholder="Chocolate, Vanilla, Red Velvet..." />
            <Input label="Weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="½kg, 1kg, 2kg..." />
          </div>

          <Input label="Decoration / Theme" value={form.decoration} onChange={(e) => setForm({ ...form, decoration: e.target.value })} placeholder="Birthday, floral, character..." />
          <Input label="Message on Cake" value={form.message_on_cake} onChange={(e) => setForm({ ...form, message_on_cake: e.target.value })} placeholder="Happy Birthday!" />

          <Textarea label="Description (tell us everything!)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Colors, design ideas, dietary requirements, occasion..." />

          <Input label="Requested Date" type="date" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })} />

          {/* Reference image upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-soft">Reference Image (optional)</label>
            {referenceUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceUrl} alt="Reference" className="h-32 w-32 rounded-xl object-cover" />
                <button type="button" onClick={() => setReferenceUrl(null)} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/15 hover:border-lavender transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto text-ink-faint" size={20} />
                  <span className="text-xs text-ink-faint">{uploading ? "Uploading..." : "Upload"}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <div className="rounded-xl bg-yellow-soft border border-yellow/20 p-3">
            <p className="text-sm text-ink-soft">
              ⏰ Custom cakes require <strong>5 days advance notice</strong>. After submitting,
              our team will review and send you a quote within 24 hours.
            </p>
          </div>

          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Inquiry 🎂"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
