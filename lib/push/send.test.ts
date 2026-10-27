import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { vapidToken } = await import("./send");

const fromB64url = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob((s + pad).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
};

describe("vapidToken", () => {
  it("is an ES256 JWT that the matching public key verifies", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const token = await vapidToken("https://fcm.googleapis.com", {
      vapid_public_key: "unused-here",
      vapid_private_jwk: jwk,
      contact: "mailto:test@example.com",
    });

    const [h, c, sig] = token.split(".");
    expect(JSON.parse(new TextDecoder().decode(fromB64url(h)))).toEqual({ typ: "JWT", alg: "ES256" });
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(c)));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("mailto:test@example.com");
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
    expect(claims.exp).toBeLessThanOrEqual(Date.now() / 1000 + 24 * 3600); // push services reject > 24h

    expect(fromB64url(sig).length).toBe(64); // raw r||s, as ES256 requires
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      fromB64url(sig),
      new TextEncoder().encode(`${h}.${c}`)
    );
    expect(ok).toBe(true);
  });
});
