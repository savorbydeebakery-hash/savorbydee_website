/**
 * Phone numbers are the customer's identity now, so "is this the same person"
 * has to have exactly one answer.
 *
 * The live orders table already holds the same customer under two different
 * strings — "9836537447" and "+91 98365 37447" — because the checkout stores
 * whatever was typed. Comparing or grouping on the raw text would split one
 * regular into two, and would let an order lookup fail for someone who typed
 * their own number with the country code this time.
 *
 * The key is the last ten digits: India's subscriber numbers are ten digits,
 * so this collapses +91, 0091, a leading 0 and any spacing onto one value
 * without needing to know which prefix was used.
 */

/** Digits only, last ten. Empty string when there is nothing usable. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Do these two numbers belong to the same customer?
 *
 * Two blanks are NOT the same person — an empty key must never match another
 * empty key, or every order without a phone would collapse into one
 * "customer" and, worse, an order lookup with no phone would match them.
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  if (!left || !right) return false;
  return left === right;
}

/**
 * Is this usable as an identity?
 *
 * Ten digits, because that is what an Indian mobile number is and because a
 * shorter one cannot be dialled. Deliberately stricter than the checkout's old
 * validator, which accepted anything from 10 to 15 characters including
 * spaces and dashes — that let "----------" through.
 */
export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw).length === 10;
}

/** Groups as "98365 37447" for display. Falls back to the raw text. */
export function formatPhone(raw: string | null | undefined): string {
  const key = normalizePhone(raw);
  if (key.length !== 10) return raw ?? "";
  return `${key.slice(0, 5)} ${key.slice(5)}`;
}
