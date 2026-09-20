-- Behind the Scenes takes a short clip, not only a photograph.
--
-- The client asked for this on 29 Aug ("they're more like short clips — can
-- they be worked in?") and it was never built, so the three slots have sat
-- empty ever since: the work she wants shown is a video of icing a bun, and
-- there was nowhere to put one.
--
-- image_url stays and becomes the POSTER for a slot that has a video. That is
-- deliberate rather than a second nullable column doing nothing: a poster is
-- what a visitor sees before the clip decodes, what a reduced-motion visitor
-- sees instead of it, and what everyone sees if the video fails to load. A
-- slot with a video but no poster would flash empty on every page load.

alter table public.behind_the_scenes
  add column if not exists video_url text;

comment on column public.behind_the_scenes.video_url is
  'Short muted clip, looped. NULL renders the photo alone.';

comment on column public.behind_the_scenes.image_url is
  'The photograph, and the poster frame when video_url is set.';
