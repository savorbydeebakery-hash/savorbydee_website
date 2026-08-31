"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/cart/math";
import { CreditCard, AlertCircle, Check, Loader2 } from "lucide-react";

interface RetryPaymentButtonProps {
  orderId: string;
  humanId: string;
  totalCents: number;
  kycPendingMode?: boolean;
  upiId?: string;
  onPaymentSuccess?: () => void;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

interface RazorpayInstance {
  on: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
  open: () => void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

/**
 * T6.2: Razorpay checkout integration.
 * Loads checkout.js, opens Razorpay modal, handles payment success/failure.
 * If kyc_pending_mode is true, shows UPI fallback instead.
 */
export function RetryPaymentButton({
  orderId,
  humanId,
  totalCents,
  kycPendingMode = false,
  upiId,
  onPaymentSuccess,
}: RetryPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay checkout.js script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("razorpay-checkout-js")) return;

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleRazorpayPayment = async () => {
    setLoading(true);
    setStatus("creating");
    setError(null);

    try {
      // Step 1: Create Razorpay order via our API
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create payment order");
      }

      const data = (await res.json()) as {
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };
      setStatus("paying");

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "SAVOR Bakery",
        description: `Order ${humanId}`,
        order_id: data.razorpayOrderId,
        handler: async (response: RazorpaySuccessResponse) => {
          // Payment successful — verify on server
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                savor_order_id: orderId,
              }),
            });

            if (verifyRes.ok) {
              setStatus("success");
              onPaymentSuccess?.();
            } else {
              setStatus("failed");
              setError("Payment verification failed. Please contact us.");
            }
          } catch {
            setStatus("failed");
            setError("Payment verification error. Please contact us.");
          }
          setLoading(false);
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#F6C7CF", // Strawberry Milk
        },
        modal: {
          ondismiss: () => {
            setStatus("idle");
            setLoading(false);
          },
        },
      };

      const RazorpayCtor = (window as unknown as { Razorpay: RazorpayConstructor }).Razorpay;
      const rzp = new RazorpayCtor(options);
      rzp.on("payment.failed", (response: RazorpayFailureResponse) => {
        setStatus("failed");
        setError(response.error?.description ?? "Payment failed");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  // KYC pending mode — show UPI fallback
  if (kycPendingMode) {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-gold-deep" size={20} />
          <h3 className="font-semibold text-ink">Payment via UPI</h3>
        </div>
        {upiId ? (
          <>
            <p className="text-sm text-ink-soft">
              We&rsquo;re currently setting up online payments. Please pay via UPI to
              confirm your order.
            </p>
            <div className="rounded-xl bg-mint-soft p-4 text-center">
              <p className="text-xs text-ink-faint mb-1">Pay to UPI ID:</p>
              <p className="text-lg font-bold text-ink select-all">{upiId}</p>
              <p className="text-sm text-ink-soft mt-2">Amount: {formatPrice(totalCents)}</p>
              <p className="text-xs text-ink-faint mt-2">Reference: {humanId}</p>
            </div>
            <p className="text-xs text-ink-faint">
              After payment, send a screenshot to our WhatsApp and we&rsquo;ll confirm your order.
            </p>
          </>
        ) : (
          /* No UPI ID set in admin. Telling someone to "pay via UPI" without
             saying where would strand them, so say what actually happens
             instead. Fill in Admin -> Settings -> Payment to show the ID. */
          <>
            <p className="text-sm text-ink-soft">
              Online payment is not switched on yet. We&rsquo;ll message you with
              payment details to confirm this order.
            </p>
            <div className="rounded-xl bg-mint-soft p-4">
              <p className="text-sm text-ink-soft">
                Amount due: <strong className="text-ink">{formatPrice(totalCents)}</strong>
              </p>
              <p className="text-xs text-ink-faint mt-1">Reference: {humanId}</p>
            </div>
          </>
        )}
      </Card>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-soft">
          <Check className="text-cocoa" size={24} />
        </div>
        <h3 className="font-semibold text-ink">Payment Successful!</h3>
        <p className="text-sm text-ink-soft">Your order has been confirmed.</p>
      </Card>
    );
  }

  // Razorpay checkout button
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}
      <Button
        onClick={handleRazorpayPayment}
        variant="primary"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Processing...
          </>
        ) : (
          <>
            <CreditCard size={18} /> Pay {formatPrice(totalCents)}
          </>
        )}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        Secure payment via Razorpay. Cards, UPI, wallets accepted.
      </p>
    </div>
  );
}
