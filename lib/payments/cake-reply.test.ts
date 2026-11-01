import { describe, it, expect } from "vitest";
import { cakeRequestReply, waNumber, waLink, cakeRequestMessage } from "./whatsapp";

const date = (d: string) => `formatted ${d}`;

describe("cakeRequestReply", () => {
  it("with a quote: the details, the price, and a question to confirm", () => {
    const msg = cakeRequestReply(
      { customer_name: "Riya Sharma", flavor: "Chocolate", weight: "2 kg", requested_date: "2026-11-08", quote_cents: 280000 },
      date
    );
    expect(msg).toContain("Hi Riya!");
    expect(msg).toContain("• Flavour: Chocolate");
    expect(msg).toContain("• Size: 2 kg");
    expect(msg).toContain("• For: formatted 2026-11-08");
    expect(msg).toContain("*₹2800*");
    expect(msg).toContain("Reply here to confirm");
  });

  it("without a quote: opens the chat for questions, and skips empty details", () => {
    const msg = cakeRequestReply({ customer_name: "  ", flavor: "", quote_cents: null }, date);
    expect(msg).toContain("Hi there!");
    expect(msg).not.toContain("Flavour");
    expect(msg).toContain("a few questions before we quote");
  });
});

describe("a customer's number for wa.me", () => {
  it("adds India's code to a 10-digit number", () => {
    expect(waLink(waNumber("98365 37447")!, "hi")).toBe("https://wa.me/919836537447?text=hi");
  });
});

describe("cakeRequestMessage", () => {
  const fmt = (d: string) => `D(${d})`;
  it("carries everything the customer filled in, and nothing empty", () => {
    const m = cakeRequestMessage(
      { customer_name: "Asha Lyngdoh", customer_phone: "98765 43210", flavor: "Chocolate", weight: "", decoration: "Unicorn", message_on_cake: "Happy 5th", requested_date: "2026-11-10", description: "Pink and gold", has_photo: true },
      fmt
    );
    expect(m).toContain("*Name:* Asha Lyngdoh");
    expect(m).toContain("*Phone:* 98765 43210");
    expect(m).toContain('*Message on cake:* "Happy 5th"');
    expect(m).toContain("*For:* D(2026-11-10)");
    expect(m).toContain("*Details:* Pink and gold");
    expect(m).toContain("reference photo");
    expect(m).not.toContain("Size");
  });
  it("leaves out the photo line when there is none", () => {
    expect(cakeRequestMessage({ customer_name: "A" }, fmt)).not.toContain("photo");
  });
});
