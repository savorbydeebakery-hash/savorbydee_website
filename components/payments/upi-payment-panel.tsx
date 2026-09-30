"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { clsx } from "clsx";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/cart/math";
import { formatIst } from "@/lib/time/ist";
import { paymentStage, type PaymentStage } from "@/lib/payments/state";
import type { OrderPayment } from "@/lib/payments/order-payment";
import {
  waLink,
  paymentProofMessage,
  orderQuestionMessage,
  type MessageOrder,
} from "@/lib/payments/whatsapp";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Hourglass,
  MessageCircle,
  Phone,
  Smartphone,
  XCircle,
} from "lucide-react";

/**
 * How a customer pays for an order: UPI to the bakery's own account, then a
 * screenshot on WhatsApp. See docs/manual-payments.md for the flow and the
 * failure cases each piece of text below exists to cover.
 *
 * Everything money-related comes from `payment`, which the server built from
 * the stored order total. Nothing here computes an amount.
 */

/** Everything the WhatsApp message needs (MessageOrder), plus payment state. */
export interface PanelOrder extends MessageOrder {
  human_id: string;
  status: string;
  payment_status: string;
  payment_due_at?: string | null;
  payment_reference?: string | null;
  fulfillment: string;
  guest_name: string;
  guest_phone: string;
  total_cents: number;
}

const linkButton =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-berry/50 focus-visible:ring-offset-2";

export function UpiPaymentPanel({
  order,
  payment,
  onOrderChanged,
}: {
  order: PanelOrder;
  payment: OrderPayment;
  onOrderChanged: (patch: Partial<PanelOrder>) => void;
}) {
  // Re-read once a minute so an open page turns "overdue" on time without a
  // reload. Starts at 0 and is set on mount so server and client agree.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const stage = paymentStage(order, now || undefined);
  const amount = formatPrice(payment.amountCents);
  const dueLabel = payment.dueAt
    ? `${formatIst(payment.dueAt, { hour: "numeric", minute: "2-digit", hour12: true })} IST`
    : null;

  // Settled or finished states need no payment UI at all.
  if (stage === "paid" || stage === "refunded" || stage === "cancelled") {
    return <SettledPanel stage={stage} order={order} amount={amount} />;
  }

  return (
    <Card className="flex flex-col gap-5" aria-labelledby="payment-heading">
      <StageIntro stage={stage} amount={amount} dueLabel={dueLabel} windowMinutes={payment.windowMinutes} />

      {/* After the deadline the details are tucked away: paying late for a
          slot that may be gone is exactly what the text above warns about,
          so the customer has to ask for them deliberately. */}
      {stage === "overdue" ? (
        <details className="rounded-xl border border-ink/10 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Show payment details anyway
          </summary>
          <div className="mt-4">
            <PayStep order={order} payment={payment} amount={amount} />
          </div>
        </details>
      ) : stage !== "checking" ? (
        <PayStep order={order} payment={payment} amount={amount} />
      ) : null}

      <ProofStep
        order={order}
        payment={payment}
        amount={amount}
        stage={stage}
        onOrderChanged={onOrderChanged}
      />

      {stage !== "checking" && <ConfirmStep />}

      <HelpList amount={amount} payment={payment} />
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

function StageIntro({
  stage,
  amount,
  dueLabel,
  windowMinutes,
}: {
  stage: PaymentStage;
  amount: string;
  dueLabel: string | null;
  windowMinutes: number;
}) {
  if (stage === "checking") {
    return (
      <div className="flex gap-3">
        <Hourglass className="mt-0.5 shrink-0 text-berry" size={22} aria-hidden="true" />
        <div>
          <h2 id="payment-heading" className="text-lg font-semibold text-ink">
            Thank you &mdash; we&rsquo;re checking your payment
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            We confirm an order once the money has reached our account, not from the
            screenshot alone, so this can take a little while during busy hours. This
            page updates by itself when it&rsquo;s done. We only check payments during
            opening hours.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "not_found") {
    return (
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-berry" size={22} aria-hidden="true" />
        <div>
          <h2 id="payment-heading" className="text-lg font-semibold text-ink">
            We couldn&rsquo;t find your payment yet
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Please <strong>don&rsquo;t pay again</strong>. Send us your payment
            screenshot and the UPI transaction ID on WhatsApp and we&rsquo;ll look
            again. If you haven&rsquo;t paid yet, you can pay below.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "overdue") {
    return (
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-berry" size={22} aria-hidden="true" />
        <div>
          <h2 id="payment-heading" className="text-lg font-semibold text-ink">
            The time to pay for this order has passed
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            <strong>Already paid?</strong> Send us the screenshot now and we&rsquo;ll
            confirm your order. <strong>Not paid yet?</strong> Message us{" "}
            <em>before</em> paying &mdash; your slot may no longer be available, and
            unpaid orders can be cancelled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 id="payment-heading" className="text-lg font-semibold text-ink">
        Pay {amount} to confirm your order
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {dueLabel ? (
          <>
            We&rsquo;re holding your order until <strong>{dueLabel}</strong>. Please pay
            and send us the screenshot before then.
          </>
        ) : (
          <>Please pay within {windowMinutes} minutes and send us the screenshot.</>
        )}{" "}
        We start baking once your payment reaches us.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-berry text-xs font-bold text-white">
        {n}
      </span>
      {children}
    </h3>
  );
}

const COARSE_POINTER = "(pointer: coarse)";

function subscribeCoarsePointer(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isCoarsePointer() {
  return window.matchMedia(COARSE_POINTER).matches;
}

function PayStep({ order, payment, amount }: { order: PanelOrder; payment: OrderPayment; amount: string }) {
  const upi = payment.upi;
  const [qr, setQr] = useState<string | null>(null);
  // Touch devices get the "open my UPI app" button; on a laptop it would do
  // nothing, so they get the QR to scan with a phone instead. False on the
  // server, so the first paint is the laptop layout either way.
  const isPhone = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);

  useEffect(() => {
    if (!upi) return;
    let cancelled = false;
    QRCode.toDataURL(upi.uri, { errorCorrectionLevel: "M", margin: 2, width: 560 })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [upi]);

  // No UPI ID configured (or an invalid one). Never show a QR that pays
  // nobody; say what happens instead.
  if (!upi) {
    return (
      <section>
        <StepHeading n={1}>Get our payment details</StepHeading>
        <p className="text-sm leading-relaxed text-ink-soft">
          We&rsquo;ll send you our UPI payment details on WhatsApp shortly. The amount
          to pay is <strong className="text-ink">{amount}</strong>, and please write{" "}
          <strong className="text-ink">{order.human_id}</strong> in the payment note.
        </p>
      </section>
    );
  }

  return (
    <section>
      <StepHeading n={1}>Pay {amount} by UPI</StepHeading>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-2xl border border-ink/10 bg-white p-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                width={208}
                height={208}
                alt={`UPI QR code to pay ${amount} to ${upi.payeeName} for order ${order.human_id}`}
                className="h-52 w-52"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-ink-faint">
                Loading QR code…
              </div>
            )}
          </div>
          {qr && (
            <a
              href={qr}
              download={`savor-${order.human_id}-upi-qr.png`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-berry underline-offset-4 hover:underline"
            >
              <Download size={15} aria-hidden="true" /> Save QR
            </a>
          )}
        </div>

        <div className="flex w-full flex-col gap-3">
          {isPhone ? (
            <>
              <a href={upi.uri} className={clsx(linkButton, "bg-berry text-white hover:bg-berry/90")}>
                <Smartphone size={18} aria-hidden="true" /> Pay {amount} with a UPI app
              </a>
              <p className="text-xs leading-relaxed text-ink-soft">
                Opens Google Pay, PhonePe, Paytm or BHIM with the amount filled in. If it
                doesn&rsquo;t open or shows an error, tap <strong>Save QR</strong>, then
                in your UPI app choose <strong>Scan&nbsp;QR → upload from gallery</strong>.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-soft">
              Scan with any UPI app on your phone &mdash; Google Pay, PhonePe, Paytm,
              BHIM or your bank&rsquo;s app. The amount and your order number fill in by
              themselves.
            </p>
          )}

          <dl className="flex flex-col gap-2 rounded-xl bg-shell/70 p-3 text-sm">
            <DetailRow label="Pay to" value={upi.payeeName} />
            <DetailRow label="UPI ID" value={upi.vpa} copy />
            <DetailRow label="Amount" value={amount} copyValue={(payment.amountCents / 100).toFixed(2)} copy />
            <DetailRow label="Note" value={order.human_id} copy />
          </dl>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
        <li>
          • Pay <strong className="text-ink">exactly {amount}</strong>, in one payment.
        </li>
        {/* The account is in the owner's own name, and a UPI app shows the
            bank-registered name whatever the link says. Without this, a
            customer who ordered from "Savor by Dee" sees a person's name and
            reasonably wonders if they are paying the right place. */}
        {!/savor/i.test(upi.payeeName) && (
          <li>
            • Your UPI app will show the name <strong className="text-ink">{upi.payeeName}</strong>{" "}
            &mdash; that&rsquo;s us. It&rsquo;s the owner&rsquo;s account.
          </li>
        )}
        <li>
          • Only pay to the UPI ID shown here. We will never ask you to pay a different
          UPI ID by phone, SMS or WhatsApp.
        </li>
        {order.fulfillment === "delivery" && (
          <li>
            •{" "}
            {payment.freeDeliveryOverCents != null && payment.amountCents >= payment.freeDeliveryOverCents ? (
              <>Delivery on this order is free, so {amount} is everything.</>
            ) : (
              <>
                This covers the bakes only. The delivery charge is confirmed with you
                before we set off and paid in cash on arrival.
              </>
            )}
          </li>
        )}
      </ul>
    </section>
  );
}

/**
 * "doretta.blah-googlemail.com@oksbi" -> breakable after "-" and ".", and
 * before "@", so a narrow screen wraps it as "doretta.blah-" / "googlemail.com"
 * / "@oksbi" instead of mid-word. <wbr> adds no characters, so select-all and
 * copying still give the exact ID.
 */
function withBreakPoints(value: string) {
  return value.split(/(?<=[-.])|(?=@)/).map((part, i) => (
    <span key={i}>
      {i > 0 && <wbr />}
      {part}
    </span>
  ));
}

function DetailRow({
  label,
  value,
  copyValue,
  copy = false,
}: {
  label: string;
  value: string;
  copyValue?: string;
  copy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be refused (older browsers, some in-app browsers). The
      // value is select-all, so a long-press still copies it.
    }
  };

  return (
    // Label above the value on a small phone, beside it from sm up.
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
        {/* Wraps, never truncates: the live UPI ID is 33 characters, and
            "doretta.blah-goo…" on a small phone is an ID nobody can type.
            Break points only where a reader expects one. */}
        <span className="select-all font-semibold text-ink [overflow-wrap:anywhere] sm:text-right">
          {withBreakPoints(value)}
        </span>
        {copy && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs font-semibold text-ink hover:border-berry"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            <Copy size={12} aria-hidden="true" />
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ProofStep({
  order,
  payment,
  amount,
  stage,
  onOrderChanged,
}: {
  order: PanelOrder;
  payment: OrderPayment;
  amount: string;
  stage: PaymentStage;
  onOrderChanged: (patch: Partial<PanelOrder>) => void;
}) {
  const [reference, setReference] = useState(order.payment_reference ?? "");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // The whole order — items, contact, slot, address, notes — so the message
  // alone is enough for staff to match the payment and plan the bake.
  const message = paymentProofMessage({
    order,
    amountCents: payment.amountCents,
    reference,
    freeDeliveryOverCents: payment.freeDeliveryOverCents,
  });

  /**
   * Records "I've paid" on the order. Fired alongside opening WhatsApp, not
   * before it: waiting for this request first would get the WhatsApp tab
   * blocked as a popup. keepalive lets it finish even as the page loses
   * focus to the WhatsApp app.
   */
  const recordClaim = async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.human_id)}/payment`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: order.guest_phone, reference }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        order?: Partial<PanelOrder>;
        error?: string;
      };
      if (!res.ok) {
        setClaimError(data.error ?? "We couldn't record that. Please message us on WhatsApp.");
        return;
      }
      if (data.order) onOrderChanged(data.order);
    } catch {
      // Offline or blocked. The WhatsApp message is what staff act on, so
      // this is a note rather than a failure.
      setClaimError("We couldn't update this page, but your WhatsApp message still reaches us.");
    } finally {
      setClaiming(false);
    }
  };

  const heading =
    stage === "checking" ? "Haven't sent the screenshot yet?" : "Send us your payment screenshot";

  return (
    <section>
      <StepHeading n={stage === "checking" ? 1 : 2}>{heading}</StepHeading>
      {stage !== "checking" && (
        <p className="mb-3 text-sm leading-relaxed text-ink-soft">
          Once the payment succeeds, take a screenshot of the success screen and send it
          to us on WhatsApp so we can match it to order{" "}
          <strong className="text-ink">{order.human_id}</strong>.
        </p>
      )}

      <div className="mb-3 max-w-sm">
        <Input
          label="UPI transaction ID (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="12-digit number on the success screen"
          inputMode="text"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-ink-soft">
          Helps us find your payment faster. Also called UTR or UPI Ref No.
        </p>
      </div>

      {payment.whatsapp ? (
        <div className="flex flex-col gap-2">
          <a
            href={waLink(payment.whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void recordClaim()}
            className={clsx(linkButton, "self-start bg-[#1f7a4d] text-white hover:bg-[#1a6942]")}
          >
            <MessageCircle size={18} aria-hidden="true" />
            {stage === "checking" ? "Send screenshot on WhatsApp" : `I've paid ${amount} — send screenshot`}
          </a>
          <p className="text-xs leading-relaxed text-ink-soft">
            WhatsApp opens with your order number already typed.{" "}
            <strong>Attach your screenshot before you press send.</strong>
          </p>
          {/* Overdue and not yet paid: the text above says to ask first. This
              is that question, without claiming a payment that wasn't made. */}
          {stage === "overdue" && (
            <a
              href={waLink(
                payment.whatsapp,
                orderQuestionMessage(order, payment.amountCents, {
                  freeDeliveryOverCents: payment.freeDeliveryOverCents,
                })
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-sm font-semibold text-berry underline underline-offset-4"
            >
              Haven&rsquo;t paid yet? Message us before paying
            </a>
          )}
        </div>
      ) : (
        // No WhatsApp number configured. The claim still gets recorded, and
        // the customer is told where the screenshot goes.
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void recordClaim()}
            disabled={claiming}
            className={clsx(linkButton, "self-start bg-berry text-white hover:bg-berry/90 disabled:opacity-50")}
          >
            <CheckCircle2 size={18} aria-hidden="true" /> I&rsquo;ve paid {amount}
          </button>
          {payment.phone && (
            <p className="text-xs text-ink-soft">
              Please send the screenshot to <strong>{payment.phone}</strong>.
            </p>
          )}
        </div>
      )}

      {claimError && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {claimError}
        </p>
      )}

      {payment.phone && payment.whatsapp && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Phone size={12} aria-hidden="true" /> Not on WhatsApp? Call us on{" "}
          <a href={`tel:${payment.phone}`} className="font-semibold text-ink underline underline-offset-2">
            {payment.phone}
          </a>
          .
        </p>
      )}
    </section>
  );
}

function ConfirmStep() {
  return (
    <section>
      <StepHeading n={3}>We confirm your order</StepHeading>
      <p className="text-sm leading-relaxed text-ink-soft">
        We check that the money has reached our account, then mark your order confirmed.
        This page updates by itself &mdash; you can also come back to it any time from{" "}
        <Link href="/orders/lookup" className="font-semibold text-ink underline underline-offset-2">
          Track your order
        </Link>{" "}
        with your order number and phone number.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function HelpList({ amount, payment }: { amount: string; payment: OrderPayment }) {
  return (
    <details className="rounded-xl bg-shell/60 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">Something went wrong?</summary>
      <dl className="mt-3 flex flex-col gap-3 leading-relaxed text-ink-soft">
        <div>
          <dt className="font-semibold text-ink">The payment failed, or it says &ldquo;pending&rdquo;</dt>
          <dd>
            Don&rsquo;t pay again yet. A pending UPI payment usually settles within a few
            minutes. If money left your account for a payment that failed, your bank
            returns it automatically, normally within a few working days. Send us the
            screenshot and we&rsquo;ll check.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">The UPI app didn&rsquo;t open, or showed an error</dt>
          <dd>
            Tap <strong>Save QR</strong> and scan it from your gallery inside the UPI app,
            or pay the UPI ID by hand using the amount and note above.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">I paid the wrong amount</dt>
          <dd>
            Tell us on WhatsApp. If you paid less than {amount}, we&rsquo;ll ask for the
            difference before we start. If you paid more, we refund the extra by UPI
            within 3 working days.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">I paid twice</dt>
          <dd>We refund the second payment in full, by UPI, within 3 working days.</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">The amount is over my UPI limit</dt>
          <dd>
            Banks set a daily UPI limit, and it is lower for the first day after setting
            up UPI. Message us{payment.phone ? ` or call ${payment.phone}` : ""} and
            we&rsquo;ll sort out another way.
          </dd>
        </div>
      </dl>
    </details>
  );
}

/* ------------------------------------------------------------------------ */

function SettledPanel({ stage, order, amount }: { stage: PaymentStage; order: PanelOrder; amount: string }) {
  if (stage === "paid") {
    return (
      <Card className="flex items-start gap-3 bg-mint-soft">
        <CheckCircle2 className="mt-0.5 shrink-0 text-cocoa" size={22} aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-ink">Payment received &mdash; your order is confirmed</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Thank you! We&rsquo;ve received your payment for order {order.human_id}.
          </p>
        </div>
      </Card>
    );
  }

  if (stage === "refunded") {
    return (
      <Card className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 shrink-0 text-cocoa" size={22} aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-ink">Your payment has been refunded</h2>
          <p className="mt-1 text-sm text-ink-soft">
            We&rsquo;ve sent your money back by UPI to the account you paid from. It
            usually shows up within minutes; message us if you can&rsquo;t see it.
          </p>
        </div>
      </Card>
    );
  }

  // Cancelled. What to say depends on whether money changed hands.
  return (
    <Card className="flex items-start gap-3">
      <XCircle className="mt-0.5 shrink-0 text-ink-soft" size={22} aria-hidden="true" />
      <div>
        <h2 className="font-semibold text-ink">This order has been cancelled</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {order.payment_status === "paid" ? (
            <>
              You paid for this order, so we&rsquo;ll refund {amount} by UPI to the
              account you paid from within 3 working days.
            </>
          ) : order.payment_status === "refunded" ? (
            <>Your payment has been refunded to the account you paid from.</>
          ) : (
            <>
              Please don&rsquo;t pay for it. If you already paid, message us on WhatsApp
              with the screenshot and we&rsquo;ll refund you in full.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
