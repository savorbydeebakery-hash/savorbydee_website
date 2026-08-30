import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The five policy pages Razorpay's activation review looks for on a merchant
 * website: Terms, Privacy, Refunds & Cancellations, Shipping & Delivery, and
 * Contact Us. Without all five reachable from the site, activation is normally
 * held.
 *
 * IMPORTANT: this is standard template wording, not legal advice. It is
 * written to be TRUE OF THIS BUSINESS by pulling the real values out of
 * site_settings — notice periods, address, phone, delivery toggle — rather
 * than stating generic terms the bakery does not actually operate. Anything
 * the database cannot answer is rendered as an explicit gap rather than
 * invented, because a policy that misstates the terms is worse than an
 * obviously incomplete one. Dee should read all five before going live.
 */

interface Settings {
  bakery_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  whatsapp_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  global_notice_hours?: number | null;
  bulk_threshold?: number | null;
  bulk_notice_hours?: number | null;
  custom_cake_notice_days?: number | null;
  delivery_enabled?: boolean | null;
  delivery_instructions?: string | null;
}

const SLUGS = ["terms", "privacy", "refunds", "shipping", "contact"] as const;
type Slug = (typeof SLUGS)[number];

const TITLES: Record<Slug, string> = {
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
  refunds: "Refund & Cancellation Policy",
  shipping: "Shipping & Delivery Policy",
  contact: "Contact Us",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = TITLES[slug as Slug];
  return title ? { title: `${title} – Savor by Dee` } : { title: "Savor by Dee" };
}

/** Renders a value, or a visible gap if the business has not supplied it. */
function Val({ v, label }: { v?: string | null; label: string }) {
  if (v && v.trim()) return <>{v}</>;
  return (
    <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-sm text-yellow-900">
      [{label} — add this in Admin → Settings]
    </span>
  );
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUGS.includes(slug as Slug)) notFound();
  const key = slug as Slug;

  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  const s: Settings = data ?? {};

  const name = s.bakery_name?.trim() || "Savor by Dee";
  const notice = s.global_notice_hours ?? 12;
  const bulkQty = s.bulk_threshold ?? 10;
  const bulkNotice = s.bulk_notice_hours ?? 24;
  const customDays = s.custom_cake_notice_days ?? 5;
  const address = [s.address_line1, s.address_line2, s.address_city, s.address_state]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-bk-bg">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 md:px-6 md:pt-12">
        <h1 className="bk-section-title text-bk-fg">{TITLES[key]}</h1>
        <p className="mt-2 text-sm text-bk-muted">
          Last updated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="prose-policy mt-8 space-y-6 text-sm leading-relaxed text-bk-fg md:text-base">
          {key === "terms" && (
            <>
              <p>
                These terms apply to orders placed with {name} through this website. By
                placing an order you agree to them.
              </p>
              <Section title="Orders">
                <p>
                  Every item is baked to order. Standard items require at least{" "}
                  <strong>{notice} hours</strong> notice. Orders of{" "}
                  <strong>{bulkQty} items or more</strong> require{" "}
                  <strong>{bulkNotice} hours</strong>. Custom cakes require{" "}
                  <strong>{customDays} days</strong>. An order is confirmed only once
                  payment is received and we have acknowledged it.
                </p>
              </Section>
              <Section title="Pricing">
                <p>
                  All prices are shown in Indian Rupees (INR) and include applicable
                  taxes unless stated otherwise at checkout. We may change prices at any
                  time, but never after your order is confirmed.
                </p>
              </Section>
              <Section title="Food safety and allergens">
                <p>
                  Our kitchen handles wheat, dairy, eggs and nuts. We cannot guarantee
                  any item is free from traces of these. If you have an allergy, tell us
                  before ordering and we will advise honestly whether we can meet it.
                </p>
              </Section>
              <Section title="Your responsibilities">
                <p>
                  Please give accurate contact and delivery details, and collect or
                  receive your order at the agreed time. Baked goods are perishable and
                  we cannot hold them indefinitely.
                </p>
              </Section>
            </>
          )}

          {key === "privacy" && (
            <>
              <p>
                {name} collects only what is needed to bake and deliver your order. This
                page explains what that is and what happens to it.
              </p>
              <Section title="What we collect">
                <p>
                  Your name, phone number, email address, and — for deliveries — your
                  address. If you create an account we also store your login email. When
                  you pay online, your card or UPI details are entered directly with our
                  payment provider and are never seen or stored by us.
                </p>
              </Section>
              <Section title="Why we collect it">
                <p>
                  To prepare your order, contact you about it, take payment, and keep a
                  record of the sale as required for tax and accounting.
                </p>
              </Section>
              <Section title="Who we share it with">
                <p>
                  Our payment provider (Razorpay Software Private Limited), so your
                  payment can be processed; and our email provider, so order
                  confirmations reach you. We do not sell your data or share it for
                  advertising.
                </p>
              </Section>
              <Section title="Your choices">
                <p>
                  Ask us to correct or delete your details at any time using the contact
                  information on our Contact page. We may need to keep completed order
                  records where the law requires it.
                </p>
              </Section>
            </>
          )}

          {key === "refunds" && (
            <>
              <p>
                Everything is made fresh to order, which shapes what we can and cannot
                refund. We would rather tell you plainly than bury it.
              </p>
              <Section title="Cancellations">
                <p>
                  You may cancel for a full refund any time <strong>before baking has
                  started</strong> — in practice, up to the notice period for your order
                  ({notice} hours for standard items, {bulkNotice} hours for orders of{" "}
                  {bulkQty} or more, {customDays} days for custom cakes). After that
                  point ingredients have been bought and work has begun, and we cannot
                  offer a refund.
                </p>
              </Section>
              <Section title="If something is wrong">
                <p>
                  If your order arrives damaged, incorrect, or not to the standard we
                  promised, contact us within <strong>24 hours</strong> with a photograph.
                  We will replace it or refund it. We mean this.
                </p>
              </Section>
              <Section title="How refunds are paid">
                <p>
                  Approved refunds are returned to the original payment method through
                  Razorpay. Banks typically take <strong>5 to 7 working days</strong> to
                  post the money back to your account. We cannot speed that step up.
                </p>
              </Section>
              <Section title="What we cannot refund">
                <p>
                  Orders not collected at the agreed time, and orders where an incorrect
                  address or unreachable phone number prevented delivery.
                </p>
              </Section>
            </>
          )}

          {key === "shipping" && (
            <>
              <Section title="Where we deliver">
                <p>
                  {s.delivery_enabled === false ? (
                    <>
                      We are currently <strong>pickup only</strong>. Collect your order
                      from {address ? address : <Val v={null} label="Address" />}.
                    </>
                  ) : (
                    <>
                      We deliver across Shillong, Meghalaya. Pickup is also available
                      from {address ? address : <Val v={null} label="Address" />}.
                    </>
                  )}
                </p>
              </Section>
              <Section title="When your order arrives">
                <p>
                  We do not ship nationwide and we do not use courier partners — every
                  order is delivered locally or collected in person. You choose a pickup
                  or delivery slot at checkout, and your order is ready at that slot,
                  subject to the notice periods: {notice} hours for standard items,{" "}
                  {bulkNotice} hours for {bulkQty} items or more, and {customDays} days
                  for custom cakes.
                </p>
              </Section>
              <Section title="Delivery charges">
                <p>
                  Any delivery charge is shown at checkout before you pay. There are no
                  charges added afterwards.
                </p>
              </Section>
              {s.delivery_instructions?.trim() && (
                <Section title="Notes">
                  <p>{s.delivery_instructions}</p>
                </Section>
              )}
            </>
          )}

          {key === "contact" && (
            <>
              <p>We answer fastest on WhatsApp.</p>
              <dl className="space-y-4">
                <Row label="Business name">{name}</Row>
                <Row label="Address">
                  {address ? address : <Val v={null} label="Address" />}
                </Row>
                <Row label="Phone">
                  <Val v={s.contact_phone} label="Phone number" />
                </Row>
                <Row label="Email">
                  <Val v={s.contact_email} label="Email address" />
                </Row>
                <Row label="WhatsApp">
                  {s.whatsapp_number ? (
                    <a
                      className="underline underline-offset-4"
                      href={`https://wa.me/${s.whatsapp_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +{s.whatsapp_number}
                    </a>
                  ) : (
                    <Val v={null} label="WhatsApp number" />
                  )}
                </Row>
              </dl>
            </>
          )}
        </div>

        <div className="mt-12 border-t border-bk-border pt-6">
          <p className="mb-3 text-xs text-bk-muted">Other policies</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {SLUGS.filter((x) => x !== key).map((x) => (
              <li key={x}>
                <Link
                  href={`/policies/${x}`}
                  className="text-sm text-bk-fg underline-offset-4 hover:underline"
                >
                  {TITLES[x]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-bk-fg md:text-lg">{title}</h2>
      <div className="space-y-3 text-bk-muted">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-sm font-semibold text-bk-fg">{label}</dt>
      <dd className="text-sm text-bk-muted">{children}</dd>
    </div>
  );
}
