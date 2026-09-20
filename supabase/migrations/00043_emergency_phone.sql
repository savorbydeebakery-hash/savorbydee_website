-- A second phone number, for emergencies only.
--
-- The client now runs two lines: 89740 77447 takes all enquiries, and
-- 98365 37447 is kept for emergencies. contact_phone already holds the first.
-- The second needs its own column rather than being appended to that string,
-- because contact_phone is rendered as a single number in the policy pages
-- and read by Razorpay's review — two numbers in one field reads as a typo.
--
-- Nullable: a bakery with one line is the normal case, and the contact page
-- simply omits the row when it is null rather than printing an empty label.

alter table public.site_settings
  add column if not exists emergency_phone text;

comment on column public.site_settings.emergency_phone is
  'Out-of-hours / urgent number, shown under the main phone. NULL hides the row.';
