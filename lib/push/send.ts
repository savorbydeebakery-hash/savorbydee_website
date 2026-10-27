import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Web Push to staff devices (migration 00049).
 *
 * Pushes carry no payload, so there is nothing to encrypt: each one is an
 * authenticated "wake up" (a VAPID-signed POST to the device's push service).
 * The service worker then asks /api/push/latest what happened, as the signed-
 * in staff member, and shows that. Order details never pass through Google's,
 * Apple's or Mozilla's push servers.
 *
 * Signing uses WebCrypto (ES256), which Workers provide natively, so no Node
 * push library is needed.
 */

export type StaffAlertKind = "order" | "custom_cake" | "reminder" | "stock" | "test";

export interface StaffAlert {
  kind: StaffAlertKind;
  title: string;
  body: string;
  url?: string;
  /** Only this user's devices (the Test button). Otherwise every staff device. */
  forUser?: string;
}

export interface PushConfig {
  vapid_public_key: string;
  vapid_private_jwk: JsonWebKey;
  contact: string;
}

interface Subscription {
  id: string;
  endpoint: string;
  failures: number;
}

/** Overall cap, so a slow push service never holds up an order. */
const SEND_TIMEOUT_MS = 4000;

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));

/** A VAPID token for one push service (the `aud` is its origin). Exported for the test. */
export async function vapidToken(audience: string, config: PushConfig): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    config.vapid_private_jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const header = b64urlText(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64urlText(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: config.contact,
    })
  );
  const unsigned = `${header}.${claims}`;
  // WebCrypto returns the raw r||s form JWT's ES256 expects.
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${b64url(sig)}`;
}

/**
 * Records the alert (what /api/push/latest will show) and wakes every staff
 * device. Never throws: an alert that cannot be pushed must not fail the order
 * or request that caused it. Returns how many devices were reached.
 */
export async function notifyStaff(alert: StaffAlert): Promise<{ sent: number; failed: number }> {
  try {
    return await Promise.race([
      send(alert),
      new Promise<{ sent: number; failed: number }>((resolve) =>
        setTimeout(() => resolve({ sent: 0, failed: -1 }), SEND_TIMEOUT_MS)
      ),
    ]);
  } catch (e) {
    console.error("[push] notifyStaff failed:", e);
    return { sent: 0, failed: -1 };
  }
}

async function send(alert: StaffAlert): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient();

  await supabase.from("staff_alerts").insert({
    kind: alert.kind,
    title: alert.title,
    body: alert.body,
    url: alert.url ?? "/admin/orders",
    for_user: alert.forUser ?? null,
  });

  const { data: config } = await supabase
    .from("push_config")
    .select("vapid_public_key, vapid_private_jwk, contact")
    .eq("id", 1)
    .maybeSingle();
  if (!config) return { sent: 0, failed: 0 };

  // Devices of people who are still staff or admin: a demoted account's
  // phone stops getting order alerts without anyone having to remember it.
  const { data: team } = await supabase.from("profiles").select("id").in("role", ["staff", "admin"]);
  const teamIds = (team ?? []).map((p) => p.id as string);
  const recipients = alert.forUser ? teamIds.filter((id) => id === alert.forUser) : teamIds;
  if (recipients.length === 0) return { sent: 0, failed: 0 };
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, failures")
    .in("user_id", recipients);
  if (!subs?.length) return { sent: 0, failed: 0 };

  const tokens = new Map<string, Promise<string>>();
  const results = await Promise.all(
    (subs as unknown as Subscription[]).map(async (sub) => {
      try {
        const audience = new URL(sub.endpoint).origin;
        if (!tokens.has(audience)) tokens.set(audience, vapidToken(audience, config as PushConfig));
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            TTL: "300",
            Urgency: "high",
            Authorization: `vapid t=${await tokens.get(audience)}, k=${config.vapid_public_key}`,
            "Content-Length": "0",
          },
        });
        if (res.status === 404 || res.status === 410) {
          // The device unsubscribed or the browser data was cleared.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          return false;
        }
        if (!res.ok) {
          console.error("[push] push service refused:", res.status, await res.text());
          await supabase.from("push_subscriptions").update({ failures: sub.failures + 1 }).eq("id", sub.id);
          return false;
        }
        await supabase
          .from("push_subscriptions")
          .update({ last_sent_at: new Date().toISOString(), failures: 0 })
          .eq("id", sub.id);
        return true;
      } catch (e) {
        console.error("[push] send threw:", e);
        return false;
      }
    })
  );
  const sent = results.filter(Boolean).length;
  return { sent, failed: results.length - sent };
}
