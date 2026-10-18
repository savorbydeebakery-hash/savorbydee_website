/**
 * Alerts for staff that are not orders, delivered as Supabase Realtime
 * broadcasts rather than table changes.
 *
 * Why a broadcast: custom cake requests are admin-only (migration 00047), so
 * staff cannot read the table, and a realtime subscription on it would
 * deliver them nothing. A broadcast carries no row, only "something
 * happened", which is all staff need: their job is to tell the owner.
 *
 * The channel is public — anyone holding the site's public key could listen —
 * so the payload must never carry customer details. Today it is a timestamp.
 */
export const STAFF_ALERTS_CHANNEL = "staff-alerts";
export const CUSTOM_CAKE_EVENT = "custom-cake";

export interface CustomCakeAlertPayload {
  /** When the request was made (ISO). Nothing else, by design. */
  at: string;
}
