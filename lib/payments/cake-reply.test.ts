import { describe, it, expect } from "vitest";
import { cakeRequestReply, waNumber, waLink } from "./whatsapp";

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
