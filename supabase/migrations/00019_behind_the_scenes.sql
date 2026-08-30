-- ---------- BEHIND THE SCENES ----------
-- Three photographs of the work itself, managed in Admin -> Behind the Scenes.
--
-- Seeded with the three LABELS and no images. That is deliberate: Dee opens
-- the admin page and finds three named slots waiting for a photo, rather than
-- an empty list she has to work out the structure of. The homepage renders
-- only rows that actually have an image and hides the section entirely when
-- none do, so the slots are invisible to customers until she fills them.
--
-- No stock or stand-in imagery is seeded. A diorama illustration or a
-- finished-cake photo captioned "Prep work" would be telling customers
-- something untrue about how this bakery works.

create table if not exists public.behind_the_scenes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  caption text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bts_active
  on public.behind_the_scenes (is_active, sort_order)
  where is_active = true;

alter table public.behind_the_scenes enable row level security;

-- Same shape as gallery_photos and reviews: world-readable, staff-writable.
drop policy if exists "bts_select_public" on public.behind_the_scenes;
create policy "bts_select_public" on public.behind_the_scenes
  for select using (is_active = true);

drop policy if exists "bts_write_staff" on public.behind_the_scenes;
create policy "bts_write_staff" on public.behind_the_scenes
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists set_updated_at_bts on public.behind_the_scenes;
create trigger set_updated_at_bts
  before update on public.behind_the_scenes
  for each row execute function public.set_updated_at();

-- The three stages, in order. Guarded so re-running never duplicates them.
insert into public.behind_the_scenes (label, caption, sort_order)
select v.label, v.caption, v.sort_order
from (values
  ('Prep work',      'Weighing, mixing and getting everything ready before the oven goes on.', 1),
  ('Baking',         'Nothing goes in until the order is placed. This is where it happens.',   2),
  ('Taking pictures', 'Every bake photographed before it leaves, so you see the real thing.',  3)
) as v(label, caption, sort_order)
where not exists (
  select 1 from public.behind_the_scenes b where b.label = v.label
);
