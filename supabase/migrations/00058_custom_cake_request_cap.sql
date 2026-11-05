-- A ceiling on custom cake requests (client, 2026-11-05).
--
-- The form saves directly to the database, so anyone could send requests in a loop,
-- and each one sounds the staff alarm. The Worker's rate limits don't see these. This
-- allows far more than a busy day could produce across the whole site, and only stops
-- a flood; the form shows the customer the message below if it ever trips.

create or replace function public.limit_custom_cake_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.custom_cake_inquiries
    where created_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'Too many custom cake requests right now. Please try again shortly.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_custom_cake_requests on public.custom_cake_inquiries;
create trigger limit_custom_cake_requests
  before insert on public.custom_cake_inquiries
  for each row execute function public.limit_custom_cake_requests();
