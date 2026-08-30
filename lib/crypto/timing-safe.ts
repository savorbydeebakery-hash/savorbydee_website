/**
 * Constant-time comparison for hex-encoded HMAC digests.
 *
 * `a !== b` on a signature short-circuits at the first differing character, so
 * how long it takes to reject leaks how many leading characters were right.
 * That is enough, with sufficient samples, to recover a signature byte by byte
 * without ever knowing the secret. This always walks the full length.
 *
 * node:crypto.timingSafeEqual exists but is not available on the Workers
 * runtime this deploys to, hence the manual XOR accumulator.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  // Length is not secret — a signature of the wrong length is malformed, not a
  // near-miss — so returning early here leaks nothing useful.
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Hex-encode an ArrayBuffer of HMAC output. */
export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 over `message` with `secret`, hex-encoded. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const subtle = (globalThis.crypto ?? (await import("node:crypto")).webcrypto).subtle;
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await subtle.sign("HMAC", key, encoder.encode(message)));
}
