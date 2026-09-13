"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import Link from "next/link";
import { categorySlug } from "@/lib/menu/category-slug";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Upload, Check, X, ArrowRight } from "lucide-react";
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
    // Every enquiry is fully custom. A standard cake is ordered from the menu,
    // where the price is known up front — see the link above the form.
    cake_type: "fully_custom",
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
          <Check className="text-cocoa" size={36} />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Inquiry Submitted! 🎂</h1>
        <p className="text-ink-soft mb-6">
          Thank you for your interest! Our team will review your request and contact you
          within 24 hours with a quote.
        </p>
        <Button onClick={() => { setSubmitted(false); setForm({ customer_name: "", customer_phone: "", cake_type: "fully_custom", flavor: "", weight: "", decoration: "", message_on_cake: "", description: "", requested_date: "" }); setReferenceUrl(null); }} variant="outline">
          Submit Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center mb-8">
        <Cake className="mx-auto mb-4 text-cocoa" size={40} />
        <Badge color="lavender" className="mb-3">Up to 5 Days&rsquo; Notice</Badge>
        <h1 className="text-h1 text-ink mb-3">Custom Cake Inquiry</h1>
        <p className="text-ink-soft max-w-lg mx-auto">
          Dreaming of something special? Tell us your vision and we&rsquo;ll craft it for you.
          Custom cakes need up to 5 days&rsquo; notice. Our staff will reach out and let you know if yours can be ready sooner.
        </p>

        {/* Sets the expectation BEFORE someone describes a design or attaches a
            reference photo, which is the only moment it can do any good. Left
            deliberately warm and short: the point is to be honest about
            handmade variation, not to read as a liability waiver. */}
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Every cake is made by hand, so no two ever come out exactly alike. If
          you send us a picture we will get as close to it as we can &mdash; the
          small differences in colour, piping and finish are what make yours
          one of a kind.
        </p>
      </div>

      {/* "Configured (pick from our options)" used to be a choice on this form,
          which had people describe a menu cake in free text — flavour, weight —
          and wait for a quote on something that already has a price. Those
          cakes are on the menu, where they can pick a weight and add it to the
          basket, so this sends them there and the form is for designs of their
          own. The link lands on the sponge cakes rather than the whole menu. */}
      <Link
        href={`/menu?category=${categorySlug("Frosted Sponge Cakes")}`}
        className="group mb-6 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-porcelain p-4 transition-colors hover:border-berry/40"
      >
        <div>
          <p className="font-semibold text-ink">Want one of our cakes?</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            Pick a flavour and weight from our sponge cakes and order it straight away.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-berry">
          See the cakes
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Flavour Preference" value={form.flavor} onChange={(e) => setForm({ ...form, flavor: e.target.value })} placeholder="Chocolate, Vanilla, Red Velvet..." />
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
              ⏰ Custom cakes need <strong>up to 5 days&rsquo; notice</strong>. After submitting, our
              team will review, send you a quote within 24 hours, and let you know if
              yours can be ready sooner.
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
