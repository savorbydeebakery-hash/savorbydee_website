-- Custom cake requests become admin-only (client's decision, 2026-10-18).
--
-- Staff no longer read or edit them. When a customer sends one, the admin
-- Orders page rings and tells staff to let the owner know; that alert is a
-- Realtime broadcast carrying no customer details (lib/alarm/staff-alerts.ts),
-- so it does not need staff to be able to read this table.
--
-- Customers still submit through the public insert policy, which is
-- unchanged. Admins add requests that came in by phone through that same
-- policy, and edit them through the update policy below.

drop policy if exists "inquiries_select_staff" on public.custom_cake_inquiries;
drop policy if exists "inquiries_update_staff" on public.custom_cake_inquiries;

create policy "inquiries_select_admin" on public.custom_cake_inquiries
  for select using (public.is_admin());

create policy "inquiries_update_admin" on public.custom_cake_inquiries
  for update using (public.is_admin()) with check (public.is_admin());
