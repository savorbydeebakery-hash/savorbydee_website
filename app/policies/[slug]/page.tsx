import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time/ist";

export const dynamic = "force-dynamic";

/**
 * The five policy pages: Terms, Privacy, Refunds & Cancellations, Shipping &
 * Delivery, and Contact. Linked from the footer and from the checkout's
 * confirm step.
 *
 * IMPORTANT: this is careful template wording, not legal advice. It is written
 * to be TRUE OF THIS BUSINESS by pulling the real values out of site_settings
 * — notice periods, payment window, address, phone, delivery toggle — rather
 * than stating generic terms the bakery does not actually operate. Anything
 * the database cannot answer is rendered as an explicit gap rather than
 * invented, because a policy that misstates the terms is worse than an
 * obviously incomplete one. Dee should read all five before going live, and a
 * lawyer or CA should look them over.
 *
 * Payment is manual UPI (docs/manual-payments.md). Every statement here about
 * payment must agree with components/payments/upi-payment-panel.tsx and the
 * checkout's "How payment works" box — customers are pointed at these pages
 * in a dispute.
 */

/**
 * When the wording last changed. Fixed, not "today": the page used to print
 * the current date on every visit, which claimed the terms changed daily and
 * made it impossible to say which version a customer agreed to. Update this
 * whenever the text below changes.
 */
const POLICY_LAST_UPDATED = "2026-09-28T12:00:00+05:30";

interface Settings {
  bakery_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  emergency_phone?: string | null;
  whatsapp_number?: string | null;
  payment_whatsapp_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  global_notice_hours?: number | null;
  preorder_notice_hours?: number | null;
  bulk_threshold?: number | null;
  bulk_notice_hours?: number | null;
  custom_cake_notice_days?: number | null;
  delivery_enabled?: boolean | null;
  delivery_instructions?: string | null;
  free_delivery_threshold_cents?: number | null;
  payment_window_minutes?: number | null;
  fssai_license_number?: string | null;
  grievance_officer_name?: string | null;
}

const SLUGS = ["terms", "privacy", "refunds", "shipping", "contact"] as const;
type Slug = (typeof SLUGS)[number];

const TITLES: Record<Slug, string> = {
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
  refunds: "Refunds & Cancellations",
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
  const dailyNotice = s.global_notice_hours ?? 2;
  const preorderNotice = s.preorder_notice_hours ?? 24;
  // The cancellation window per menu is the same as its notice period: until
  // then, baking has not started.
  const dailyCancelHours = dailyNotice;
  const preorderCancelHours = preorderNotice;
  // Per item and strictly greater — "more than 12 of any one item". This page
  // used to say "12 items or more", which is neither.
  const bulkQty = s.bulk_threshold ?? 12;
  const bulkNotice = s.bulk_notice_hours ?? 24;
  const customDays = s.custom_cake_notice_days ?? 5;
  const payWindow = s.payment_window_minutes ?? 60;
  // Null means no threshold is configured, not a threshold of zero — see
  // lib/cart/delivery-charge.ts. The sentence is dropped rather than promising
  // free delivery over ₹0.
  const freeOverCents: number | null = s.free_delivery_threshold_cents ?? null;
  const freeOver = freeOverCents != null ? `₹${(freeOverCents / 100).toFixed(0)}` : null;
  const address = [s.address_line1, s.address_line2, s.address_city, s.address_state]
    .filter(Boolean)
    .join(", ");
  const paymentWhatsapp = s.payment_whatsapp_number?.trim() || s.whatsapp_number?.trim() || null;

  const addressOrGap = address ? address : <Val v={null} label="Address" />;
  const grievance = (
    <>
      <Val v={s.grievance_officer_name} label="Grievance officer name" />, phone{" "}
      <Val v={s.contact_phone} label="Phone number" />, email{" "}
      <Val v={s.contact_email} label="Email address" />
    </>
  );

  return (
    <div className="bg-bk-bg">
      {/* Proportions taken from the reference's policy template: a ~774px
          column, the title centred at 28px/500 with -0.04em tracking, body at
          16px on a 26px line and 32px between blocks. Wider line spacing than
          the rest of this site uses, which is right for a page people read
          rather than scan. */}
      <div className="mx-auto w-full max-w-[774px] px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <h1 className="text-center text-[1.75rem] font-medium leading-[1.2] tracking-[-0.04em] text-bk-fg">
          {TITLES[key]}
        </h1>
        <p className="mt-3 text-center text-sm text-bk-muted">
          Last updated {formatIst(POLICY_LAST_UPDATED, { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="mt-10 space-y-8 text-base leading-[1.625] text-bk-fg">
          {key === "terms" && (
            <>
              <p>
                These terms apply to every order placed with {name}, {addressOrGap}, through
                this website. By placing an order you agree to them. Nothing in them takes
                away your rights under the Consumer Protection Act, 2019.
              </p>

              <Section title="Placing an order">
                <p>
                  Everything is baked to order, so each order needs notice before your
                  collection or delivery time:
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    <strong>Today&rsquo;s Menu</strong> &mdash; at least{" "}
                    <strong>{dailyNotice} hours</strong>
                  </li>
                  <li>
                    <strong>Preorder Menu</strong> &mdash; at least{" "}
                    <strong>{preorderNotice} hours</strong>
                  </li>
                  <li>
                    <strong>More than {bulkQty} of any one item</strong> &mdash; at least{" "}
                    <strong>{bulkNotice} hours</strong>
                  </li>
                  <li>
                    <strong>Custom cakes</strong> &mdash; up to <strong>{customDays} days</strong>;
                    we will tell you if yours can be ready sooner
                  </li>
                </ul>
                <p>
                  Placing an order is a request to buy. We accept it, and your order is{" "}
                  <strong>confirmed</strong>, only once your payment has reached our account
                  and we have marked it confirmed on your order page.
                </p>
              </Section>

              <Section title="Payment">
                <p>
                  We take payment by <strong>UPI only</strong>. After you place an order, your
                  order page shows a UPI QR code and our UPI ID, with the exact amount and
                  your order number filled in.
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    Pay the <strong>exact order total</strong>, in one payment, within{" "}
                    <strong>{payWindow} minutes</strong> of placing the order.
                  </li>
                  <li>
                    Pay <strong>only</strong> to the UPI ID shown on your order page. We will
                    never ask you to pay a different UPI ID, and we will never ask for your
                    UPI PIN, an OTP, or card or bank details &mdash; by phone, SMS, WhatsApp or
                    anywhere else. If someone does, it is not us; please tell us.
                  </li>
                  <li>
                    Then send us the payment screenshot on WhatsApp
                    {paymentWhatsapp ? <> (+{paymentWhatsapp.replace(/\D/g, "")})</> : null}, with
                    your order number.
                  </li>
                  <li>
                    A screenshot on its own is not proof of payment. We confirm your order
                    when we can see the money in our account, which we check during opening
                    hours.
                  </li>
                  <li>
                    If an order is not paid within {payWindow} minutes, we may cancel it. If
                    you pay for an order after we have cancelled it, we refund you in full, or
                    &mdash; if we can still make it on time and you agree &mdash; we reinstate
                    it.
                  </li>
                  <li>We charge nothing extra for paying by UPI.</li>
                </ul>
                <p>
                  Delivery is charged separately and paid in cash on arrival &mdash; see the{" "}
                  <PolicyLink slug="shipping">Shipping &amp; Delivery Policy</PolicyLink>.
                  Problems with a payment (paying twice, the wrong amount, a failed payment)
                  are covered in the{" "}
                  <PolicyLink slug="refunds">Refunds &amp; Cancellations</PolicyLink> policy.
                </p>
              </Section>

              <Section title="Prices">
                <p>
                  Prices are in Indian Rupees (INR). The total shown when you place your order
                  is the full price of your bakes; delivery, where it applies, is the only
                  thing added, and only in cash on arrival. We may change prices at any time,
                  but never for an order you have already placed. If a price is obviously
                  wrong, we will contact you before confirming the order, and you may cancel
                  it for a full refund.
                </p>
              </Section>

              <Section title="Changes and cancellations">
                <p>
                  See <PolicyLink slug="refunds">Refunds &amp; Cancellations</PolicyLink>.
                </p>
              </Section>

              <Section title="Collection and delivery">
                <p>
                  Please give accurate contact and delivery details, and collect or receive
                  your order at the time you chose. Our bakes are perishable: we keep an
                  uncollected order until we close on the day of your slot, and cannot refund
                  one that is not collected.
                </p>
              </Section>

              <Section title="Food safety and allergens">
                <p>
                  Our kitchen handles wheat, dairy, eggs and nuts. We cannot guarantee any
                  item is free from traces of these. If you have an allergy, tell us before
                  ordering and we will advise honestly whether we can meet it. Everything is
                  handmade, so each bake varies a little from its photo.
                </p>
                {s.fssai_license_number?.trim() && (
                  <p>FSSAI licence number: {s.fssai_license_number}.</p>
                )}
              </Section>

              <Section title="Our responsibility">
                <p>
                  If something is wrong with your order, we put it right as described in our{" "}
                  <PolicyLink slug="refunds">Refunds &amp; Cancellations</PolicyLink> policy. As
                  far as the law allows, our liability for any order is limited to the amount
                  you paid for it. Nothing in these terms limits a liability that cannot be
                  limited by law.
                </p>
              </Section>

              <Section title="Complaints and grievances">
                <p>
                  Please contact us first &mdash; most things are sorted in one message. For a
                  formal complaint, our grievance officer is {grievance}. We acknowledge
                  complaints within <strong>48 hours</strong> and aim to resolve them within{" "}
                  <strong>one month</strong>.
                </p>
              </Section>

              <Section title="Law and changes to these terms">
                <p>
                  These terms are governed by the laws of India, and the courts at Shillong,
                  Meghalaya have jurisdiction. We may update these terms; the version shown
                  on the day you placed your order is the one that applies to it.
                </p>
              </Section>
            </>
          )}

          {key === "privacy" && (
            <>
              <p>
                {name} ({addressOrGap}) collects only what is needed to bake, deliver and take
                payment for your order. This page explains what that is, why, who else sees
                it, how long we keep it, and your rights under the Digital Personal Data
                Protection Act, 2023.
              </p>

              <Section title="What we collect">
                <ul className="list-disc pl-5">
                  <li>
                    <strong>Your order:</strong> your name, phone number, the items, your
                    collection or delivery time, any notes, and for deliveries your address
                    and landmark.
                  </li>
                  <li>
                    <strong>If you create an account:</strong> your login email address and
                    any saved address.
                  </li>
                  <li>
                    <strong>Your payment:</strong> the UPI transaction ID, if you give it to us,
                    and the payment screenshot you send us on WhatsApp. A screenshot usually
                    shows your name, your UPI ID or bank, the amount, the date and the
                    transaction ID.
                  </li>
                  <li>
                    <strong>Messages:</strong> your WhatsApp name and number, and what you send
                    us there.
                  </li>
                </ul>
                <p>
                  We never collect your UPI PIN, OTPs, card numbers or bank passwords. Your
                  payment happens entirely inside your own UPI app, between your bank and
                  ours.
                </p>
              </Section>

              <Section title="Why we use it">
                <p>
                  To prepare and deliver your order, confirm your payment, contact you about
                  your order, send refunds, keep the business records Indian tax and
                  accounting law requires, and deal with any complaint. We do not use your
                  details for marketing unless you ask us to, and we never sell them.
                </p>
              </Section>

              <Section title="Who else sees it">
                <ul className="list-disc pl-5">
                  <li>Our own staff, only as needed to handle your order.</li>
                  <li>
                    The companies that run this website for us &mdash; Supabase (our
                    database), Cloudflare (hosting) and Resend (the emails that tell our
                    kitchen about a new order). They process your details on our behalf and
                    for no other purpose.
                  </li>
                  <li>
                    WhatsApp (Meta), which carries the messages and screenshots you send us,
                    under WhatsApp&rsquo;s own privacy policy.
                  </li>
                  <li>
                    Your bank and UPI app, which process your payment under their own terms.
                  </li>
                  <li>Government or law-enforcement authorities, only where the law requires it.</li>
                </ul>
              </Section>

              <Section title="Cookies and browser storage">
                <p>
                  Your basket is saved in your own browser so it survives a refresh, and if
                  you sign in we keep you signed in with a cookie. We do not use advertising
                  or tracking cookies.
                </p>
              </Section>

              <Section title="How long we keep it">
                <p>
                  Order records, including the UPI transaction ID, are kept for as long as
                  Indian tax and accounting law requires us to keep business records. Payment
                  screenshots and WhatsApp chats about an order are deleted from our phones
                  within <strong>90 days</strong> of the order being completed, unless we still
                  need them for a refund or complaint that is open.
                </p>
              </Section>

              <Section title="Your rights">
                <p>
                  You can ask us for a summary of the personal data we hold about you, to
                  correct or update it, or to erase it (except where the law requires us to
                  keep a record of a sale). You can also nominate someone to exercise these
                  rights for you. Write to our grievance officer, {grievance}. If you are not
                  satisfied with our answer, you may complain to the Data Protection Board of
                  India.
                </p>
              </Section>

              <Section title="Keeping it safe">
                <p>
                  Only signed-in staff can see orders, and only an admin can change where
                  payments go. No system is perfectly secure, but we take reasonable care to
                  protect your details.
                </p>
              </Section>

              <Section title="Children">
                <p>
                  This website is meant for adults. If you are under 18, please ask a parent
                  or guardian to place your order.
                </p>
              </Section>
            </>
          )}

          {key === "refunds" && (
            <>
              <p>
                Everything is made fresh to order, which shapes what we can and cannot refund.
                We would rather tell you plainly than bury it.
              </p>

              <Section title="Cancelling your order">
                <p>
                  <strong>Not paid yet?</strong> Simply don&rsquo;t pay, or tell us and we will
                  cancel it. An order that is not paid within {payWindow} minutes may be
                  cancelled by us.
                </p>
                <p>
                  <strong>Already paid?</strong> You may cancel for a full refund any time{" "}
                  <strong>before baking has started</strong>. In practice that means:
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    <strong>Today&rsquo;s Menu</strong> &mdash; up to{" "}
                    <strong>{dailyCancelHours} hours</strong> before your collection or
                    delivery time
                  </li>
                  <li>
                    <strong>Preorder Menu</strong> &mdash; up to{" "}
                    <strong>{preorderCancelHours} hours</strong> before your collection or
                    delivery time
                  </li>
                  <li>
                    <strong>Custom cakes</strong> &mdash; as agreed when we quote your cake
                  </li>
                </ul>
                <p>
                  After that point ingredients have been bought and work has begun, and we
                  cannot offer a refund.
                </p>
              </Section>

              <Section title="If we cancel">
                <p>
                  If we have to cancel a paid order for any reason of ours, you get a full
                  refund.
                </p>
              </Section>

              <Section title="Payment problems">
                <ul className="list-disc pl-5">
                  <li>
                    <strong>You paid twice</strong>, or paid for an order that was already
                    cancelled &mdash; we refund the extra payment in full.
                  </li>
                  <li>
                    <strong>You paid more than the total</strong> &mdash; we refund the
                    difference.
                  </li>
                  <li>
                    <strong>You paid less than the total</strong> &mdash; we will ask you to pay
                    the difference before we start. If you would rather not, we cancel the
                    order and refund everything you paid.
                  </li>
                  <li>
                    <strong>A payment failed or stayed &ldquo;pending&rdquo;</strong> but money
                    left your account &mdash; failed UPI payments are returned by your bank
                    automatically, usually within a few working days. That money never reaches
                    us, so we cannot send it back ourselves, but send us the screenshot and we
                    will help you follow it up.
                  </li>
                </ul>
              </Section>

              <Section title="If something is wrong">
                <p>
                  If your order arrives damaged, incorrect, or not to the standard we promised,
                  contact us within <strong>24 hours</strong> with a photograph. We will
                  replace it or refund it. We mean this.
                </p>
              </Section>

              <Section title="How refunds are paid">
                <p>
                  We refund <strong>by UPI to the same account you paid from</strong> (or in
                  cash, if you paid in cash), within <strong>3 working days</strong> of agreeing
                  the refund. We send you the UPI transaction ID of the refund so you can check
                  it. We never refund to a different account than the one that paid.
                </p>
                <p>
                  If you paid a delivery charge in cash and the delivery did not happen through
                  our fault, that is refunded too.
                </p>
              </Section>

              <Section title="What we cannot refund">
                <p>
                  Orders not collected by closing time on the day of the slot, and orders where
                  an incorrect address or an unreachable phone number prevented delivery.
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
                      We are currently <strong>pickup only</strong>. Collect your order from{" "}
                      {addressOrGap}.
                    </>
                  ) : (
                    <>
                      We deliver across Shillong, Meghalaya. Pickup is also available from{" "}
                      {addressOrGap}.
                    </>
                  )}
                </p>
              </Section>
              <Section title="When your order arrives">
                <p>
                  We do not ship nationwide and we do not use courier partners — every order
                  is delivered locally or collected in person. You choose a pickup or delivery
                  slot at checkout, and your order is ready at that slot once it is paid,
                  subject to the notice periods: {dailyNotice} hours for Today&rsquo;s Menu,{" "}
                  {preorderNotice} hours for the Preorder Menu, {bulkNotice} hours for more than{" "}
                  {bulkQty} of any one item, and up to {customDays} days for custom cakes.
                </p>
              </Section>
              <Section title="Delivery charges">
                <p>
                  The UPI payment you make for your order covers the bakes only. Delivery is
                  charged separately because the cost depends on how far we are travelling, so
                  we work it out from your address once your order comes in.
                </p>
                {/* The threshold was missing here entirely, so the policy said
                    delivery is always charged while the checkout was telling
                    larger orders it was free. This page is what a customer is
                    pointed at in a dispute, so it has to state the exception. */}
                {freeOver && (
                  <p>
                    Orders over <strong>{freeOver}</strong> are delivered free. There is
                    nothing to pay on arrival for those, and your UPI payment is the whole cost
                    of the order.
                  </p>
                )}
                <p>
                  We confirm the delivery charge with you before we set off, and it is paid in
                  cash when your order arrives. Nothing is ever added to your UPI payment for
                  delivery.
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
                <Row label="Address">{addressOrGap}</Row>
                <Row label="Phone">
                  <Val v={s.contact_phone} label="Phone number" />
                </Row>
                {/* Only when set: a bakery with one line should not show an
                    empty "Emergency" row. */}
                {s.emergency_phone?.trim() && (
                  <Row label="Emergency">{s.emergency_phone}</Row>
                )}
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
                {/* A separate payments number, when there is one, so a
                    customer knows the screenshot number is really ours. */}
                {s.payment_whatsapp_number?.trim() &&
                  s.payment_whatsapp_number.replace(/\D/g, "") !==
                    (s.whatsapp_number ?? "").replace(/\D/g, "") && (
                    <Row label="Payments">
                      WhatsApp +{s.payment_whatsapp_number.replace(/\D/g, "")}
                    </Row>
                  )}
                <Row label="Grievance officer">
                  <Val v={s.grievance_officer_name} label="Grievance officer name" />
                </Row>
                {s.fssai_license_number?.trim() && (
                  <Row label="FSSAI Lic. No.">{s.fssai_license_number}</Row>
                )}
              </dl>
            </>
          )}
        </div>

        <div className="mt-12 border-t border-bk-border pt-6">
          <p className="mb-3 text-sm font-bold text-bk-fg">Other policies</p>
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

function PolicyLink({ slug, children }: { slug: Slug; children: React.ReactNode }) {
  return (
    <Link href={`/policies/${slug}`} className="underline underline-offset-4">
      {children}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-bk-fg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-base font-bold text-bk-fg">{label}</dt>
      <dd className="text-base text-bk-fg">{children}</dd>
    </div>
  );
}
