-- Only an admin may change where customers pay.
--
-- site_settings has one write policy, settings_write_staff, which lets any
-- staff account update every column. That includes upi_id — the account
-- customer payments are sent to — and the two switches deciding whether
-- payment goes through Razorpay at all. One staff login, careless or
-- compromised, could point the UPI ID at a different account, and every
-- customer who paid afterwards would be paying someone else. Verified before
-- this was written: a staff session updated site_settings successfully.
--
-- Row-level security cannot express "these columns, not those", so this is a
-- trigger. It compares old and new values rather than refusing any update that
-- mentions the columns, because the admin Settings page saves the whole row on
-- every Save — staff editing the opening hours send upi_id back unchanged, and
-- that has to keep working.
--
-- Hiding the Payment tab from staff in the UI is a courtesy; this is the lock.
--
-- Not blocked: the service role and direct database sessions, which carry no
-- signed-in user (auth.uid() is null). The order API, migrations and support
-- scripts all run that way and are not "a member of staff".

create or replace function public.guard_payment_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.upi_id is distinct from old.upi_id
     or new.razorpay_active is distinct from old.razorpay_active
     or new.kyc_pending_mode is distinct from old.kyc_pending_mode then
    raise exception 'Only an admin can change payment settings (UPI ID, Razorpay, payment mode).'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_payment_settings on public.site_settings;
create trigger guard_payment_settings
  before update on public.site_settings
  for each row execute function public.guard_payment_settings();

comment on function public.guard_payment_settings is
  'Refuses changes to upi_id, razorpay_active and kyc_pending_mode by any signed-in user who is not an admin.';
