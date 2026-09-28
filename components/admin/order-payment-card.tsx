"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart/math";
import { formatIst } from "@/lib/time/ist";
import { adminPaymentBadge, paymentDifferenceCents } from "@/lib/payments/state";
import { normalizePaymentReference } from "@/lib/payments/reference";
import type { OrderRow } from "@/lib/realtime/use-orders-realtime";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Staff's side of a manual UPI payment. See docs/manual-payments.md.
 *
 * The one rule everything here serves: an order is paid when the MONEY is in
 * the account, not when a screenshot arrives. Screenshots are trivially
 * edited, and the same one can be sent for two orders. So marking an order
 * paid asks for the amount that actually arrived and the transaction ID from
 * the bank or UPI app, behind a tick that says so — and the database refuses
 * the same transaction ID on a second order.
 */
export function OrderPaymentCard({
  order,
  onUpdate,
}: {
  order: OrderRow;
  onUpdate: (patch: Partial<OrderRow>) => Promise<Result>;
}) {
  const badge = adminPaymentBadge(order);
  const stage = badge.stage;
  const [amount, setAmount] = useState(() => String((order.payment_received_cents ?? order.total_cents) / 100));
  const [utr, setUtr] = useState(order.payment_reference ?? "");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = Math.round(parseFloat(amount) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents >= 0;
  const cleanUtr = normalizePaymentReference(utr);
  const previewDiff = amountValid ? paymentDifferenceCents(order.total_cents, amountCents) : null;

  const run = async (patch: Partial<OrderRow>) => {
    setBusy(true);
    setError(null);
    const result = await onUpdate(patch);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else setChecked(false);
  };

  const markPaid = (method: "upi_manual" | "cash_on_pickup") =>
    run({
      payment_status: "paid",
      payment_method: method,
      payment_received_cents: amountCents,
      payment_reference: method === "upi_manual" ? cleanUtr : order.payment_reference ?? null,
      // A new order becomes confirmed when its money arrives; an order staff
      // already moved further along keeps its status.
      ...(order.status === "pending" ? { status: "confirmed" } : {}),
    });

  const open = stage === "awaiting" || stage === "overdue" || stage === "checking" || stage === "not_found";
  const received = order.payment_received_cents;
  const diff = paymentDifferenceCents(order.total_cents, received);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">Payment</h3>
        <Badge color={badge.color}>{badge.label}</Badge>
      </div>

      <dl className="mb-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-ink-soft">Amount due</dt>
        <dd className="font-semibold tabular-nums text-ink">{formatPrice(order.total_cents)}</dd>
        {order.payment_due_at && open && (
          <>
            <dt className="text-ink-soft">Pay by</dt>
            <dd className={stage === "overdue" ? "font-semibold text-red-700" : "text-ink"}>
              {formatIst(order.payment_due_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} IST
              {stage === "overdue" && " — overdue"}
            </dd>
          </>
        )}
        {order.payment_claimed_at && (
          <>
            <dt className="text-ink-soft">Customer says paid</dt>
            <dd className="text-ink">
              {formatIst(order.payment_claimed_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} IST
            </dd>
          </>
        )}
        {order.payment_reference && (
          <>
            <dt className="text-ink-soft">{order.payment_verified_at ? "UPI transaction ID" : "UTR from customer"}</dt>
            <dd className="font-mono text-ink">{order.payment_reference}</dd>
          </>
        )}
        {order.payment_verified_at && received != null && (
          <>
            <dt className="text-ink-soft">Received</dt>
            <dd className="font-semibold tabular-nums text-ink">
              {formatPrice(received)}
              {order.payment_method === "cash_on_pickup" ? " in cash" : " by UPI"}
            </dd>
            <dt className="text-ink-soft">Checked</dt>
            <dd className="text-ink">
              {formatIst(order.payment_verified_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} IST
            </dd>
          </>
        )}
      </dl>

      {/* The money did not match the order. Said as the action to take. */}
      {diff != null && diff !== 0 && stage !== "refunded" && (
        <p
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            diff < 0 ? "bg-red-50 text-red-800" : "bg-yellow-soft text-ink"
          }`}
        >
          {diff < 0 ? (
            <>
              <strong>{formatPrice(-diff)} short.</strong> Collect the difference before the
              order is handed over.
            </>
          ) : (
            <>
              <strong>{formatPrice(diff)} over.</strong> Refund the extra by UPI within 3
              working days, as the Refunds policy promises.
            </>
          )}
        </p>
      )}

      {stage === "cancelled" && order.payment_status === "paid" && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>Refund due: {formatPrice(received ?? order.total_cents)}.</strong> This order was
          cancelled after it was paid. Send the refund by UPI to the account it came from, then
          mark it refunded.
        </p>
      )}

      {open && (
        <div className="flex flex-col gap-3 rounded-xl border border-ink/10 p-3">
          <p className="text-sm font-semibold text-ink">Record the payment</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Amount received (₹)
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              UPI transaction ID (UTR)
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="From your bank or UPI app"
                autoComplete="off"
                className="rounded-xl border border-ink/15 bg-white px-3 py-2 font-mono text-ink"
              />
            </label>
          </div>
          {previewDiff != null && previewDiff !== 0 && (
            <p className="text-xs text-red-700">
              That is {formatPrice(Math.abs(previewDiff))} {previewDiff < 0 ? "less" : "more"} than
              the order total of {formatPrice(order.total_cents)}.
            </p>
          )}
          {utr.trim() !== "" && !cleanUtr && (
            <p className="text-xs text-red-700">
              That doesn&rsquo;t look like a UPI transaction ID (6&ndash;35 letters or digits).
            </p>
          )}
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1"
            />
            <span>
              I&rsquo;ve checked our bank or UPI app and this money has arrived. A screenshot
              on its own isn&rsquo;t proof &mdash; screenshots can be edited or reused.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy || !checked || !amountValid || !cleanUtr}
              onClick={() => void markPaid("upi_manual")}
            >
              Mark as paid (UPI)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !checked || !amountValid}
              onClick={() => void markPaid("cash_on_pickup")}
            >
              Paid in cash
            </Button>
            {stage === "checking" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Mark this payment as not found? The customer's order page will ask them to send the screenshot and transaction ID again, and not to pay twice. Message them on WhatsApp too."
                    )
                  ) {
                    void run({ payment_status: "failed" });
                  }
                }}
              >
                Payment not found
              </Button>
            )}
          </div>
        </div>
      )}

      {(stage === "paid" || (stage === "cancelled" && order.payment_status === "paid")) && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Mark this order as refunded? Only do this once the refund has actually been sent.")) {
                void run({ payment_status: "refunded" });
              }
            }}
          >
            Mark refunded
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Undo this payment? Use this only if it was marked paid by mistake. The order goes back to waiting for payment."
                )
              ) {
                void run({ payment_status: "unpaid", payment_method: "upi_manual" });
              }
            }}
          >
            Undo — marked paid by mistake
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <label className="mt-4 flex flex-col gap-1 text-sm text-ink-soft">
        Staff note (not shown to the customer)
        <textarea
          defaultValue={order.payment_note ?? ""}
          rows={2}
          placeholder="e.g. paid from her husband's account, ₹50 short collected at pickup"
          onBlur={async (e) => {
            const value = e.target.value.trim() || null;
            if (value === (order.payment_note ?? null)) return;
            const result = await onUpdate({ payment_note: value });
            if (!result.ok) setError(result.error);
          }}
          className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-ink"
        />
      </label>
    </Card>
  );
}
