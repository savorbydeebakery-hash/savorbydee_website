-- The custom cake enquiry no longer asks for an email address.
--
-- The client removed email from checkout and said not to keep it as an option
-- anywhere; the enquiry form was the one place it survived, and it was marked
-- required. The column was NOT NULL, so dropping the field from the form would
-- have meant writing empty strings into it for ever — a column that looks
-- populated and holds nothing.
--
-- Nullable rather than dropped: older enquiries carry real addresses, and the
-- admin page still shows them where they exist.

alter table public.custom_cake_inquiries
  alter column customer_email drop not null;

comment on column public.custom_cake_inquiries.customer_email is
  'No longer collected. Present on enquiries made before email was removed from the form.';
