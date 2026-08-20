"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

/**
 * Floating WhatsApp widget.
 * Fixed bottom-right, expands to show a quick message prompt.
 */
export function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in after page load
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const whatsappNumber = "919836537447"; // Default; could be fetched from settings
  const defaultMessage = encodeURIComponent(
    "Hi SAVOR Bakery! I'd like to place an order."
  );

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      {/* Expanded chat bubble */}
      {open && (
        <div className="mb-3 w-64 rounded-2xl border border-ink/8 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-ink">Chat with us!</span>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-faint hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-ink-soft mb-3">
            Have a question or want to place a custom order? We&rsquo;re here to help! 🧁
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${defaultMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-medium text-ink hover:bg-mint/90 transition-colors"
          >
            <MessageCircle size={16} /> Start WhatsApp Chat
          </a>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-mint shadow-lg shadow-mint/40 transition-all hover:scale-110 hover:bg-mint/90"
        aria-label="WhatsApp"
      >
        {open ? (
          <X className="text-ink" size={24} />
        ) : (
          <MessageCircle className="text-ink" size={26} />
        )}
      </button>
    </div>
  );
}
