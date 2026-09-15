-- A review's star rating becomes optional.
--
-- The first real reviews came from the client as screenshots of Google and
-- Swiggy. Most show the words and not the stars. With rating NOT NULL DEFAULT 5
-- every one of them would have been published under five filled stars that the
-- customer never gave, which is the invented-figure problem 00017 was written
-- to avoid. NULL now means "no star rating given", and the carousel and admin
-- list show no star row for it.
--
-- The CHECK (rating between 1 and 5) stays: a NULL passes a CHECK, so a rating
-- that IS given is still held to the range.

alter table public.reviews
  alter column rating drop not null,
  alter column rating drop default;
